from django.urls import path
from . import views

urlpatterns = [
    path('api/live-flights/', views.live_flights, name='live-flights'),
    path('api/live/stream/', views.live_stream, name='live-stream'),
    path('api/search/', views.search_flights, name='search-flights'),
    path('api/flights/today/', views.todays_flights, name='todays-flights'),
    path('api/flights/arrival/', views.flight_arrivals, name='flight-arrivals'),
    path('api/flights/departure/', views.flight_departures, name='flight-departures'),
    path('api/flights/<str:flight_number>/', views.flight_detail, name='flight-detail'),
    path('api/track/<str:icao24>/', views.flight_track, name='flight-track'),
    path('api/airports/', views.airport_list, name='airport-list'),
    path('api/stats/', views.flight_stats, name='flight-stats'),
]
