from django.contrib import admin
from django.urls import path, include
from accounts import views as account_views
from game import views as game_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')),
    path('register/', account_views.register, name='register'),
    path('', game_views.dashboard, name='home'),
    path('game/create/', game_views.create_game, name='create_game'),
    path('game/quick_start/', game_views.quick_start, name='quick_start'),
    path('game/<int:game_id>/play/', game_views.play_game, name='play_game'),
    path('game/<int:game_id>/delete/', game_views.delete_game, name='delete_game'),
    path('game/<int:game_id>/api/', game_views.game_api, name='game_api'),
]
