import json
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from game.models import Game, Category, Question
import os

class Command(BaseCommand):
    help = 'Seeds the database with questions from a JSON file'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='Path to the JSON file')
        parser.add_argument('--username', type=str, help='Username to assign the game to', default='admin')
        parser.add_argument('--title', type=str, help='Title of the game', default='Template Game')

    def handle(self, *args, **kwargs):
        json_file_path = kwargs['json_file']
        username = kwargs['username']
        title = kwargs['title']

        if not os.path.exists(json_file_path):
            self.stdout.write(self.style.ERROR(f'File {json_file_path} does not exist.'))
            return

        user, created = User.objects.get_or_create(username=username)
        if created:
            user.set_password('password123')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created user {username} with password "password123"'))

        with open(json_file_path, 'r') as f:
            data = json.load(f)

        game = Game.objects.create(title=title, creator=user)
        
        for cat_data in data.get('categories', []):
            category = Category.objects.create(game=game, name=cat_data['name'])
            for q_data in cat_data.get('questions', []):
                Question.objects.create(
                    category=category,
                    point_value=q_data['point_value'],
                    text=q_data['text'],
                    answer=q_data['answer'],
                    hint=q_data.get('hint', '')
                )
                
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded game "{title}" for user "{username}"'))
