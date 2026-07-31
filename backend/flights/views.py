from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import StreamingHttpResponse
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta
import json
import math
import random
import time
import logging

from .models import Flight, Airport
from .serializers import FlightSerializer, AirportSerializer, LiveFlightSerializer
from .flight_apis import OpenSkyAPI, AviationStackAPI, FlightRadarAPI
from .throttling import is_rate_limited, client_ip, cache_get, cache_set

logger = logging.getLogger(__name__)

RATE_LIMITED = Response(
    {'error': 'Too many requests. Please slow down and try again shortly.'},
    status=status.HTTP_429_TOO_MANY_REQUESTS,
)

def _check_rate_limit(request, key):
    if is_rate_limited(key, client_ip(request)):
        return RATE_LIMITED
    return None

def _parse_bounds(request):
    if all(k in request.GET for k in ('lamin', 'lomin', 'lamax', 'lomax')):
        return {
            'lamin': float(request.GET.get('lamin', -90)),
            'lomin': float(request.GET.get('lomin', -180)),
            'lamax': float(request.GET.get('lamax', 90)),
            'lomax': float(request.GET.get('lomax', 180)),
        }
    return None

def _airport_info(ap):
    if not ap:
        return None
    return {
        'icao': ap.icao,
        'iata': ap.iata,
        'name': ap.name,
        'city': ap.city,
        'country': ap.country,
        'latitude': ap.latitude,
        'longitude': ap.longitude,
    }

def _enrich_airports(flights):
    """Attach departure/arrival airport info (incl. coordinates) to each flight."""
    airports = {a.iata: a for a in Airport.objects.all() if a.iata}
    for f in flights:
        for code_key, info_key in (('departure_airport', 'departure_airport_info'),
                                   ('arrival_airport', 'arrival_airport_info')):
            code = f.get(code_key)
            f[info_key] = _airport_info(airports.get(code)) if code else None
    return flights

def _haversine_km(lat1, lng1, lat2, lng2):
    """Great-circle distance between two coordinates in kilometers."""
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    return 2 * r * math.asin(math.sqrt(a))

def _nearby_airport_codes(lat, lng, radius_km):
    """IATA codes of airports within radius_km of (lat, lng)."""
    codes = set()
    for ap in Airport.objects.exclude(latitude=None).exclude(longitude=None):
        if _haversine_km(lat, lng, ap.latitude, ap.longitude) <= radius_km:
            if ap.iata:
                codes.add(ap.iata)
    return codes

def _generate_region_flights(lat, lng, radius_km, count=20):
    """Fallback: FlightDetail-shaped flights touching airports near (lat, lng)."""
    all_airports = list(Airport.objects.exclude(latitude=None).exclude(longitude=None))
    nearby = [ap for ap in all_airports
              if _haversine_km(lat, lng, ap.latitude, ap.longitude) <= radius_km]
    if not nearby:
        return []
    airlines = ['Precision Air', 'Air Tanzania', 'ZanAir', 'Kenya Airways', 'Ethiopian Airlines',
                'RwandAir', 'Qatar Airways', 'Emirates', 'Turkish Airlines', 'South African Airways']
    statuses = ['scheduled', 'active', 'landed', 'delayed']
    flights = []
    now = datetime.now()
    for i in range(count):
        dep = random.choice(nearby)
        arr = random.choice(all_airports)
        while arr.iata == dep.iata:
            arr = random.choice(all_airports)
        dep_hour = random.randint(0, 23)
        dep_min = random.randint(0, 59)
        dep_time = now.replace(hour=dep_hour, minute=dep_min, second=0, microsecond=0)
        arr_time = dep_time + timedelta(hours=random.randint(1, 10), minutes=random.randint(0, 59))
        flights.append({
            'flight_number': f'{airlines[i % len(airlines)][:3].upper()}{random.randint(100, 999)}',
            'airline': airlines[i % len(airlines)],
            'departure_airport': dep.iata,
            'departure_airport_name': dep.name,
            'departure_city': dep.city,
            'departure_country': dep.country,
            'departure_time_scheduled': dep_time.isoformat(),
            'departure_time_actual': dep_time.isoformat(),
            'departure_gate': f'{random.choice("ABCDEFG")}{random.randint(1, 30)}',
            'departure_terminal': str(random.randint(1, 5)),
            'arrival_airport': arr.iata,
            'arrival_airport_name': arr.name,
            'arrival_city': arr.city,
            'arrival_country': arr.country,
            'arrival_time_scheduled': arr_time.isoformat(),
            'arrival_time_actual': None,
            'arrival_gate': None,
            'arrival_terminal': None,
            'status': random.choice(statuses),
            'latitude': None,
            'longitude': None,
            'altitude': None,
            'speed': None,
            'heading': None,
            'aircraft_type': random.choice(['AT76', 'B738', 'A320', 'B77W', 'A333', 'CRJ9', 'E190']),
            'flight_date': now.strftime('%Y-%m-%d'),
        })
    return flights

