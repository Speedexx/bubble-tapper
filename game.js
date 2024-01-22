function BubbleTapper() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startButton');
    const infoDiv = document.getElementById('info');
    const scoreBoardDiv = document.getElementsByClassName('score-board')[0];
    const restartButton = document.getElementById('restartButton');
    const restartButtonEndGame = document.getElementById('restartButtonEndGame');

    let gameStarted = false;
    let score = 0;
    let totalShots = 0;
    let hits = 0;
    let timer = 60; // czas w sekundach
    let timeout;
    let interval;
    let bubbles = [];
    let bubbleInterval = 1000; // Początkowy interwał generowania bąbelków w milisekundach
    const maxBubbles = 20; // Maksymalna ilość bąbelków na ekranie

    // Dla każdego koloru bąbelka utwórz obiekt Image
    const blueBubbleImage = new Image();
    const redBubbleImage = new Image();
    const yellowBubbleImage = new Image();

    // Ustaw źródło dla każdego obrazu bąbelka
    blueBubbleImage.src = 'images/blue-bubble.png';
    redBubbleImage.src = 'images/red-bubble.png';
    yellowBubbleImage.src = 'images/yellow-bubble.png';

    // Dodaj zmienną do śledzenia kolejnych pomyłek
    let consecutiveMisses = 0;
    const maxConsecutiveMisses = 3; // Maksymalna liczba kolejnych pomyłek

    function createBubble() {
        const bubbleImages = [blueBubbleImage, redBubbleImage, yellowBubbleImage];
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
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: 10 + Math.random() * 20,
            image: bubbleImages[selectedColorIndex],
            // color: bubbleColors[selectedColorIndex],
            type: selectedColorIndex === 0 ? 'blue' : selectedColorIndex === 1 ? 'red' : 'yellow',
            visible: true,
            lifespan: selectedColorIndex === 2 ? 75 : 120 // Życie: niebieski i czerwony - 60 klatek (1 sekunda), żółty - 45 klatek (0.75 sekundy)
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
            bubbles.push(bubble);
        }

        timeout = setTimeout(createBubble, bubbleInterval); // Wywołaj funkcję createBubble() z interwałem
    }

    function decreaseBubbleInterval() {
        if (bubbles.length < maxBubbles) {
            if (bubbleInterval > 300) {
                bubbleInterval -= 10; // Zmniejsz interwał generowania bąbelków o 10ms
            }
        }
    }

    function drawBubbles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        bubbles.forEach(bubble => {
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
                    }
                }

                bubble.lifespan--; // Odliczanie żywotności bąbelka

                if (bubble.radius > 0) { // Dodaj warunek sprawdzający czy promień jest większy od zera
                    // Zamiast rysować okrąg, użyj drawImage, aby ustawić obrazek bąbelka jako tło
                    ctx.drawImage(bubble.image, bubble.x - bubble.radius, bubble.y - bubble.radius, bubble.radius * 2, bubble.radius * 2);
                }
            }
        });

        bubbles = bubbles.filter(bubble => bubble.visible);
    }

    function checkCollision(mouseX, mouseY) {
        let hitBubble = false; // Dodaj zmienną do śledzenia trafień
        bubbles.forEach((bubble, index) => {
            const distance = Math.sqrt((mouseX - bubble.x) ** 2 + (mouseY - bubble.y) ** 2);
            if (distance < bubble.radius) {
                if (bubble.type === 'red') {
                    score -= 1;
                } else if (bubble.type === 'yellow') {
                    score += 3;
                } else {
                    score += 1;
                }
                hits++;
                bubbles.splice(index, 1);

                hitBubble = true; // Ustaw flagę na true, jeśli trafimy bąbelek
                decreaseBubbleInterval(); // Zmniejszenie interwału generowania bąbelków po trafieniu
            }
        });
        console.log(hitBubble);
        // Zaktualizuj licznik kolejnych pomyłek lub zresetuj go, jeśli trafiliśmy bąbelek
        consecutiveMisses = hitBubble ? 0 : consecutiveMisses + 1;


        // Zresetuj licznik consecutiveMisses po trafieniu bąbelka
        if (hitBubble) {
            consecutiveMisses = 0;
        }
    }

    function handleShot(mouseX, mouseY) {
        checkCollision(mouseX, mouseY);
        updateScore();
        checkEndGameCondition();
    }

    function checkEndGameCondition() {
        // Sprawdź, czy osiągnęliśmy maksymalną liczbę kolejnych pomyłek
        if (consecutiveMisses >= maxConsecutiveMisses) {
            endGame(); // Zakończ grę po pięciu kolejnych pomyłkach
        }
    }

    function updateScore() {
        const accuracy = Math.round((hits / totalShots) * 100) || 0;
        document.getElementById('score').innerText = score;
        document.getElementById('accuracy').innerText = `${accuracy}%`;
    }

    function countdown() {
        const interval = setInterval(() => {
            timer--;
            document.getElementById('timer').innerText = timer;

            if (timer === 0) {
                endGame();
            }
        }, 1000);
    }

    function startGame() {
        // Rozpocznij generowanie bąbelków z początkowym interwałem
        createBubble();
        countdown();
        interval = setInterval(drawBubbles, 30); // Odświeżanie canvas co 30ms
    }

    function stopGame() {
        canvas.removeEventListener('touchstart', touchStartHandler);
        canvas.removeEventListener('click', clickStartHandler);
    }

    restartButton.addEventListener('click', () => {
        resetGame();
    });

    restartButtonEndGame.addEventListener('click', () => {
        endGameInfo.style.display = 'none';
        scoreBoardDiv.style.display = 'block';

        // Wyświetlenie przycisku restartu
        restartButtonEndGame.style.display = 'none';
        resetGame();
        bindEvents();
    });

    function resetGame() {
        // Tutaj resetujemy wszystkie potrzebne wartości do stanu początkowego gry
        score = 0;
        totalShots = 0;
        accuracy = 0;
        hits = 0;
        timer = 60;
        bubbles = [];
        bubbleInterval = 1000;
        // Dodatkowe czynności do zresetowania gry...
        document.getElementById('score').innerText = score;
        document.getElementById('accuracy').innerText = accuracy + "%";
        document.getElementById('timer').innerText = timer;

    }

    function endGame() {
        // clearInterval(bubbleInterval); // Zatrzymujemy generowanie bąbelków
        stopGame();

        const accuracy = Math.round((hits / totalShots) * 100) || 0;
        const playTime = 60 - timer;

        // Wyświetlenie informacji o zakończeniu gry
        const endGameInfo = document.getElementById('endGameInfo');
        const finalScore = document.getElementById('finalScore');
        const finalAccuracy = document.getElementById('finalAccuracy');
        const finalPlayTime = document.getElementById('finalPlaytime');

        if (playTime == 1) {
            finalScore.innerHTML = score;
            finalAccuracy.innerHTML = accuracy;
            finalPlayTime.innerHTML = playTime + " " + "sekunda";
        }
        else if (playTime <= 4) {
            finalScore.innerHTML = score;
            finalAccuracy.innerHTML = accuracy;
            finalPlayTime.innerHTML = playTime + " " + "sekundy";
        }
        else {
            finalScore.innerHTML = score;
            finalAccuracy.innerHTML = accuracy;
            finalPlayTime.innerHTML = playTime + " " + "sekund";
        }
        endGameInfo.style.display = 'flex';
        scoreBoardDiv.style.display = 'none';

        // Wyświetlenie przycisku restartu
        restartButtonEndGame.style.display = 'block';
        // Tutaj resetujemy wszystkie potrzebne wartości do stanu początkowego gry
        score = 0;
        totalShots = 0;
        hits = 0;
        timer = 60;
        consecutiveMisses = 0;
        bubbleInterval = 1000;
    }

    startButton.addEventListener('click', () => {
        if (!gameStarted) {
            gameStarted = true;
            infoDiv.style.display = 'none'; // Ukryj instrukcję po kliknięciu przycisku Start
            scoreBoardDiv.style.display = 'block';
            restartButton.style.display = 'block';
            startGame(); // Funkcja rozpoczynająca grę
            // bindEvents();
        }
    });

    function bindEvents() {
        canvas.addEventListener('touchstart', touchStartHandler);
        canvas.addEventListener('click', clickStartHandler);
    }

    function touchStartHandler(event) {
        if (isMobileDevice()) {
            console.log('touched', event.touches.length);
            totalShots++;
            const rect = canvas.getBoundingClientRect();
            const touchX = event.touches[0].clientX - rect.left;
            const touchY = event.touches[0].clientY - rect.top;
            handleShot(touchX, touchY);
        }
    }

    function clickStartHandler(event) {
        if (!isMobileDevice()) {
            totalShots++;
            const rect = canvas.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const clickY = event.clientY - rect.top;
            handleShot(clickX, clickY);
        }
    }

    function isMobileDevice() {
        return /Mobi/i.test(navigator.userAgent);
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    return {
        init: function () {
            resizeCanvas();
            bindEvents();
        },
        resizeCanvas: resizeCanvas
    };

};


// Wywołaj funkcję init() na początku gry
window.addEventListener('load', function () {
    new BubbleTapper().init();
});

// Dodaj event listener na resize, który wywoła funkcję resizeCanvas()
window.addEventListener('resize', function () {
    new BubbleTapper().resizeCanvas();
});