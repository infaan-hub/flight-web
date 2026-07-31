from django.urls import path
from . import views

urlpatterns = [
    path('api/live-flights/', views.live_flights, name='live-flights'),
    path('api/search/', views.search_flights, name='search-flights'),
    path('api/flights/today/', views.todays_flights, name='todays-flights'),
    path('api/flights/<str:flight_number>/', views.flight_detail, name='flight-detail'),
    path('api/airports/', views.airport_list, name='airport-list'),
    path('api/stats/', views.flight_stats, name='flight-stats'),
    path('api/positions/', views.flight_positions, name='flight-positions'),
]