@api_view(['GET'])
def live_flights(request):
    """Get all live flights from OpenSky API with fallback (cached 10s, rate-limited)."""
    denied = _check_rate_limit(request, 'live-flights')
    if denied:
        return denied

    bounds = _parse_bounds(request)

    cache_key = f'live:{json.dumps(bounds, sort_keys=True)}'
    cached = cache_get(cache_key)
    if cached is not None:
        return Response(cached)

    flights = OpenSkyAPI.get_live_flights(bounds=bounds)

    # If too few flights in the area, expand the search area progressively
    if bounds and len(flights) < 5:
        expanded = bounds
        for _ in range(3):
            lat_mid = (expanded['lamin'] + expanded['lamax']) / 2
            lng_mid = (expanded['lomin'] + expanded['lomax']) / 2
            lat_span = expanded['lamax'] - expanded['lamin']
            lng_span = expanded['lomax'] - expanded['lomin']
            expanded = {
                'lamin': max(-90, lat_mid - lat_span),
                'lomin': max(-180, lng_mid - lng_span),
                'lamax': min(90, lat_mid + lat_span),
                'lomax': min(180, lng_mid + lng_span),
            }
            flights = OpenSkyAPI.get_live_flights(bounds=expanded)
            if len(flights) >= 5:
                break

    # Fallback to realistic sample data within the requested area
    if not flights or len(flights) < 5:
        flights = FlightRadarAPI.get_sample_live_flights(bounds=bounds)

    _enrich_airports(flights)
    serializer = LiveFlightSerializer(data=flights, many=True)
    serializer.is_valid(raise_exception=False)
    payload = serializer.validated_data if serializer.is_valid else flights
    cache_set(cache_key, payload, 10)
    return Response(payload)

@api_view(['GET'])
def search_flights(request):
    """Search flights by flight number, airline, airport, or date"""
    denied = _check_rate_limit(request, 'search')
    if denied:
        return denied

    flight_number = request.GET.get('flight_number', '')
    airline = request.GET.get('airline', '')
    departure = request.GET.get('departure', '')
    arrival = request.GET.get('arrival', '')
    date = request.GET.get('date', '')

    # Try OpenSky first: flights already visible live are NOT re-fetched from AviationStack
    results = []
    if flight_number:
        cache_key = f'search:{flight_number}:{date}'
        cached = cache_get(cache_key)
        if cached is not None:
            results = cached
        else:
            live = OpenSkyAPI.get_flight_by_callsign(flight_number)
            if live:
                live_result = dict(live)
                live_result['flight_number'] = live_result.get('callsign', '') or flight_number
                live_result['status'] = 'active'
                results = [live_result]
            else:
                results = AviationStackAPI.get_flights(flight_number=flight_number, date=date)
            cache_set(cache_key, results, 30)

    if not results:
        results = _generate_region_flights(-6.2222, 39.2249, 2000, count=10)

    # Also check our database
    db_flights = Flight.objects.all()
    if flight_number:
        db_flights = db_flights.filter(flight_number__icontains=flight_number)
    if airline:
        db_flights = db_flights.filter(airline__icontains=airline)
    if departure:
        db_flights = db_flights.filter(departure_airport__icontains=departure)
    if arrival:
        db_flights = db_flights.filter(arrival_airport__icontains=arrival)

    # Combine results, preferring API results
    api_callsigns = {f.get('callsign', '') for f in results if f.get('callsign')}
    for f in db_flights:
        if f.flight_number not in api_callsigns:
            results.append(FlightSerializer(f).data)

    return Response(results)

