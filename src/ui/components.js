const CharacterCard = ({ character, onClick }) => {
    return (
        <div className="character-card" onClick={() => onClick(character)}>
            {character}
        </div>
    );
};

const ScoreBoard = ({ score, highScore }) => {
    return (
        <div className="score-board">
            <h2>Score: {score}</h2>
            <h2>High Score: {highScore}</h2>
        </div>
    );
};

const Timer = ({ timeLeft }) => {
    return (
        <div className="timer">
            <h2>Time Left: {timeLeft}s</h2>
        </div>
    );
};

const GameOverScreen = ({ score, highScore, onRestart }) => {
    return (
        <div className="game-over-screen">
            <h1>Game Over</h1>
            <h2>Your Score: {score}</h2>
            <h2>High Score: {highScore}</h2>
            <button onClick={onRestart}>Restart</button>
        </div>
    );
};

const Tutorial = () => {
    return (
        <div className="tutorial">
            <h2>Tutorial</h2>
            <p>Match the Roman letters with their corresponding Japanese characters.</p>
            <p>Click on a character to select it, and then click on the matching Roman letter.</p>
            <p>Try to score as high as you can before the time runs out!</p>
        </div>
    );
};

export { CharacterCard, ScoreBoard, Timer, GameOverScreen, Tutorial };