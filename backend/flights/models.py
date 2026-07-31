from django.db import models

class Flight(models.Model):
    flight_number = models.CharField(max_length=20, db_index=True)
    airline = models.CharField(max_length=100, blank=True, null=True)
    departure_airport = models.CharField(max_length=10, blank=True, null=True)
    departure_airport_name = models.CharField(max_length=200, blank=True, null=True)
    departure_city = models.CharField(max_length=100, blank=True, null=True)
    departure_country = models.CharField(max_length=100, blank=True, null=True)
    departure_time_scheduled = models.DateTimeField(blank=True, null=True)
    departure_time_actual = models.DateTimeField(blank=True, null=True)
    departure_gate = models.CharField(max_length=20, blank=True, null=True)
    departure_terminal = models.CharField(max_length=20, blank=True, null=True)
    arrival_airport = models.CharField(max_length=10, blank=True, null=True)
    arrival_airport_name = models.CharField(max_length=200, blank=True, null=True)
    arrival_city = models.CharField(max_length=100, blank=True, null=True)
    arrival_country = models.CharField(max_length=100, blank=True, null=True)
    arrival_time_scheduled = models.DateTimeField(blank=True, null=True)
    arrival_time_actual = models.DateTimeField(blank=True, null=True)
    arrival_gate = models.CharField(max_length=20, blank=True, null=True)
    arrival_terminal = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    altitude = models.FloatField(blank=True, null=True)
    speed = models.FloatField(blank=True, null=True)
    heading = models.FloatField(blank=True, null=True)
    aircraft_type = models.CharField(max_length=50, blank=True, null=True)
    flight_date = models.DateField(blank=True, null=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-last_updated']
    
    def __str__(self):
        return self.flight_number

class Airport(models.Model):
    icao = models.CharField(max_length=4, unique=True, blank=True, null=True)
    iata = models.CharField(max_length=3, unique=True, blank=True, null=True)
    name = models.CharField(max_length=200)
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    timezone = models.CharField(max_length=50, blank=True, null=True)
    
    def __str__(self):
        return f"{self.iata or self.icao} - {self.name}"
