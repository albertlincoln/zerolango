const screens = (() => {
    const mainMenu = () => {
        const menuDiv = document.createElement('div');
        menuDiv.classList.add('menu');

        const title = document.createElement('h1');
        title.textContent = 'Roman-Japanese Matching Game';
        menuDiv.appendChild(title);

        const startButton = document.createElement('button');
        startButton.textContent = 'Start Game';
        startButton.addEventListener('click', () => {
            // Logic to start the game
        });
        menuDiv.appendChild(startButton);

        const tutorialButton = document.createElement('button');
        tutorialButton.textContent = 'Tutorial';
        tutorialButton.addEventListener('click', () => {
            // Logic to show tutorial
        });
        menuDiv.appendChild(tutorialButton);

        return menuDiv;
    };

    const gameScreen = () => {
        const gameDiv = document.createElement('div');
        gameDiv.classList.add('game');

        const timer = document.createElement('div');
        timer.classList.add('timer');
        timer.textContent = 'Time: 60'; // Placeholder for timer
        gameDiv.appendChild(timer);

        const scoreDisplay = document.createElement('div');
        scoreDisplay.classList.add('score');
        scoreDisplay.textContent = 'Score: 0'; // Placeholder for score
        gameDiv.appendChild(scoreDisplay);

        const characterContainer = document.createElement('div');
        characterContainer.classList.add('characters');
        // Logic to display characters will go here
        gameDiv.appendChild(characterContainer);

        return gameDiv;
    };

    const endScreen = (score) => {
        const endDiv = document.createElement('div');
        endDiv.classList.add('end');

        const finalScore = document.createElement('h2');
        finalScore.textContent = `Your Score: ${score}`;
        endDiv.appendChild(finalScore);

        const restartButton = document.createElement('button');
        restartButton.textContent = 'Play Again';
        restartButton.addEventListener('click', () => {
            // Logic to restart the game
        });
        endDiv.appendChild(restartButton);

        const leaderboardButton = document.createElement('button');
        leaderboardButton.textContent = 'View Leaderboard';
        leaderboardButton.addEventListener('click', () => {
            // Logic to show leaderboard
        });
        endDiv.appendChild(leaderboardButton);

        return endDiv;
    };

    return {
        mainMenu,
        gameScreen,
        endScreen,
    };
})();

export default screens;