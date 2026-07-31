import requests
import logging
from datetime import datetime, timedelta
from django.conf import settings

logger = logging.getLogger(__name__)

class OpenSkyAPI:
    """Integration with OpenSky Network API (free, no key needed for anonymous access)"""
    
    BASE_URL = 'https://opensky-network.org/api'
    
    @classmethod
    def get_live_flights(cls, bounds=None):
        """Get all live flights from OpenSky. bounds = {lamin, lomin, lamax, lomax}"""
        try:
            url = f'{cls.BASE_URL}/states/all'
            if bounds:
                params = {
                    'lamin': bounds.get('lamin', -90),
                    'lomin': bounds.get('lomin', -180),
                    'lamax': bounds.get('lamax', 90),
                    'lomax': bounds.get('lomax', 180),
                }
            else:
                params = {'lamin': -90, 'lomin': -180, 'lamax': 90, 'lomax': 180}
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                flights = []
                for state in data.get('states', [])[:100]:
                    flights.append({
                        'icao24': state[0],
                        'callsign': state[1].strip() if state[1] else '',
                        'origin_country': state[2],
                        'latitude': state[6],
                        'longitude': state[5],
                        'altitude': state[7],
                        'velocity': state[9],
                        'heading': state[10],
                        'vertical_rate': state[11],
                        'on_ground': state[8],
                        'last_contact': state[4],
                    })
                return flights
            return []
        except Exception as e:
            logger.error(f"OpenSky API error: {e}")
            return []
    
    @classmethod
    def get_flight_by_callsign(cls, callsign, bounds=None):
        """Get specific flight by callsign"""
        try:
            flights = cls.get_live_flights(bounds=bounds)
            for f in flights:
                if f['callsign'] and callsign.upper() in f['callsign'].upper():
                    return f
            return None
        except Exception as e:
            logger.error(f"OpenSky search error: {e}")
            return None

class AviationStackAPI:
    """Integration with AviationStack API (requires free API key)"""
    
    BASE_URL = 'https://api.aviationstack.com/v1'
    
    @classmethod
    def get_flights(cls, flight_number=None, date=None):
        """Search flights by number and/or date"""
        api_key = getattr(settings, 'AVIATIONSTACK_API_KEY', '')
        if not api_key or api_key == 'YOUR_AVIATIONSTACK_API_KEY':
            logger.warning("AviationStack API key not configured")
            return []
        
        try:
            params = {
                'access_key': api_key,
                'limit': 100,
            }
            if flight_number:
                params['flight_iata'] = flight_number
            if date:
                params['flight_date'] = date
            
            url = f'{cls.BASE_URL}/flights'
            response = requests.get(url, params=params, timeout=15)
            if response.status_code == 200:
                data = response.json()
                return cls._format_flights(data.get('data', []))
            return []
        except Exception as e:
            logger.error(f"AviationStack API error: {e}")
            return []
    
    @classmethod
    def _format_flights(cls, raw_flights):
        """Format AviationStack response to our standard format"""
        formatted = []
        for f in raw_flights:
            flight = {
                'flight_number': f.get('flight', {}).get('iata', ''),
                'airline': f.get('airline', {}).get('name', ''),
                'departure_airport': f.get('departure', {}).get('iata', ''),
                'departure_airport_name': f.get('departure', {}).get('airport', ''),
                'departure_city': None,
                'departure_country': None,
                'departure_time_scheduled': f.get('departure', {}).get('scheduled', ''),
                'departure_time_actual': f.get('departure', {}).get('actual', ''),
                'departure_gate': f.get('departure', {}).get('gate', ''),
                'departure_terminal': f.get('departure', {}).get('terminal', ''),
                'arrival_airport': f.get('arrival', {}).get('iata', ''),
                'arrival_airport_name': f.get('arrival', {}).get('airport', ''),
                'arrival_city': None,
                'arrival_country': None,
                'arrival_time_scheduled': f.get('arrival', {}).get('scheduled', ''),
                'arrival_time_actual': f.get('arrival', {}).get('actual', ''),
                'arrival_gate': f.get('arrival', {}).get('gate', ''),
                'arrival_terminal': f.get('arrival', {}).get('terminal', ''),
                'status': f.get('flight_status', ''),
                'latitude': None,
                'longitude': None,
                'altitude': None,
                'speed': None,
                'heading': None,
                'aircraft_type': f.get('aircraft', {}).get('iata', '') if f.get('aircraft') else '',
                'flight_date': f.get('flight_date', ''),
            }
            formatted.append(flight)
        return formatted

