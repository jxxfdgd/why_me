from django.db import models
from django.contrib.auth.models import User

class Game(models.Model):
    title = models.CharField(max_length=200)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='games')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} (by {self.creator.username})"

class Category(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=100)
    
    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return f"{self.name} - {self.game.title}"

class Question(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='questions')
    point_value = models.IntegerField()
    text = models.TextField()
    answer = models.TextField()
    hint = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.point_value} - {self.category.name}"
