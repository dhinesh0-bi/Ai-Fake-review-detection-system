from django.urls import path
from . import views

urlpatterns = [
    path('analyze', views.analyze_review, name='analyze'),
    path('feedback', views.save_feedback, name='feedback'),
    # Add your new secret admin dashboard link:
    path('view-feedback', views.view_feedback, name='view_feedback'), 
]