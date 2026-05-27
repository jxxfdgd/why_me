class TriviaGame {
    constructor(gameId) {
        this.gameId = gameId;
        this.data = null;
        this.scores = { 1: 0, 2: 0 };
        this.currentQuestion = null;
        this.currentTile = null;
        this.timer = null;
        this.timeLeft = 0;
        this.isHintUsed = false;
        
        this.abilities = {
            1: { multiplier: 1, freeHint: 1 },
            2: { multiplier: 1, freeHint: 1 }
        };
        this.activeMultiplier = 1;
        
        this.init();
    }

    async init() {
        try {
            const res = await fetch(`/game/${this.gameId}/api/`);
            this.data = await res.json();
            this.renderBoard();
            this.bindEvents();
        } catch (e) {
            console.error('Failed to load game data', e);
            document.getElementById('loading').innerText = 'Failed to load game.';
        }
    }

    renderBoard() {
        document.getElementById('loading').style.display = 'none';
        const grid = document.getElementById('jeopardy-grid');
        grid.style.display = 'grid';
        
        const numCats = this.data.categories.length;
        grid.style.gridTemplateColumns = `repeat(${numCats}, 1fr)`;
        
        // Add headers
        this.data.categories.forEach(cat => {
            const header = document.createElement('div');
            header.className = 'category-header';
            header.innerText = cat.name;
            grid.appendChild(header);
        });
        
        // Add questions row by row. Assuming 5 questions per category.
        const maxQuestions = Math.max(...this.data.categories.map(c => c.questions.length));
        
        for (let i = 0; i < maxQuestions; i++) {
            this.data.categories.forEach(cat => {
                const q = cat.questions[i];
                if (q) {
                    const tile = document.createElement('div');
                    tile.className = 'question-tile';
                    tile.innerText = q.point_value;
                    
                    if (q.hint && q.hint.trim() !== '') {
                        const hintIndicator = document.createElement('div');
                        hintIndicator.className = 'hint-indicator';
                        hintIndicator.innerText = 'Hint';
                        tile.appendChild(hintIndicator);
                    }
                    
                    tile.onclick = () => this.openQuestion(q, tile);
                    grid.appendChild(tile);
                } else {
                    const empty = document.createElement('div');
                    empty.className = 'question-tile played';
                    empty.innerText = '';
                    grid.appendChild(empty);
                }
            });
        }
    }

    checkVictory() {
        const remaining = document.querySelectorAll('.question-tile:not(.played)');
        if (remaining.length === 0) {
            // Game Over
            let winner = "It's a Tie!";
            if (this.scores[1] > this.scores[2]) winner = document.getElementById('team1-name').innerText + " Wins!";
            if (this.scores[2] > this.scores[1]) winner = document.getElementById('team2-name').innerText + " Wins!";
            
            setTimeout(() => {
                const overlay = document.createElement('div');
                overlay.className = 'modal-overlay active';
                overlay.innerHTML = `
                    <div class="modal-content" style="border-color: var(--accent-pink); box-shadow: 0 0 50px rgba(212, 222, 149, 0.5);">
                        <h1 style="font-size: 4rem; color: var(--accent-pink);">GAME OVER</h1>
                        <h2 style="font-size: 3rem;">${winner}</h2>
                        <p style="font-size: 1.5rem; color: var(--text-secondary);">
                            Team 1: ${this.scores[1]} | Team 2: ${this.scores[2]}
                        </p>
                        <button class="btn btn-primary" onclick="window.location.href='/'">Back to Dashboard</button>
                    </div>
                `;
                document.body.appendChild(overlay);
                
                if (typeof confetti !== 'undefined') {
                    const duration = 5 * 1000;
                    const animationEnd = Date.now() + duration;
                    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

                    const interval = setInterval(function() {
                        const timeLeft = animationEnd - Date.now();
                        if (timeLeft <= 0) {
                            return clearInterval(interval);
                        }
                        const particleCount = 50 * (timeLeft / duration);
                        confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } }));
                    }, 250);
                }
            }, 1000);
        }
    }

    bindEvents() {
        document.getElementById('btn-show-hint').onclick = () => this.showHint();
        document.getElementById('btn-award-t1').onclick = () => this.awardPoints(1);
        document.getElementById('btn-award-t2').onclick = () => this.awardPoints(2);
        document.getElementById('btn-no-winner').onclick = () => this.closeQuestion();
        document.getElementById('btn-show-answer').onclick = () => {
            document.getElementById('modal-answer-box').style.display = 'block';
        };
        
        // Abilities
        document.getElementById('btn-ability-t1-2x').onclick = () => this.useMultiplier(1);
        document.getElementById('btn-ability-t2-2x').onclick = () => this.useMultiplier(2);
        document.getElementById('btn-ability-t1-hint').onclick = () => this.useFreeHint(1);
        document.getElementById('btn-ability-t2-hint').onclick = () => this.useFreeHint(2);
    }

    openQuestion(q, tileEl) {
        if (tileEl.classList.contains('played')) return;
        
        document.getElementById('sidebar-t1').classList.add('hide-right');
        document.getElementById('sidebar-t2').classList.add('hide-left');
        
        this.currentQuestion = q;
        this.currentTile = tileEl;
        this.isHintUsed = false;
        this.activeMultiplier = 1;
        
        document.getElementById('modal-question-text').innerText = q.text;
        document.getElementById('modal-answer-text').innerText = q.answer;
        document.getElementById('modal-answer-box').style.display = 'none';
        
        // Sync button text with team names
        document.getElementById('btn-award-t1').innerText = "Award " + document.getElementById('team1-name').innerText;
        document.getElementById('btn-award-t2').innerText = "Award " + document.getElementById('team2-name').innerText;
        
        const hintBtn = document.getElementById('btn-show-hint');
        const hintBox = document.getElementById('modal-hint-text');
        
        if (q.hint && q.hint.trim() !== '') {
            hintBtn.style.display = 'inline-block';
            hintBox.innerText = q.hint;
            hintBox.classList.remove('show');
        } else {
            hintBtn.style.display = 'none';
            hintBox.classList.remove('show');
        }
        
        this.startTimer();
        document.getElementById('question-modal').classList.add('active');
    }

    startTimer() {
        this.timeLeft = 0; // Starts at 0
        const timerEl = document.getElementById('modal-timer');
        timerEl.innerText = this.timeLeft;
        timerEl.style.color = 'var(--text-primary)';
        
        clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.timeLeft++;
            timerEl.innerText = this.timeLeft;
        }, 1000);
    }

    useMultiplier(team) {
        if (!this.currentQuestion || this.abilities[team].multiplier <= 0) return;
        this.abilities[team].multiplier--;
        this.activeMultiplier = 2;
        const btn = document.getElementById(`btn-ability-t${team}-2x`);
        btn.disabled = true;
        btn.innerText = "Used: 2x";
        btn.style.opacity = '0.5';
    }

    useFreeHint(team) {
        if (!this.currentQuestion || this.abilities[team].freeHint <= 0 || this.isHintUsed) return;
        this.abilities[team].freeHint--;
        const btn = document.getElementById(`btn-ability-t${team}-hint`);
        btn.disabled = true;
        btn.innerText = "Used: Free Hint";
        btn.style.opacity = '0.5';
        
        // Show hint without triggering standard hint penalty logic
        document.getElementById('modal-hint-text').classList.add('show');
        document.getElementById('btn-show-hint').style.display = 'none';
    }

    showHint() {
        if (this.isHintUsed) return;
        this.isHintUsed = true;
        document.getElementById('modal-hint-text').classList.add('show');
        document.getElementById('btn-show-hint').style.display = 'none';
    }

    awardPoints(team) {
        if (!this.currentQuestion) return;
        
        let pts = this.currentQuestion.point_value;
        if (this.isHintUsed) {
            pts = Math.floor(pts / 2); // Cut points in half
        }
        pts = pts * this.activeMultiplier;
        
        this.adjustScore(team, pts);
        this.closeQuestion();
    }

    adjustScore(team, amount) {
        this.scores[team] += amount;
        document.getElementById(`team${team}-score`).innerText = this.scores[team];
    }

    closeQuestion() {
        clearInterval(this.timer);
        document.getElementById('question-modal').classList.remove('active');
        
        document.getElementById('sidebar-t1').classList.remove('hide-right');
        document.getElementById('sidebar-t2').classList.remove('hide-left');
        
        if (this.currentTile) {
            this.currentTile.classList.add('played');
            this.currentTile.innerHTML = ''; // clear text
        }
        this.currentQuestion = null;
        this.currentTile = null;
        this.checkVictory();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const appEl = document.getElementById('game-app');
    if (appEl) {
        window.app = new TriviaGame(appEl.dataset.gameId);
    }
});
