function BubbleTapper() {
    // Kontener na elementy UI.
    const _ui = {
        canvas: document.getElementById('gameCanvas'),
        ctx: null,
        startButton: document.getElementById('startButton'),
        heartImage: document.getElementById('hearts-image'),
        infoDiv: document.getElementById('info'),
        scoreBoardDiv: document.getElementsByClassName('score-board')[0], //Tablica wyników
        restartButton: document.getElementById('restartButton'), // Przycisk restartu
        restartButtonEndGame: document.getElementById('restartButtonEndGame'), // Końcowy przycisk restartu
        score: document.getElementById('score'),
        accuracy: document.getElementById('accuracy'),
        timer: document.getElementById('timer'),

        endGame: {
            endGameInfo: document.getElementById('endGameInfo'),
            finalScore: document.getElementById('finalScore'),
            finalAccuracy: document.getElementById('finalAccuracy'),
            finalPlayTime: document.getElementById('finalPlaytime'),
        },
    };

    _ui.ctx = _ui.canvas.getContext('2d');

    // Kontener na elementy dotyczące gry.
    const gameVariables = {
        gameStarted: false,
        score: 0,
        totalShots: 0,
        hits: 0,
        hitEffects: [],
        timer: 60, // czas w sekundach
        bubbles: [],
        bubbleInterval: 1000, // Początkowy interwał generowania bąbelków w milisekundach
        maxBubbles: 20, // Maksymalna ilość bąbelków na ekranie
        consecutiveMisses: 0,
        maxConsecutiveMisses: 3 // Maksymalna liczba kolejnych pomyłek
    };

    // Kontener na elementy dotyczące zdjęć bąbelków.
    const images = {
        blueBubbleImage: new Image(),
        redBubbleImage: new Image(),
        yellowBubbleImage: new Image(),
    };

    // Kontener na eventy.
    const events = {
        bindStart: () => {
            _ui.startButton.addEventListener('click', startButtonHandler);
        },
        bind: () => {
            _ui.canvas.addEventListener('touchstart', touchStartHandler);
            _ui.canvas.addEventListener('click', clickStartHandler);
            restartButton.addEventListener('click', resetGame);
            restartButtonEndGame.addEventListener('click', restartButtonEndGameHandler);
        },
        unbind: () => {
            _ui.canvas.removeEventListener('touchstart', touchStartHandler);
            _ui.canvas.removeEventListener('click', clickStartHandler);
        },
    }

    // Ustaw źródło dla każdego obrazu bąbelka
    images.blueBubbleImage.src = 'images/blue-bubble.png';
    images.redBubbleImage.src = 'images/red-bubble.png';
    images.yellowBubbleImage.src = 'images/yellow-bubble.png';

    // Tworzenie nowego bąbelka.
    function createBubble() {
        const bubbleImages = [images.blueBubbleImage, images.redBubbleImage, images.yellowBubbleImage];
        const probabilities = [0.8, 0.1, 0.1];

        let random = Math.random();
        let selectedColorIndex = 0;

        for (let i = 0; i < probabilities.length; i++) {
            random -= probabilities[i];
            if (random <= 0) {
                selectedColorIndex = i;
                break;
            }
        }

        const bubble = {
            x: Math.random() * _ui.canvas.width,
            y: Math.random() * _ui.canvas.height,
            radius: 10 + Math.random() * 20,
            image: bubbleImages[selectedColorIndex],
            type: selectedColorIndex === 0 ? 'blue' : selectedColorIndex === 1 ? 'red' : 'yellow',
            visible: true,
            lifespan: selectedColorIndex === 2 ? 75 : 140
        };

        // Sprawdzenie, czy bąbelek koliduje z obszarem tablicy wyników
        const scoreBoardRect = document.querySelector('.score-board').getBoundingClientRect();
        const bubbleRect = {
            top: bubble.y - bubble.radius,
            bottom: bubble.y + bubble.radius,
            left: bubble.x - bubble.radius,
            right: bubble.x + bubble.radius,
        };

        if (
            bubbleRect.bottom < scoreBoardRect.top ||
            bubbleRect.top > scoreBoardRect.bottom ||
            bubbleRect.right < scoreBoardRect.left ||
            bubbleRect.left > scoreBoardRect.right
        ) {
            // Brak kolizji z obszarem tablicy wyników, można dodać bąbelek do gry
            gameVariables.bubbles.push(bubble);
        }
        return setTimeout(createBubble, gameVariables.bubbleInterval);
    }

    // Rysowanie bąbelków.
    function drawBubbles() {
        _ui.ctx.clearRect(0, 0, _ui.canvas.width, _ui.canvas.height);

        gameVariables.bubbles.forEach(bubble => {
            if (bubble.visible) {
                const maxRadius = 40; // Maksymalny rozmiar bąbelka
                const growthSpeed = bubble.type === 'yellow' ? 1.5 : 0.75; // Szybkość powiększania różna dla bąbelków żółtych
                const shrinkSpeed = bubble.type === 'yellow' ? 0.75 : 0.5; // Szybkość zmniejszania

                if (bubble.radius < maxRadius && !bubble.shrinking) {
                    bubble.radius += growthSpeed;
                } else {
                    bubble.shrinking = true;
                    bubble.radius -= shrinkSpeed;

                    if (bubble.radius <= 0 || bubble.lifespan <= 0) {
                        bubble.visible = false;
                        if (bubble.type === 'blue' || bubble.type === 'yellow') {
                            gameVariables.consecutiveMisses += 1;
                        }
                    }
                }

                bubble.lifespan--; // Odliczanie żywotności bąbelka

                if (bubble.radius > 0) {
                    _ui.ctx.imageSmoothingEnabled = true;
                    _ui.ctx.drawImage(bubble.image, bubble.x - bubble.radius, bubble.y - bubble.radius, bubble.radius * 2, bubble.radius * 2);
                }
            }
        });

        gameVariables.bubbles = gameVariables.bubbles.filter(bubble => bubble.visible);

        drawHitEffects();
        if (gameVariables.gameStarted) {
            let misses = gameVariables.consecutiveMisses;
            checkEndGameCondition();
            updateReamingLives(misses);
        }
    }

    function updateReamingLives(misses) {
        if (misses === 1) {
            _ui.heartImage.src = "images/hearts-2.png";
        }
        else if (misses === 2) {
            _ui.heartImage.src = "images/hearts-3.png";
        }
        else if (misses === 3) {
            _ui.heartImage.src = "images/hearts-4.png";
        }
    }

    // Obsługa 'strzału'.
    function handleShot(mouseX, mouseY) {
        checkCollision(mouseX, mouseY);
        updateScore();
        checkEndGameCondition();
    }

    // Sprawdzenie kolizji.
    function checkCollision(mouseX, mouseY) {
        let hitBubble = false;

        gameVariables.bubbles.forEach((bubble, index) => {
            const distance = Math.sqrt((mouseX - bubble.x) ** 2 + (mouseY - bubble.y) ** 2);
            if (distance < bubble.radius) {
                if (bubble.type === 'red') {
                    gameVariables.score -= 1;
                    // Dodaj efekt po trafieniu
                    addHitEffect(bubble);
                } else if (bubble.type === 'yellow') {
                    gameVariables.score += 3;
                    // Dodaj efekt po trafieniu
                    addHitEffect(bubble);
                } else {
                    gameVariables.score += 1;
                    // Dodaj efekt po trafieniu
                    addHitEffect(bubble);
                }

                gameVariables.hits++;
                gameVariables.bubbles.splice(index, 1);

                hitBubble = true;
                decreaseBubbleInterval();
            }
        });

        // gameVariables.consecutiveMisses = hitBubble ? gameVariables.consecutiveMisses : gameVariables.consecutiveMisses + 1;

        // if (hitBubble) {
        //     gameVariables.consecutiveMisses = 0;
        // }
    }

    // Dodaj efekt po trafieniu
    function addHitEffect(bubble) {
        const hitEffect = {
            x: bubble.x,
            y: bubble.y,
            radius: bubble.radius,
            message: bubble.type === 'red' ? 'Oops!' : "Hit!",
            color: bubble.type === 'red' ? 'rgba(255, 99, 71, 0.75)' : `rgba(0, 140, 186, 0.35)`,
            lifespan: 10,
        };

        gameVariables.hitEffects.push(hitEffect);
    }

    // Funkcja rysująca efekty po trafieniu
    function drawHitEffects() {
        gameVariables.hitEffects.forEach(effect => {
            _ui.ctx.fillStyle = effect.color;
            _ui.ctx.beginPath();
            _ui.ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            _ui.ctx.fill();

            // Dostosuj wielkość czcionki w zależności od promienia bąbelka
            const fontSize = Math.min(0.75 * effect.radius, 30);

            // Dodaj tekst "Hit"
            _ui.ctx.font = `${fontSize}px Arial`;
            _ui.ctx.fillStyle = "white";
            _ui.ctx.textAlign = "center";
            _ui.ctx.fillText(effect.message, effect.x, effect.y + 5);

            effect.lifespan--;

            if (effect.lifespan <= 0) {
                // Usuń efekt po zakończeniu jego życia
                gameVariables.hitEffects.splice(gameVariables.hitEffects.indexOf(effect), 1);
            }
        });
    }

    // Zmniejszenie interwału generowania bąbelków.
    function decreaseBubbleInterval() {
        if (gameVariables.bubbles.length < gameVariables.maxBubbles) {
            if (gameVariables.bubbleInterval > 300) {
                gameVariables.bubbleInterval -= 12; // Zmniejsz interwał generowania bąbelków o 12ms
            }
        }
    }

    // Rozpoczęcie gry.
    function startGame() {
        createBubble();
        countdown();
        setInterval(drawBubbles, 20);
    }

    // Funkcja resetująca grę.
    function resetGame() {
        // Tutaj resetujemy wszystkie potrzebne wartości do stanu początkowego gry
        gameVariables.gameStarted = true;
        gameVariables.consecutiveMisses = 0;
        gameVariables.score = 0;
        gameVariables.totalShots = 0;
        accuracy = 0;
        gameVariables.hits = 0;
        gameVariables.timer = 60;
        gameVariables.bubbles = [];
        gameVariables.bubbleInterval = 1000;

        _ui.score.innerText = gameVariables.score;
        _ui.accuracy.innerText = accuracy + "%";
        _ui.timer.innerText = gameVariables.timer;
        _ui.heartImage.src = "images/hearts-1.png";
    }

    // Funkcja kończąca daną grę.
    function endGame() {
        events.unbind();
        gameVariables.gameStarted = false;

        const accuracy = Math.round((gameVariables.hits / gameVariables.totalShots) * 100) || 0;
        const playTime = 60 - gameVariables.timer;

        if (playTime == 1) {
            _ui.endGame.finalScore.innerHTML = gameVariables.score;
            _ui.endGame.finalAccuracy.innerHTML = accuracy;
            _ui.endGame.finalPlayTime.innerHTML = playTime + " " + "sekunda";
        }
        else if (playTime <= 4) {
            _ui.endGame.finalScore.innerHTML = gameVariables.score;
            _ui.endGame.finalAccuracy.innerHTML = accuracy;
            _ui.endGame.finalPlayTime.innerHTML = playTime + " " + "sekundy";
        }
        else {
            _ui.endGame.finalScore.innerHTML = gameVariables.score;
            _ui.endGame.finalAccuracy.innerHTML = accuracy;
            _ui.endGame.finalPlayTime.innerHTML = playTime + " " + "sekund";
        }
        _ui.endGame.endGameInfo.style.display = 'flex';
        _ui.scoreBoardDiv.style.display = 'none';

        // Wyświetlenie przycisku restartu
        _ui.restartButtonEndGame.style.display = 'block';

        // Tutaj resetujemy wszystkie potrzebne wartości do stanu początkowego gry
        gameVariables.score = 0;
        gameVariables.totalShots = 0;
        gameVariables.hits = 0;
        gameVariables.timer = 60;
        gameVariables.consecutiveMisses = 0;
        gameVariables.bubbleInterval = 1000;
    }

    // Aktualizacja tablicy wyników.
    function updateScore() {
        const accuracy = Math.round((gameVariables.hits / gameVariables.totalShots) * 100) || 0;
        _ui.score.innerText = gameVariables.score;
        _ui.accuracy.innerText = accuracy + "%";
    }

    // Sprawdzenie warunku zakończenia gry.
    function checkEndGameCondition() {
        if (gameVariables.consecutiveMisses >= gameVariables.maxConsecutiveMisses) {
            endGame();
        }
    }

    // Funkcja odliczająca czas gry.
    function countdown() {
        return setInterval(() => {
            gameVariables.timer--;
            document.getElementById('timer').innerText = gameVariables.timer;

            if (gameVariables.timer === 0) {
                endGame();
            }
        }, 1000);
    }

    // Obsługa eventu kliknięcia na przycisk startu gry.
    function startButtonHandler() {
        if (!gameVariables.gameStarted) {
            gameVariables.gameStarted = true;
            _ui.infoDiv.style.display = 'none';
            _ui.scoreBoardDiv.style.display = 'flex';
            _ui.restartButton.style.display = 'block';
            restartButton.style.display = 'block';

            events.bind();
            startGame();
        }
    }

    // Obsługa eventu kliknięcia na restartu gry po zakończonej rozgrywce.
    function restartButtonEndGameHandler() {
        endGameInfo.style.display = 'none';
        _ui.scoreBoardDiv.style.display = 'flex';
        _ui.restartButtonEndGame.style.display = 'none';

        resetGame();
        events.bind();
    }

    // Obsługa eventu dotknięcia na Cavnas.
    function touchStartHandler(event) {
        if (isMobileDevice()) {
            gameVariables.totalShots++;
            const rect = _ui.canvas.getBoundingClientRect();
            const touchX = event.touches[0].clientX - rect.left;
            const touchY = event.touches[0].clientY - rect.top;
            handleShot(touchX, touchY);
        }
    }

    // Obsługa eventu kliknięcia na Cavnas.
    function clickStartHandler(event) {
        if (!isMobileDevice()) {
            gameVariables.totalShots++;
            const rect = _ui.canvas.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const clickY = event.clientY - rect.top;
            handleShot(clickX, clickY);
        }
    }

    // Sprawdza czy obecne urządzenie jest typu mobilnego.
    function isMobileDevice() {
        return /Mobi/i.test(navigator.userAgent);
    }

    // Funkcja skalująca Canvas po zmianie wymiarów planszy.
    function resizeCanvas() {
        console.log("Resized");
        _ui.canvas.width = window.innerWidth;
        _ui.canvas.height = window.innerHeight;
    }

    return {
        // Inicjalizacja gry
        init: function () {
            resizeCanvas();
            events.bindStart();
        },
        resizeCanvas: resizeCanvas
    };

};

window.addEventListener('load', function () {
    new BubbleTapper().init();
});

// Dodaj event listener na resize, który wywoła funkcję resizeCanvas()
window.addEventListener('resize', function () {
    new BubbleTapper().resizeCanvas();
});