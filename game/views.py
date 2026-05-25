import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib import messages
from .models import Game, Category, Question
from .predefined_data import PREDEFINED_DATA

@login_required
def dashboard(request):
    user_games = Game.objects.filter(creator=request.user).order_by('-created_at')
    return render(request, 'game/dashboard.html', {
        'user_games': user_games,
        'predefined_categories': list(PREDEFINED_DATA.keys())
    })

@login_required
def quick_start(request):
    if request.method == 'POST':
        selected_cats = request.POST.getlist('categories')
        if len(selected_cats) == 5:
            game = Game.objects.create(title=f"Quick Game ({', '.join(selected_cats[:2])}...)", creator=request.user)
            for cat_name in selected_cats:
                category = Category.objects.create(game=game, name=cat_name)
                questions = PREDEFINED_DATA.get(cat_name, [])
                for q in questions:
                    Question.objects.create(
                        category=category,
                        point_value=q['point_value'],
                        text=q['text'],
                        answer=q['answer'],
                        hint=q['hint']
                    )
            messages.success(request, 'Quick Start Game Created!')
            return redirect('play_game', game_id=game.id)
    return redirect('home')

@login_required
def create_game(request):
    if request.method == 'POST':
        if request.content_type == 'application/json':
            try:
                data = json.loads(request.body)
                title = data.get('title')
                if not title:
                    return JsonResponse({'success': False, 'error': 'Title is required'})
                
                game = Game.objects.create(title=title, creator=request.user)
                for cat_data in data.get('categories', []):
                    category = Category.objects.create(game=game, name=cat_data['name'])
                    for q_data in cat_data.get('questions', []):
                        Question.objects.create(
                            category=category,
                            point_value=int(q_data['point_value']),
                            text=q_data['text'],
                            answer=q_data['answer'],
                            hint=q_data.get('hint', '')
                        )
                return JsonResponse({'success': True, 'redirect_url': '/'})
            except Exception as e:
                return JsonResponse({'success': False, 'error': str(e)})
        else:
            # Fallback for old form
            messages.error(request, 'Please use the interactive editor to create games.')
            return redirect('create_game')
            
    return render(request, 'game/create_game.html')

@login_required
def play_game(request, game_id):
    game = get_object_or_404(Game, id=game_id)
    return render(request, 'game/play_game.html', {'game': game})

@login_required
def game_api(request, game_id):
    game = get_object_or_404(Game, id=game_id)
    categories = []
    for cat in game.categories.all():
        questions = []
        for q in cat.questions.all().order_by('point_value'):
            questions.append({
                'id': q.id,
                'point_value': q.point_value,
                'text': q.text,
                'answer': q.answer,
                'hint': q.hint,
            })
        categories.append({
            'id': cat.id,
            'name': cat.name,
            'questions': questions
        })
        
    return JsonResponse({'title': game.title, 'categories': categories})

@login_required
def delete_game(request, game_id):
    game = get_object_or_404(Game, id=game_id, creator=request.user)
    if request.method == 'POST':
        game.delete()
        messages.success(request, 'Game deleted successfully.')
    return redirect('home')
