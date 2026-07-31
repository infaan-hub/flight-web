from django.core.management.base import BaseCommand
from flights.models import Airport, Flight
from datetime import datetime, timedelta
import random

class Command(BaseCommand):
    help = 'Seed the database with sample airports and flights (idempotent)'
    
    def handle(self, *args, **options):
        # Idempotent: clear previous seed data first
        Flight.objects.all().delete()
        Airport.objects.all().delete()
        
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
            {'icao': 'RJAA', 'iata': 'NRT', 'name': 'Narita International', 'city': 'Tokyo', 'country': 'Japan', 'latitude': 35.7720, 'longitude': 140.3929},
            {'icao': 'EDDM', 'iata': 'MUC', 'name': 'Munich Airport', 'city': 'Munich', 'country': 'Germany', 'latitude': 48.3538, 'longitude': 11.7861},
            # ===== East & Southern Africa (regional) =====
            {'icao': 'HTZA', 'iata': 'ZNZ', 'name': 'Abeid Amani Karume International', 'city': 'Zanzibar', 'country': 'Tanzania', 'latitude': -6.2222, 'longitude': 39.2249},
            {'icao': 'HTDA', 'iata': 'DAR', 'name': 'Julius Nyerere International', 'city': 'Dar es Salaam', 'country': 'Tanzania', 'latitude': -6.8781, 'longitude': 39.2026},
            {'icao': 'HTKJ', 'iata': 'JRO', 'name': 'Kilimanjaro International', 'city': 'Kilimanjaro', 'country': 'Tanzania', 'latitude': -3.4294, 'longitude': 37.0745},
            {'icao': 'HTMW', 'iata': 'MWZ', 'name': 'Mwanza Airport', 'city': 'Mwanza', 'country': 'Tanzania', 'latitude': -2.4445, 'longitude': 32.9327},
            {'icao': 'HTTG', 'iata': 'TGT', 'name': 'Tanga Airport', 'city': 'Tanga', 'country': 'Tanzania', 'latitude': -5.0924, 'longitude': 39.0712},
            {'icao': 'HTTB', 'iata': 'TBO', 'name': 'Tabora Airport', 'city': 'Tabora', 'country': 'Tanzania', 'latitude': -5.0764, 'longitude': 32.8333},
            {'icao': 'HKJK', 'iata': 'NBO', 'name': 'Jomo Kenyatta International', 'city': 'Nairobi', 'country': 'Kenya', 'latitude': -1.3192, 'longitude': 36.9278},
            {'icao': 'HKMO', 'iata': 'MBA', 'name': 'Moi International', 'city': 'Mombasa', 'country': 'Kenya', 'latitude': -4.0348, 'longitude': 39.5942},
            {'icao': 'HUEN', 'iata': 'EBB', 'name': 'Entebbe International', 'city': 'Entebbe', 'country': 'Uganda', 'latitude': 0.0422, 'longitude': 32.4435},
            {'icao': 'HRYR', 'iata': 'KGL', 'name': 'Kigali International', 'city': 'Kigali', 'country': 'Rwanda', 'latitude': -1.9686, 'longitude': 30.1395},
            {'icao': 'HBBA', 'iata': 'BJM', 'name': 'Bujumbura International', 'city': 'Bujumbura', 'country': 'Burundi', 'latitude': -3.3241, 'longitude': 29.3185},
            {'icao': 'HAAB', 'iata': 'ADD', 'name': 'Addis Ababa Bole International', 'city': 'Addis Ababa', 'country': 'Ethiopia', 'latitude': 8.9779, 'longitude': 38.7993},
            {'icao': 'HCMM', 'iata': 'MGQ', 'name': 'Aden Adde International', 'city': 'Mogadishu', 'country': 'Somalia', 'latitude': 2.0144, 'longitude': 45.3047},
            {'icao': 'HDAM', 'iata': 'JIB', 'name': 'Djibouti–Ambouli International', 'city': 'Djibouti', 'country': 'Djibouti', 'latitude': 11.5473, 'longitude': 43.1595},
            {'icao': 'FQMA', 'iata': 'MPM', 'name': 'Maputo International', 'city': 'Maputo', 'country': 'Mozambique', 'latitude': -25.9208, 'longitude': 32.5726},
            {'icao': 'FWKI', 'iata': 'LLW', 'name': 'Kamuzu International', 'city': 'Lilongwe', 'country': 'Malawi', 'latitude': -13.7890, 'longitude': 33.7810},
            {'icao': 'FLKK', 'iata': 'LUN', 'name': 'Kenneth Kaunda International', 'city': 'Lusaka', 'country': 'Zambia', 'latitude': -15.3308, 'longitude': 28.4526},
            {'icao': 'FVHA', 'iata': 'HRE', 'name': 'Robert Gabriel Mugabe International', 'city': 'Harare', 'country': 'Zimbabwe', 'latitude': -17.9318, 'longitude': 31.0928},
            {'icao': 'FZAA', 'iata': 'FIH', 'name': "N'djili International", 'city': 'Kinshasa', 'country': 'DR Congo', 'latitude': -4.3857, 'longitude': 15.4446},
            {'icao': 'FMCH', 'iata': 'HAH', 'name': 'Prince Said Ibrahim International', 'city': 'Moroni', 'country': 'Comoros', 'latitude': -11.5337, 'longitude': 43.2719},
            {'icao': 'FIMP', 'iata': 'MRU', 'name': 'Sir Seewoosagur Ramgoolam International', 'city': 'Port Louis', 'country': 'Mauritius', 'latitude': -20.4302, 'longitude': 57.6836},
            {'icao': 'FSIA', 'iata': 'SEZ', 'name': 'Seychelles International', 'city': 'Victoria', 'country': 'Seychelles', 'latitude': -4.6743, 'longitude': 55.5218},
            {'icao': 'FAOR', 'iata': 'JNB', 'name': 'O.R. Tambo International', 'city': 'Johannesburg', 'country': 'South Africa', 'latitude': -26.1392, 'longitude': 28.2460},
            {'icao': 'FACT', 'iata': 'CPT', 'name': 'Cape Town International', 'city': 'Cape Town', 'country': 'South Africa', 'latitude': -33.9648, 'longitude': 18.6017},
            {'icao': 'FALE', 'iata': 'DUR', 'name': 'King Shaka International', 'city': 'Durban', 'country': 'South Africa', 'latitude': -29.6144, 'longitude': 31.1197},
        ]
        
        for ap in airports_data:
            Airport.objects.update_or_create(
                iata=ap['iata'],
                defaults=ap
            )
        self.stdout.write(self.style.SUCCESS(f'Created {len(airports_data)} airports'))
        
        airlines = ['United Airlines', 'American Airlines', 'Delta Air Lines', 'Emirates', 'British Airways', 'Lufthansa', 'Air France', 'Singapore Airlines', 'Qatar Airways', 'Turkish Airlines']
        statuses = ['scheduled', 'active', 'landed', 'delayed', 'cancelled']
        regional_codes = ['ZNZ', 'DAR', 'JRO', 'MWZ', 'TGT', 'TBO', 'NBO', 'MBA', 'EBB', 'KGL',
                          'BJM', 'ADD', 'MGQ', 'JIB', 'MPM', 'LLW', 'LUN', 'HRE', 'FIH', 'HAH',
                          'MRU', 'SEZ', 'JNB', 'CPT', 'DUR']
        regional = [ap for ap in airports_data if ap['iata'] in regional_codes]
        
        flights = []
        today = datetime.now().date()
        for i in range(50):
            # 80% of flights touch a regional (African) airport so local views have data
            if random.random() < 0.8:
                dep = random.choice(regional)
                arr = random.choice(regional + airports_data)
            else:
                dep = random.choice(airports_data)
                arr = random.choice(airports_data)
            while arr == dep:
                arr = random.choice(airports_data)
            
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
