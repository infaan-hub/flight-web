from unittest.mock import patch

from django.test import TestCase, override_settings
from django.core.cache import cache
from django.utils import timezone

from .models import Flight, Airport
from . import throttling


def sample_live_flight(idx):
    return {
        'icao24': f'abc{idx:03d}',
        'callsign': f'TEST{idx:03d}',
        'origin_country': 'Tanzania',
        'latitude': -6.0 + idx,
        'longitude': 39.0 + idx,
        'altitude': 36000.0,
        'velocity': 450.0,
        'heading': 90,
        'vertical_rate': 0.0,
        'on_ground': False,
        'last_contact': int(timezone.now().timestamp()),
        'is_stale': False,
        'category': 0,
    }


class ApiTestBase(TestCase):
    def setUp(self):
        cache.clear()
        throttling._REQUESTS.clear()


class LiveFlightsTests(ApiTestBase):
    @patch('flights.views.OpenSkyAPI.get_live_flights',
           return_value=[sample_live_flight(i) for i in range(10)])
    def test_live_flights_returns_flights(self, _mock):
        response = self.client.get('/api/live-flights/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 10)
        self.assertEqual(response.data[0]['icao24'], 'abc000')
        self.assertIn('is_stale', response.data[0])

    @patch('flights.views.OpenSkyAPI.get_live_flights', return_value=[])
    def test_live_flights_rate_limited(self, _mock):
        for _ in range(15):
            self.client.get('/api/live-flights/')
        response = self.client.get('/api/live-flights/')
        self.assertEqual(response.status_code, 429)

    @patch('flights.views.OpenSkyAPI.get_live_flights', return_value=[])
    @patch('flights.views.FlightRadarAPI.get_sample_live_flights',
           return_value=[sample_live_flight(i) for i in range(6)])
    def test_live_flights_falls_back_to_sample_data(self, _sample, _opensky):
        response = self.client.get('/api/live-flights/')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 6)


class SearchAndDetailTests(ApiTestBase):
    @patch('flights.views.OpenSkyAPI.get_flight_by_callsign', return_value=None)
    @patch('flights.views.AviationStackAPI.get_flights', return_value=[{
        'flight_number': 'VJ82',
        'airline': 'VietJet Air',
        'departure_airport': 'MEL',
        'arrival_airport': 'SGN',
        'status': 'scheduled',
        'latitude': None,
        'longitude': None,
        'altitude': None,
        'speed': None,
        'heading': None,
    }])
    def test_search_uses_aviationstack_when_not_live(self, _mock_os, _mock_av):
        response = self.client.get('/api/search/', {'flight_number': 'VJ82'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]['flight_number'], 'VJ82')

    @patch('flights.views.OpenSkyAPI.get_flight_by_callsign',
           return_value=sample_live_flight(1))
    def test_search_uses_opensky_when_live(self, _mock):
        response = self.client.get('/api/search/', {'flight_number': 'TEST001'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]['status'], 'active')

    @patch('flights.views.OpenSkyAPI.get_flight_by_callsign', return_value=None)
    @patch('flights.views.AviationStackAPI.get_flights', return_value=[])
    def test_flight_detail_not_found(self, _av, _os):
        response = self.client.get('/api/flights/NOSUCHFLIGHT/')
        self.assertEqual(response.status_code, 200)

    @patch('flights.views.OpenSkyAPI.get_flight_by_callsign', return_value=None)
    @patch('flights.views.AviationStackAPI.get_flights', return_value=[])
    def test_flight_detail_rate_limited(self, _av, _os):
        for _ in range(30):
            self.client.get('/api/flights/FAKE123/')
        response = self.client.get('/api/flights/FAKE123/')
        self.assertEqual(response.status_code, 429)


class TodaysFlightsTests(ApiTestBase):
    def test_todays_flights_filters_by_region(self):
        Airport.objects.create(
            icao='HTZA', iata='DAR', name='Julius Nyerere', city='Dar es Salaam',
            country='Tanzania', latitude=-6.878, longitude=39.202,
        )
        Airport.objects.create(
            icao='HTKJ', iata='ZNZ', name='Abeid Amani Karume', city='Zanzibar',
            country='Tanzania', latitude=-6.222, longitude=39.225,
        )
        Airport.objects.create(
            icao='EGLL', iata='LHR', name='Heathrow', city='London',
            country='United Kingdom', latitude=51.47, longitude=-0.45,
        )
        today = timezone.now().date()
        Flight.objects.create(
            flight_number='PW715', airline='Precision Air', flight_date=today,
            departure_airport='DAR', arrival_airport='ZNZ',
        )
        Flight.objects.create(
            flight_number='BA117', airline='British Airways', flight_date=today,
            departure_airport='LHR', arrival_airport='CDG',
        )
        response = self.client.get('/api/flights/today/', {
            'lat': '-6.2222', 'lng': '39.2249', 'radius_km': '2000',
        })
        self.assertEqual(response.status_code, 200)
        numbers = [f['flight_number'] for f in response.data]
        self.assertIn('PW715', numbers)
        self.assertNotIn('BA117', numbers)
        self.assertIn('departure_airport_info', response.data[0])


class BoardTests(ApiTestBase):
    def test_board_requires_airport(self):
        response = self.client.get('/api/flights/arrival/')
        self.assertEqual(response.status_code, 400)

    @patch('flights.views.AviationStackAPI.get_flights_by_airport', return_value=[{
        'flight_number': 'VJ82', 'airline': 'VietJet Air',
        'departure_airport': 'MEL', 'arrival_airport': 'SGN',
        'status': 'scheduled', 'latitude': None, 'longitude': None,
        'altitude': None, 'speed': None, 'heading': None,
    }])
    def test_arrivals_board(self, _mock):
        response = self.client.get('/api/flights/arrival/', {'airport': 'SGN'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]['flight_number'], 'VJ82')

    @patch('flights.views.AviationStackAPI.get_flights_by_airport', return_value=[])
    def test_departures_board_empty(self, _mock):
        response = self.client.get('/api/flights/departure/', {'airport': 'JNB'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])


class TrackTests(ApiTestBase):
    @patch('flights.views.OpenSkyAPI.get_flight_track', return_value={
        'icao24': 'abc123', 'callsign': 'TEST123',
        'startTime': 100, 'endTime': 200,
        'path': [{'time': 100, 'latitude': -6.0, 'longitude': 39.0,
                  'altitude': 36000.0, 'track': 90, 'on_ground': False}],
    })
    def test_track_returns_path(self, _mock):
        response = self.client.get('/api/track/abc123/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['icao24'], 'abc123')
        self.assertEqual(len(response.data['path']), 1)

    @patch('flights.views.OpenSkyAPI.get_flight_track', return_value=None)
    def test_track_not_found(self, _mock):
        response = self.client.get('/api/track/nope/')
        self.assertEqual(response.status_code, 404)


class SecurityTests(ApiTestBase):
    @override_settings(CORS_ALLOW_ALL_ORIGINS=False)
    def test_cors_denied_for_unknown_origin(self):
        response = self.client.get('/api/airports/', HTTP_ORIGIN='http://evil.example.com')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('Access-Control-Allow-Origin', response)

    @override_settings(CORS_ALLOW_ALL_ORIGINS=False)
    def test_cors_allowed_for_known_origin(self):
        response = self.client.get('/api/airports/', HTTP_ORIGIN='http://localhost:5173')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get('Access-Control-Allow-Origin'),
            'http://localhost:5173',
        )
