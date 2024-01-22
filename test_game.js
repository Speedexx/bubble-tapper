function BubbleTapper() {
    // Kontener na elementy UI.
    const _ui = {
        canvas: document.getElementById('gameCanvas'),
        ctx: null,
        startButton: document.getElementById('startButton'),
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
        animationFrame: 0,
        gameStarted: false,
        score: 0,
        totalShots: 0,
        hits: 0,
        timer: 60, // czas w sekundach
        timeout: null,
        interval: null,
        bubbles: [],
        bubbleInterval: 2000, // Początkowy interwał generowania bąbelków w milisekundach
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
        bind: () => {
            _ui.canvas.addEventListener('touchstart', touchStartHandler);
            _ui.canvas.addEventListener('click', clickStartHandler);
            _ui.startButton.addEventListener('click', startButtonHandler);
            restartButton.addEventListener('click', resetGame);
            restartButtonEndGame.addEventListener('click', restartButtonEndGameHandler);
        },
        unbind: () => {
            _ui.canvas.removeEventListener('touchstart', touchStartHandler);
            _ui.canvas.removeEventListener('click', clickStartHandler);
        },
    }

    // Ustaw źródło dla każdego obrazu bąbelka
    images.blueBubbleImage.src = 'images/blue-bubbles-horizontal.png';
    images.redBubbleImage.src = 'images/red-bubble.png';
    images.yellowBubbleImage.src = 'images/yellow-bubble.png';


    /**
     * Wycienk z sprite sheet
     * Czyli co chcemy wyciąć - poszczególną klatkę.
     * 
     * sx - source x,
     * sy - source y,
     * sw - source width,
     * sh - source height
     * 
     * Gdzie chcemy umieścić ten wycięty kawałek
     * dx - destination x,
     * dy - destination y,
     * dw - destination width, 
     * dh - destination height
     * 
     * _ui.ctx.drawImage(images.blueBubbleImage, sx, sy, sw, sh, 0, 0, _ui.canvas.width, _ui.canvas.height);
     *
     * height = 554
     * width = 573
     * 
     * odstęp = 87
     */
    // function animate() {
    //     const spriteWidth = 587;
    //     const spriteHeight = 565;
    //     _ui.ctx.clearRect(0, 0, _ui.canvas.width, _ui.canvas.height);
    //     _ui.ctx.drawImage(images.blueBubbleImage, 0 * spriteWidth, 0, spriteWidth, spriteHeight, 0, 0, spriteWidth, spriteHeight);
    //     requestAnimationFrame(animate);
    // }
    function animateBlueBubble(bubble, animationFrame) {
        const spriteWidth = 587;
        const spriteHeight = 565;
        const animationSpeed = 10; // dostosuj prędkość animacji
        const frameCount = 8;
        let gameFrame = 0;
        const staggerFrames = 40;

        let currentFrame = 0;

        function draw() {
            _ui.ctx.clearRect(0, 0, _ui.canvas.width, _ui.canvas.height);

            _ui.ctx.drawImage(
                bubble.image,
                currentFrame * spriteWidth,
                0,
                spriteWidth,
                spriteHeight,
                bubble.x - bubble.radius,
                bubble.y - bubble.radius,
                bubble.radius * 2,
                bubble.radius * 2
            );

            if (animationFrame % staggerFrames == 0) {
                if (currentFrame < 7) currentFrame++;
                else {
                    currentFrame = 0;
                }
            }
        }

        function animateLoop() {
            draw();
            animationFrame++;
            requestAnimationFrame(animateLoop);
        }

        animateLoop();

        const stopAnimation = () => {
            _ui.canvas.removeEventListener('click', handleShot);
        };
    }


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
                let growthSpeed = bubble.type === 'yellow' ? 1.5 : 0.75; // Szybkość powiększania różna dla bąbelków żółtych
                let shrinkSpeed = bubble.type === 'yellow' ? 0.75 : 0.3; // Szybkość zmniejszania

                // Dostosuj growthSpeed i shrinkSpeed w zależności od klatki animacji
                growthSpeed *= adjustSpeed(gameVariables.animationFrame);
                shrinkSpeed *= adjustSpeed(gameVariables.animationFrame);

                if (bubble.radius < maxRadius && !bubble.shrinking) {
                    bubble.radius += growthSpeed;
                } else {
                    bubble.shrinking = true;
                    bubble.radius -= shrinkSpeed;

                    if (bubble.radius <= 0 || bubble.lifespan <= 0) {
                        bubble.visible = false;
                    }
                }

                bubble.lifespan--; // Odliczanie żywotności bąbelka

                console.log(bubble.type + " " + bubble.radius + " " + bubble.lifespan);

                if (bubble.radius > 0) {
                    if (bubble.type === 'blue') {
                        animateBlueBubble(bubble, gameVariables.animationFrame);
                    } else {
                        _ui.ctx.drawImage(bubble.image, bubble.x - bubble.radius, bubble.y - bubble.radius, bubble.radius * 2, bubble.radius * 2);
                    }
                }
            }
        });

        gameVariables.bubbles = gameVariables.bubbles.filter(bubble => bubble.visible);
        gameVariables.animationFrame++; // Inkrementuj numer klatki animacji
    }

    // Funkcja dostosowująca szybkość w zależności od klatki animacji
    function adjustSpeed(animationFrame) {
        // Przykładowy sposób dostosowania, dostosuj do własnych potrzeb
        return 0.5 + animationFrame * 0.01;
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
                } else if (bubble.type === 'yellow') {
                    gameVariables.score += 3;
                } else {
                    gameVariables.score += 1;
                }
                gameVariables.hits++;
                gameVariables.bubbles.splice(index, 1);

                hitBubble = true;
                decreaseBubbleInterval();
            }
        });

        gameVariables.consecutiveMisses = hitBubble ? 0 : gameVariables.consecutiveMisses + 1;

        if (hitBubble) {
            gameVariables.consecutiveMisses = 0;
        }
    }

    // Zmniejszenie interwału generowania bąbelków.
    function decreaseBubbleInterval() {
        if (gameVariables.bubbles.length < gameVariables.maxBubbles) {
            if (gameVariables.bubbleInterval > 300) {
                gameVariables.bubbleInterval -= 10; // Zmniejsz interwał generowania bąbelków o 10ms
            }
        }
    }

    // Rozpoczęcie gry.
    function startGame() {
        createBubble();
        countdown();
        setInterval(drawBubbles, 30);
    }

    // Funkcja resetująca grę.
    function resetGame() {
        // Tutaj resetujemy wszystkie potrzebne wartości do stanu początkowego gry
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
    }

    // Funkcja kończąca daną grę.
    function endGame() {
        events.unbind();

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
            _ui.scoreBoardDiv.style.display = 'block';
            _ui.restartButton.style.display = 'block';
            restartButton.style.display = 'block';

            startGame();
        }
    }

    // Obsługa eventu kliknięcia na restartu gry po zakończonej rozgrywce.
    function restartButtonEndGameHandler() {
        endGameInfo.style.display = 'none';
        _ui.scoreBoardDiv.style.display = 'block';
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
            events.bind();
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