class FlightRadarAPI:
    """Mock/Fallback data when APIs are unavailable - provides realistic sample data"""
    
    @staticmethod
    def get_sample_live_flights(bounds=None):
        import random
        sample_airlines = ['United Airlines', 'American Airlines', 'Delta Air Lines', 'Emirates', 
                          'British Airways', 'Lufthansa', 'Air France', 'Singapore Airlines', 'Qatar Airways', 'Turkish Airlines']
        sample_origins = ['JFK', 'LAX', 'ORD', 'LHR', 'CDG', 'DXB', 'SIN', 'HND', 'FRA', 'AMS']
        sample_dests = ['SFO', 'MIA', 'SEA', 'BOS', 'NRT', 'IST', 'MUC', 'SYD', 'ICN', 'DEN']
        sample_callsigns = ['UAL123', 'AAL456', 'DAL789', 'UAE201', 'BAW304', 'DLH507', 'AFR608', 'SIA709', 'QTR810', 'THY911']
        
        if bounds:
            lat_min = float(bounds.get('lamin', -7))
            lat_max = float(bounds.get('lamax', -5))
            lng_min = float(bounds.get('lomin', 38))
            lng_max = float(bounds.get('lomax', 40))
        else:
            lat_min, lat_max, lng_min, lng_max = -7, -5, 38, 40
        
        flights = []
        for i, callsign in enumerate(sample_callsigns):
            origin = sample_origins[i % len(sample_origins)]
            dest = sample_dests[i % len(sample_dests)]
            flights.append({
                'icao24': f'a{random.randint(100000, 999999):x}',
                'callsign': callsign,
                'origin_country': sample_origins[i % len(sample_origins)],
                'latitude': random.uniform(lat_min, lat_max),
                'longitude': random.uniform(lng_min, lng_max),
                'altitude': random.randint(30000, 40000),
                'velocity': random.randint(400, 600),
                'heading': random.randint(0, 360),
                'vertical_rate': random.randint(-100, 100),
                'on_ground': False,
                'last_contact': int(datetime.now().timestamp()),
                'departure_airport': origin,
                'arrival_airport': dest,
            })
        return flights
    
    @staticmethod
    def get_sample_flight_detail(callsign):
        import random
        return {
            'flight_number': callsign,
            'airline': random.choice(['United Airlines', 'American Airlines', 'Delta Air Lines', 'Emirates']),
            'departure_airport': random.choice(['JFK', 'LAX', 'ORD', 'LHR']),
            'departure_airport_name': random.choice(['John F Kennedy International', 'Los Angeles International', "O'Hare International", 'Heathrow']),
            'departure_city': random.choice(['New York', 'Los Angeles', 'Chicago', 'London']),
            'departure_country': random.choice(['United States', 'United Kingdom']),
            'departure_time_scheduled': (datetime.now() - timedelta(hours=2)).isoformat(),
            'departure_time_actual': (datetime.now() - timedelta(hours=1, minutes=55)).isoformat(),
            'departure_gate': f'{random.choice("ABCDEFG")}{random.randint(1, 30)}',
            'departure_terminal': str(random.randint(1, 5)),
            'arrival_airport': random.choice(['SFO', 'MIA', 'SEA', 'BOS']),
            'arrival_airport_name': random.choice(['San Francisco International', 'Miami International', 'Seattle-Tacoma International', 'Logan International']),
            'arrival_city': random.choice(['San Francisco', 'Miami', 'Seattle', 'Boston']),
            'arrival_country': 'United States',
            'arrival_time_scheduled': (datetime.now() + timedelta(hours=3)).isoformat(),
            'arrival_time_actual': None,
            'arrival_gate': None,
            'arrival_terminal': None,
            'status': random.choice(['scheduled', 'active', 'landed', 'delayed']),
            'latitude': random.uniform(25, 50),
            'longitude': random.uniform(-130, -70),
            'altitude': random.randint(30000, 40000),
            'speed': random.randint(400, 600),
            'heading': random.randint(0, 360),
            'aircraft_type': random.choice(['B738', 'A320', 'B77W', 'A388', 'B789']),
            'flight_date': datetime.now().strftime('%Y-%m-%d'),
        }
