from django.contrib import admin
from .models import Flight, Airport

@admin.register(Flight)
class FlightAdmin(admin.ModelAdmin):
    list_display = ['flight_number', 'airline', 'departure_airport', 'arrival_airport', 'status', 'flight_date']
    search_fields = ['flight_number', 'airline', 'departure_airport', 'arrival_airport']
    list_filter = ['status', 'airline']

@admin.register(Airport)
class AirportAdmin(admin.ModelAdmin):
    list_display = ['iata', 'icao', 'name', 'city', 'country']
    search_fields = ['iata', 'icao', 'name', 'city']
