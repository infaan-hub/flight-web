from rest_framework import serializers
from .models import Flight, Airport

class FlightSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flight
        fields = '__all__'

class AirportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Airport
        fields = '__all__'

class LiveFlightSerializer(serializers.Serializer):
    icao24 = serializers.CharField()
    callsign = serializers.CharField(allow_blank=True, allow_null=True)
    origin_country = serializers.CharField(allow_blank=True, allow_null=True)
    latitude = serializers.FloatField(allow_null=True)
    longitude = serializers.FloatField(allow_null=True)
    altitude = serializers.FloatField(allow_null=True)
    velocity = serializers.FloatField(allow_null=True)
    heading = serializers.FloatField(allow_null=True)
    vertical_rate = serializers.FloatField(allow_null=True)
    on_ground = serializers.BooleanField()
    last_contact = serializers.IntegerField(allow_null=True)
    is_stale = serializers.BooleanField(required=False, default=False)
    departure_airport = serializers.CharField(allow_blank=True, allow_null=True, required=False, default=None)
    arrival_airport = serializers.CharField(allow_blank=True, allow_null=True, required=False, default=None)
    departure_airport_info = serializers.DictField(allow_null=True, required=False, default=None)
    arrival_airport_info = serializers.DictField(allow_null=True, required=False, default=None)
