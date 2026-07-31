import requests
import logging
import time
from datetime import datetime, timedelta
from django.conf import settings
from .throttling import cache_get, cache_set

logger = logging.getLogger(__name__)

# Unit conversions: OpenSky returns altitude in meters, velocity in m/s,
# vertical rate in m/s. The app displays ft / kts / ft-min.
M_TO_FT = 3.28084
MPS_TO_KTS = 1.943844
MPS_TO_FTMIN = 196.8504

class OpenSkyTokenManager:
    """OAuth2 client-credentials token manager with automatic refresh (30-min expiry)."""

    TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'
    TOKEN_REFRESH_MARGIN = 30

    def __init__(self):
        self.token = None
        self.expires_at = None

    def is_configured(self):
        return bool(getattr(settings, 'OPENSKY_CLIENT_ID', '') and getattr(settings, 'OPENSKY_CLIENT_SECRET', ''))

    def get_token(self):
        """Return a valid access token, refreshing automatically if needed."""
        if self.token and self.expires_at and datetime.now() < self.expires_at:
            return self.token
        return self._refresh()

    def _refresh(self):
        """Fetch a new access token. Returns None on failure (callers fall back to anonymous)."""
        try:
            response = requests.post(
                self.TOKEN_URL,
                data={
                    'grant_type': 'client_credentials',
                    'client_id': settings.OPENSKY_CLIENT_ID,
                    'client_secret': settings.OPENSKY_CLIENT_SECRET,
                },
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
            self.token = data['access_token']
            expires_in = data.get('expires_in', 1800)
            self.expires_at = datetime.now() + timedelta(seconds=expires_in - self.TOKEN_REFRESH_MARGIN)
            return self.token
        except requests.HTTPError:
            logger.error(
                "OpenSky token refresh failed: HTTP %s body=%r",
                response.status_code,
                response.text[:300],
            )
        except Exception as e:
            logger.error(f"OpenSky token refresh failed: {e}")
        self.token = None
        self.expires_at = None
        return None

    def headers(self):
        """Request headers with a valid Bearer token, or {} when unauthenticated."""
        if not self.is_configured():
            return {}
        token = self.get_token()
        return {'Authorization': f'Bearer {token}'} if token else {}


open_sky_tokens = OpenSkyTokenManager()

class OpenSkyAPI:
    """Integration with OpenSky Network API (OAuth2 bearer auth, anonymous fallback)"""
    
    BASE_URL = 'https://opensky-network.org/api'
    
    @classmethod
    def _fetch_states(cls, params):
        """GET /states/all with bearer auth; retries once after a forced token refresh on 401."""
        url = f'{cls.BASE_URL}/states/all'
        headers = open_sky_tokens.headers()
        response = requests.get(url, params=params, headers=headers, timeout=10)
        if response.status_code == 401:
            # Token expired / invalid: force refresh and retry once
            open_sky_tokens.token = None
            open_sky_tokens.expires_at = None
            headers = open_sky_tokens.headers()
            if headers:
                response = requests.get(url, params=params, headers=headers, timeout=10)
        return response
    
    @classmethod
    def get_live_flights(cls, bounds=None):
        """Get all live flights from OpenSky. bounds = {lamin, lomin, lamax, lomax}"""
        try:
            params = {
                'lamin': bounds.get('lamin', -90) if bounds else -90,
                'lomin': bounds.get('lomin', -180) if bounds else -180,
                'lamax': bounds.get('lamax', 90) if bounds else 90,
                'lomax': bounds.get('lomax', 180) if bounds else 180,
            }
            response = cls._fetch_states(params)
            if response.status_code == 429:
                logger.warning("OpenSky rate limit exceeded, retry after %s",
                               response.headers.get('X-Rate-Limit-Retry-After-Seconds', '?'))
                return []
            if response.status_code == 200:
                data = response.json()
                flights = []
                now = int(time.time())
                for state in (data.get('states') or [])[:100]:
                    if not state:
                        continue
                    last_contact = state[4]
                    flights.append({
                        'icao24': state[0],
                        'callsign': state[1].strip() if state[1] else '',
                        'origin_country': state[2],
                        'latitude': state[6],
                        'longitude': state[5],
                        'altitude': state[7] * M_TO_FT if state[7] is not None else None,
                        'velocity': state[9] * MPS_TO_KTS if state[9] is not None else None,
                        'heading': state[10],
                        'vertical_rate': state[11] * MPS_TO_FTMIN if state[11] is not None else None,
                        'on_ground': state[8],
                        'last_contact': last_contact,
                        'is_stale': bool(last_contact) and (now - last_contact) > 60,
                        'category': state[17] if len(state) > 17 else None,
                    })
                return flights
            logger.warning("OpenSky states request failed: HTTP %s", response.status_code)
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

    @classmethod
    def get_flight_track(cls, icao24, time=None):
        """Get the historical path of a flight from the OpenSky tracks API.

        Returns {icao24, callsign, startTime, endTime, path} where each path
        entry is [timestamp, lat, lon, altitude_ft, track_deg, on_ground].
        """
        if not icao24:
            return None
        try:
            params = {'time': time} if time else None
            url = f'{cls.BASE_URL}/tracks/{icao24}'
            response = requests.get(url, params=params, headers=open_sky_tokens.headers(), timeout=15)
            if response.status_code == 401:
                open_sky_tokens.token = None
                open_sky_tokens.expires_at = None
                headers = open_sky_tokens.headers()
                if headers:
                    response = requests.get(url, params=params, headers=headers, timeout=15)
            if response.status_code != 200:
                logger.warning("OpenSky track request failed: HTTP %s", response.status_code)
                return None
            data = response.json()
            path = []
            for entry in (data.get('path') or []):
                if not entry:
                    continue
                path.append({
                    'time': entry[0],
                    'latitude': entry[1],
                    'longitude': entry[2],
                    'altitude': entry[3] * M_TO_FT if entry[3] is not None else None,
                    'track': entry[4] if len(entry) > 4 else None,
                    'on_ground': entry[5] if len(entry) > 5 else None,
                })
            return {
                'icao24': data.get('icao24', icao24),
                'callsign': data.get('callsign', ''),
                'startTime': data.get('startTime'),
                'endTime': data.get('endTime'),
                'path': path,
            }
        except Exception as e:
            logger.error(f"OpenSky track error: {e}")
            return None

class AviationStackAPI:
    """Integration with AviationStack API (requires free API key).

    Responses are cached (default 10 min) to protect the small free-tier
    quota (500 requests/month).
    """

    BASE_URL = 'https://api.aviationstack.com/v1'
    CACHE_TTL = 600

    @classmethod
    def _fetch(cls, params, cache_key):
        hit = cache_get(cache_key)
        if hit is not None:
            return hit
        result = cls._request(params)
        if result:
            cache_set(cache_key, result, cls.CACHE_TTL)
        return result

    @classmethod
    def _request(cls, params):
        api_key = getattr(settings, 'AVIATIONSTACK_API_KEY', '')
        if not api_key or api_key == 'YOUR_AVIATIONSTACK_API_KEY':
            logger.warning("AviationStack API key not configured")
            return []
        try:
            response = requests.get(
                f'{cls.BASE_URL}/flights',
                params={**params, 'access_key': api_key, 'limit': params.get('limit', 100)},
                timeout=15,
            )
            if response.status_code == 200:
                return cls._format_flights(response.json().get('data', []))
            logger.warning("AviationStack request failed: HTTP %s", response.status_code)
            return []
        except Exception as e:
            logger.error(f"AviationStack API error: {e}")
            return []

    @classmethod
    def get_flights(cls, flight_number=None, date=None):
        """Search flights by number and/or date (cached 10 min)."""
        params = {}
        if flight_number:
            params['flight_iata'] = flight_number
        if date:
            params['flight_date'] = date
        key = f'avstack:flights:{flight_number or ''}:{date or ''}'
        return cls._fetch(params, key)

    @classmethod
    def get_flights_by_airport(cls, airport_iata, direction='departures', date=None):
        """Arrivals/departures board for an airport (cached 10 min)."""
        params = {'dep_iata': airport_iata} if direction == 'departures' else {'arr_iata': airport_iata}
        if date:
            params['flight_date'] = date
        key = f'avstack:board:{airport_iata}:{direction}:{date or ''}'
        return cls._fetch(params, key)
    
    @classmethod
    def _format_flights(cls, raw_flights):
        """Format AviationStack response to our standard format"""
        formatted = []
        for f in raw_flights:
            dep = f.get('departure', {}) or {}
            arr = f.get('arrival', {}) or {}
            live = f.get('live') or {}
            aircraft = f.get('aircraft') or {}
            flight = {
                'flight_number': f.get('flight', {}).get('iata', ''),
                'flight_icao': f.get('flight', {}).get('icao', ''),
                'airline': f.get('airline', {}).get('name', ''),
                'airline_iata': f.get('airline', {}).get('iata', ''),
                'airline_icao': f.get('airline', {}).get('icao', ''),
                'departure_airport': dep.get('iata', ''),
                'departure_airport_icao': dep.get('icao', ''),
                'departure_airport_name': dep.get('airport', ''),
                'departure_city': None,
                'departure_country': None,
                'departure_time_scheduled': dep.get('scheduled', ''),
                'departure_time_estimated': dep.get('estimated', ''),
                'departure_time_actual': dep.get('actual', ''),
                'departure_delay': dep.get('delay'),
                'departure_gate': dep.get('gate', ''),
                'departure_terminal': dep.get('terminal', ''),
                'arrival_airport': arr.get('iata', ''),
                'arrival_airport_icao': arr.get('icao', ''),
                'arrival_airport_name': arr.get('airport', ''),
                'arrival_city': None,
                'arrival_country': None,
                'arrival_time_scheduled': arr.get('scheduled', ''),
                'arrival_time_estimated': arr.get('estimated', ''),
                'arrival_time_actual': arr.get('actual', ''),
                'arrival_baggage': arr.get('baggage'),
                'arrival_delay': arr.get('delay'),
                'arrival_gate': arr.get('gate', ''),
                'arrival_terminal': arr.get('terminal', ''),
                'status': f.get('flight_status', ''),
                'latitude': live.get('latitude'),
                'longitude': live.get('longitude'),
                'altitude': live.get('altitude') * M_TO_FT if live.get('altitude') is not None else None,
                'speed': live.get('speed_horizontal') * MPS_TO_KTS if live.get('speed_horizontal') is not None else None,
                'vertical_speed': live.get('speed_vertical') * MPS_TO_FTMIN if live.get('speed_vertical') is not None else None,
                'heading': live.get('direction'),
                'on_ground': live.get('is_ground'),
                'aircraft_type': aircraft.get('iata', '') or '',
                'aircraft_registration': aircraft.get('registration', ''),
                'aircraft_icao24': aircraft.get('icao24', ''),
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
