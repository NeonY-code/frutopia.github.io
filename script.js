class FrutopiaGame {
    constructor(telegram_id, userName) {
        this.backendUrl = "https://ac99fb76-c7ab-4a6d-8eab-4093fe814f0a-00-3mcr68k5zte4w.worf.replit.dev/";
        this.telegram_id = telegram_id;
        this.userName = userName;

        this.stageThresholds = [100, 500, 1000, 5000, 10000];
        this.currentStage = 1;
        this.currentProgress = 0;
        this.maxProgress = this.stageThresholds[this.currentStage - 1];
        this.availableWater = 0;
        this.waterPerSecond = 1000;
        this.waterPerClick = 1;
        this.fruitsCollected = 0;
        this.maxStage = 5;
        this.currentFruitIndex = 0;
        this.maxWater = 10000;
        this.currentPage = 'game';

        this.stages = [
            { emoji: '🌰', name: 'Семечка' },
            { emoji: '🌱', name: 'Росток' },
            { emoji: '🌿', name: 'Саженец' },
            { emoji: '🌳', name: 'Дерево' },
            { emoji: '🍎', name: 'Плодовое дерево' }
        ];

        this.fruits = [
            /* ... твій масив фруктів ... */
        ];

        this.fetchUserData().then(() => {
            this.init();
            this.bindEvents();
            this.createInventoryGrid();
            this.updateUI();
            setInterval(() => this.generateWater(), 1000);
        });
    }

    async fetchUserData() {
        try {
            const response = await fetch(`${this.backendUrl}/users/by_telegram_id/?telegram_id=${this.telegram_id}`);
            if (!response.ok) {
                await this.createUser();
            } else {
                const user = await response.json();
                this.currentProgress = user.progress;
                this.availableWater = user.water;
                this.userName = user.name;
                this.updateStageByProgress();
            }
        } catch (error) {
            console.error("Помилка при завантаженні користувача:", error);
        }
    }

    async createUser() {
        try {
            const response = await fetch(`${this.backendUrl}/users/`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    telegram_id: this.telegram_id,
                    name: this.userName,
                    progress: this.currentProgress,
                    water: this.availableWater,
                })
            });
            if (!response.ok) throw new Error("Не вдалось створити користувача");
            const user = await response.json();
            console.log("Користувач створений:", user);
        } catch (error) {
            console.error("Помилка створення користувача:", error);
        }
    }

    async saveUserData() {
        try {
            const resGet = await fetch(`${this.backendUrl}/users/by_telegram_id/?telegram_id=${this.telegram_id}`);
            if (!resGet.ok) throw new Error("Користувача не знайдено при оновленні");
            const user = await resGet.json();

            const resPatch = await fetch(`${this.backendUrl}/users/${user.id}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    progress: this.currentProgress,
                    water: this.availableWater,
                }),
            });
            if (!resPatch.ok) throw new Error("Не вдалось оновити користувача");
        } catch (error) {
            console.error("Помилка збереження користувача:", error);
        }
    }

    updateStageByProgress() {
        for (let i = this.stageThresholds.length - 1; i >= 0; i--) {
            if (this.currentProgress >= this.stageThresholds[i]) {
                this.currentStage = i + 2;
                if (this.currentStage > this.maxStage) this.currentStage = this.maxStage;
                this.maxProgress = this.stageThresholds[this.currentStage - 1] || this.stageThresholds[this.stageThresholds.length - 1];
                return;
            }
        }
        this.currentStage = 1;
        this.maxProgress = this.stageThresholds[0];
    }

    generateWater() {
        this.availableWater = Math.min(this.availableWater + this.waterPerSecond, this.maxWater);
        this.updateUI();
        this.saveUserData();
    }

    waterPlant() {
        if (this.availableWater >= this.waterPerClick) {
            this.availableWater -= this.waterPerClick;
            this.currentProgress++;
            this.checkStageUp();
            this.updateUI();
            this.saveUserData();
        }
    }

    clickPlant() {
        this.waterPlant();
    }

    checkStageUp() {
        if (this.currentProgress >= this.maxProgress) {
            this.currentStage++;
            if (this.currentStage > this.maxStage) {
                this.currentStage = 1;
                this.currentProgress = 0;
                this.maxProgress = this.stageThresholds[0];
                this.waterPerSecond = Math.floor(this.waterPerSecond * 1.2);
                return;
            }
            this.currentProgress = 0;
            this.maxProgress = this.stageThresholds[this.currentStage - 1];
        }
    }

    updateUI() {
        if (this.currentPage === 'inventory') this.updateInventoryUI();

        document.getElementById('progressText').textContent = `${this.currentProgress} / ${this.maxProgress}`;

        const progressBar = document.getElementById('progressBar');
        const segments = 8;
        const filled = Math.floor((this.currentProgress / this.maxProgress) * segments);
        progressBar.innerHTML = '';
        for (let i = 0; i < segments; i++) {
            const seg = document.createElement('div');
            seg.className = 'progress-segment' + (i < filled ? '' : ' empty');
            progressBar.appendChild(seg);
        }

        const stage = this.stages[this.currentStage - 1] || this.stages[0];
        document.getElementById('plantEmoji').textContent = stage.emoji;
        document.getElementById('plantName').textContent = `(${stage.name})`;
        document.getElementById('stageText').textContent = `${stage.name} ${this.currentStage}/${this.maxStage}`;
        document.getElementById('waterCount').textContent = `${this.availableWater} / ${this.maxWater}`;
        document.getElementById('fruitCount').textContent = this.fruitsCollected.toString();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    let telegram_id = localStorage.getItem('telegram_id');
    let userName = localStorage.getItem('user_name');

    if (!telegram_id || !userName) {
        if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe) {
            const user = Telegram.WebApp.initDataUnsafe.user;
            if (user && user.id && user.first_name) {
                telegram_id = user.id;
                userName = user.first_name;
                localStorage.setItem('telegram_id', telegram_id);
                localStorage.setItem('user_name', userName);
            } else {
                alert("Cannot get information from Telegram WebApp.");
                return;
            }
        } else {
            alert("Telegram WebApp is not availeble.");
            return;
        }
    }

    window.game = new FrutopiaGame(telegram_id, userName);
});