@api_view(['GET'])
def flight_detail(request, flight_number):
    """Get detailed information about a specific flight"""
    denied = _check_rate_limit(request, 'detail')
    if denied:
        return denied

    cache_key = f'detail:{flight_number}'
    cached = cache_get(cache_key)
    if cached is not None:
        return Response(cached)

    # Try OpenSky for live position
    live_data = OpenSkyAPI.get_flight_by_callsign(flight_number)

    # AviationStack is only queried for flights NOT visible on OpenSky
    # (saves free-tier quota; OpenSky provides live position, AviationStack provides schedules)
    if live_data:
        result = live_data
    else:
        detail_data = AviationStackAPI.get_flights(flight_number=flight_number)
        if detail_data:
            result = detail_data[0]
        else:
            result = FlightRadarAPI.get_sample_flight_detail(flight_number)

    # If live data has position info, merge it
    if live_data and result:
        result.update({
            'latitude': live_data.get('latitude'),
            'longitude': live_data.get('longitude'),
            'altitude': live_data.get('altitude'),
            'speed': live_data.get('velocity'),
            'heading': live_data.get('heading'),
            'icao24': live_data.get('icao24'),
            'is_stale': live_data.get('is_stale'),
        })
        result['status'] = 'active'
        result['flight_number'] = result.get('flight_number') or live_data.get('callsign', '')

    # Check database
    try:
        db_flight = Flight.objects.filter(flight_number__iexact=flight_number).first()
        if db_flight:
            db_data = FlightSerializer(db_flight).data
            result.update({k: v for k, v in db_data.items() if v is not None})
    except:
        pass

    _enrich_airports([result])

    if not result:
        return Response({'error': 'Flight not found'}, status=status.HTTP_404_NOT_FOUND)

    cache_set(cache_key, result, 30)
    return Response(result)

@api_view(['GET'])
def todays_flights(request):
    """Get today's flights near a location (default: Zanzibar region)."""
    denied = _check_rate_limit(request, 'today')
    if denied:
        return denied

    try:
        lat = float(request.GET.get('lat', -6.2222))
        lng = float(request.GET.get('lng', 39.2249))
        radius_km = float(request.GET.get('radius_km', 2000))
    except (TypeError, ValueError):
        lat, lng, radius_km = -6.2222, 39.2249, 2000

    cache_key = f'today:{lat}:{lng}:{radius_km}'
    cached = cache_get(cache_key)
    if cached is not None:
        return Response(cached)

    today = timezone.now().date()
    flights_qs = Flight.objects.filter(flight_date=today)

    nearby_codes = _nearby_airport_codes(lat, lng, radius_km)
    if nearby_codes:
        flights_qs = flights_qs.filter(
            Q(departure_airport__in=nearby_codes) | Q(arrival_airport__in=nearby_codes)
        )
    flights_qs = flights_qs[:50]

    if not flights_qs:
        api_flights = AviationStackAPI.get_flights()[:12]
        if api_flights:
            _enrich_airports(api_flights)
            cache_set(cache_key, api_flights, 30)
            return Response(api_flights)
        generated = _generate_region_flights(lat, lng, radius_km, count=20)
        _enrich_airports(generated)
        cache_set(cache_key, generated, 30)
        return Response(generated)

    flights = FlightSerializer(flights_qs, many=True).data
    if len(flights) < 12:
        generated = _generate_region_flights(lat, lng, radius_km, count=12 - len(flights))
        flights.extend(generated)
    _enrich_airports(flights)
    cache_set(cache_key, flights, 30)
    return Response(flights)

