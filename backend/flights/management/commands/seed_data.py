from django.core.management.base import BaseCommand
from flights.models import Airport, Flight
from datetime import datetime, timedelta
import random

class Command(BaseCommand):
    help = 'Seed the database with sample airports and flights'
    
    def handle(self, *args, **options):
        airports_data = [
            {'icao': 'KJFK', 'iata': 'JFK', 'name': 'John F Kennedy International', 'city': 'New York', 'country': 'United States', 'latitude': 40.6413, 'longitude': -73.7781},
            {'icao': 'KLAX', 'iata': 'LAX', 'name': 'Los Angeles International', 'city': 'Los Angeles', 'country': 'United States', 'latitude': 33.9416, 'longitude': -118.4085},
            {'icao': 'KORD', 'iata': 'ORD', 'name': "O'Hare International", 'city': 'Chicago', 'country': 'United States', 'latitude': 41.9742, 'longitude': -87.9073},
            {'icao': 'KSFO', 'iata': 'SFO', 'name': 'San Francisco International', 'city': 'San Francisco', 'country': 'United States', 'latitude': 37.6213, 'longitude': -122.3790},
            {'icao': 'KMIA', 'iata': 'MIA', 'name': 'Miami International', 'city': 'Miami', 'country': 'United States', 'latitude': 25.7962, 'longitude': -80.2780},
            {'icao': 'KSEA', 'iata': 'SEA', 'name': 'Seattle-Tacoma International', 'city': 'Seattle', 'country': 'United States', 'latitude': 47.4489, 'longitude': -122.3093},
            {'icao': 'KBOS', 'iata': 'BOS', 'name': 'Logan International', 'city': 'Boston', 'country': 'United States', 'latitude': 42.3656, 'longitude': -71.0096},
            {'icao': 'KDEN', 'iata': 'DEN', 'name': 'Denver International', 'city': 'Denver', 'country': 'United States', 'latitude': 39.8561, 'longitude': -104.6737},
            {'icao': 'KDFW', 'iata': 'DFW', 'name': 'Dallas/Fort Worth International', 'city': 'Dallas', 'country': 'United States', 'latitude': 32.8998, 'longitude': -97.0403},
            {'icao': 'EGLL', 'iata': 'LHR', 'name': 'London Heathrow', 'city': 'London', 'country': 'United Kingdom', 'latitude': 51.4700, 'longitude': -0.4543},
            {'icao': 'LFPG', 'iata': 'CDG', 'name': 'Charles de Gaulle', 'city': 'Paris', 'country': 'France', 'latitude': 49.0097, 'longitude': 2.5479},
            {'icao': 'EDDF', 'iata': 'FRA', 'name': 'Frankfurt Airport', 'city': 'Frankfurt', 'country': 'Germany', 'latitude': 50.0333, 'longitude': 8.5706},
            {'icao': 'EHAM', 'iata': 'AMS', 'name': 'Amsterdam Schiphol', 'city': 'Amsterdam', 'country': 'Netherlands', 'latitude': 52.3086, 'longitude': 4.7639},
            {'icao': 'OMDB', 'iata': 'DXB', 'name': 'Dubai International', 'city': 'Dubai', 'country': 'United Arab Emirates', 'latitude': 25.2532, 'longitude': 55.3657},
            {'icao': 'WSSS', 'iata': 'SIN', 'name': 'Singapore Changi', 'city': 'Singapore', 'country': 'Singapore', 'latitude': 1.3644, 'longitude': 103.9915},
            {'icao': 'RJTT', 'iata': 'HND', 'name': 'Tokyo Haneda', 'city': 'Tokyo', 'country': 'Japan', 'latitude': 35.5494, 'longitude': 139.7798},
            {'icao': 'RKSI', 'iata': 'ICN', 'name': 'Incheon International', 'city': 'Seoul', 'country': 'South Korea', 'latitude': 37.4602, 'longitude': 126.4407},
            {'icao': 'VHHH', 'iata': 'HKG', 'name': 'Hong Kong International', 'city': 'Hong Kong', 'country': 'Hong Kong', 'latitude': 22.3080, 'longitude': 113.9185},
            {'icao': 'YSSY', 'iata': 'SYD', 'name': 'Sydney Kingsford Smith', 'city': 'Sydney', 'country': 'Australia', 'latitude': -33.9399, 'longitude': 151.1753},
            {'icao': 'LTBA', 'iata': 'IST', 'name': 'Istanbul Airport', 'city': 'Istanbul', 'country': 'Turkey', 'latitude': 41.2753, 'longitude': 28.7519},
        ]
        
        for ap in airports_data:
            Airport.objects.update_or_create(
                iata=ap['iata'],
                defaults=ap
            )
        self.stdout.write(self.style.SUCCESS(f'Created {len(airports_data)} airports'))
        
        airlines = ['United Airlines', 'American Airlines', 'Delta Air Lines', 'Emirates', 'British Airways', 'Lufthansa', 'Air France', 'Singapore Airlines', 'Qatar Airways', 'Turkish Airlines']
        statuses = ['scheduled', 'active', 'landed', 'delayed', 'cancelled']
        
        flights = []
        today = datetime.now().date()
        for i in range(50):
            dep = airports_data[random.randint(0, len(airports_data)-1)]
            arr = airports_data[random.randint(0, len(airports_data)-1)]
            while arr == dep:
                arr = airports_data[random.randint(0, len(airports_data)-1)]
            
            airline = airlines[i % len(airlines)]
            code = airline[:3].upper()
            dep_hour = random.randint(0, 23)
            dep_min = random.randint(0, 59)
            
            dep_time = datetime(today.year, today.month, today.day, dep_hour, dep_min)
            arr_time = dep_time + timedelta(hours=random.randint(2, 12), minutes=random.randint(0, 59))
            
            flights.append(Flight(
                flight_number=f'{code}{random.randint(100, 999)}',
                airline=airline,
                departure_airport=dep['iata'],
                departure_airport_name=dep['name'],
                departure_city=dep['city'],
                departure_country=dep['country'],
                departure_time_scheduled=dep_time,
                departure_terminal=str(random.randint(1, 5)),
                departure_gate=f'{random.choice("ABCDEFG")}{random.randint(1, 30)}',
                arrival_airport=arr['iata'],
                arrival_airport_name=arr['name'],
                arrival_city=arr['city'],
                arrival_country=arr['country'],
                arrival_time_scheduled=arr_time,
                status=random.choice(statuses),
                aircraft_type=random.choice(['B738', 'A320', 'B77W', 'A388', 'B789', 'A321', 'B737']),
                flight_date=today,
            ))
        
        Flight.objects.bulk_create(flights)
        self.stdout.write(self.style.SUCCESS(f'Created {len(flights)} flights'))
