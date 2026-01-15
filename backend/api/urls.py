from django.urls import path
from . import views

urlpatterns = [
    path('updates/', views.get_updates, name='get_updates'),
    path('states/', views.get_states, name='get_states'),
    path('districts/<str:state>/', views.get_districts, name='get_districts'),
    path('update-types/', views.get_update_types, name='get_update_types'),
    path('analyze/', views.analyze_anomalies, name='analyze_anomalies'),
]