@api_view(['GET'])
def airport_list(request):
    """List all airports"""
    airports = Airport.objects.all()[:100]
    serializer = AirportSerializer(airports, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def flight_stats(request):
    """Get flight statistics for dashboard (cached 60s, rate-limited)."""
    denied = _check_rate_limit(request, 'stats')
    if denied:
        return denied

    cache_key = 'stats'
    cached = cache_get(cache_key)
    if cached is not None:
        return Response(cached)

    stats = {
        'total_flights_today': random.randint(5000, 8000),
        'flights_in_air': random.randint(3000, 5000),
        'flights_delayed': random.randint(200, 500),
        'flights_cancelled': random.randint(50, 100),
        'total_airports': 15000,
        'total_airlines': 500,
        'busiest_hour': f'{random.randint(6, 22)}:00',
        'average_delay_minutes': random.randint(10, 30),
    }
    cache_set(cache_key, stats, 60)
    return Response(stats)

@api_view(['GET'])
def flight_track(request, icao24):
    """Get the historical flight path (trail) for a given icao24."""
    denied = _check_rate_limit(request, 'track')
    if denied:
        return denied

    time_param = request.GET.get('time')
    if time_param:
        try:
            time_param = int(time_param)
        except ValueError:
            time_param = None

    cache_key = f'track:{icao24}:{time_param}'
    cached = cache_get(cache_key)
    if cached is not None:
        return Response(cached)

    track = OpenSkyAPI.get_flight_track(icao24, time=time_param)
    if not track:
        return Response({'error': 'No track data found'}, status=status.HTTP_404_NOT_FOUND)

    cache_set(cache_key, track, 300)
    return Response(track)

def _board_flights(request, direction):
    """Shared logic for airport arrivals/departures boards."""
    denied = _check_rate_limit(request, 'board')
    if denied:
        return denied

    airport = (request.GET.get('airport') or request.GET.get('iata') or '').upper().strip()
    date = request.GET.get('date', '')
    if not airport:
        return Response({'error': 'airport (IATA code) parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

    cache_key = f'board:{airport}:{direction}:{date}'
    cached = cache_get(cache_key)
    if cached is not None:
        return Response(cached)

    flights = AviationStackAPI.get_flights_by_airport(airport, direction=direction, date=date or None)
    _enrich_airports(flights)
    cache_set(cache_key, flights, 300)
    return Response(flights)

@api_view(['GET'])
def flight_arrivals(request):
    """Arrivals board for an airport: /api/flights/arrival/?airport=JNB"""
    return _board_flights(request, 'arrivals')

@api_view(['GET'])
def flight_departures(request):
    """Departures board for an airport: /api/flights/departure/?airport=JNB"""
    return _board_flights(request, 'departures')

@api_view(['GET'])
def live_stream(request):
    """Server-Sent Events stream of live flights (15s heartbeat, ~15 min max)."""
    denied = _check_rate_limit(request, 'stream')
    if denied:
        return denied

    bounds = _parse_bounds(request)

    def event_stream():
        try:
            for i in range(60):
                flights = OpenSkyAPI.get_live_flights(bounds=bounds)
                if not flights or len(flights) < 5:
                    flights = FlightRadarAPI.get_sample_live_flights(bounds=bounds)
                _enrich_airports(flights)
                serializer = LiveFlightSerializer(data=flights, many=True)
                serializer.is_valid(raise_exception=False)
                payload = serializer.validated_data if serializer.is_valid else flights
                yield f"event: flights\ndata: {json.dumps(payload)}\n\n"
                for _ in range(15):
                    time.sleep(1)
        except GeneratorExit:
            return
        except Exception as e:
            logger.error(f"SSE stream error: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response
