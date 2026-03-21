// matcher.js

class Matcher {
    constructor(data) {
        this.data = data;
        this.selectedItems = [];
        this.correctMatches = 0;
        this.incorrectMatches = 0;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    startGame() {
        this.selectedItems = this.shuffleArray(this.data);
        this.correctMatches = 0;
        this.incorrectMatches = 0;
        this.displayItems();
    }

    displayItems() {
        // Logic to display items on the UI
    }

    checkMatch(selectedItem, userInput) {
        if (selectedItem === userInput) {
            this.correctMatches++;
            this.handleCorrectAnswer();
        } else {
            this.incorrectMatches++;
            this.handleIncorrectAnswer();
        }
    }

    handleCorrectAnswer() {
        // Logic for handling correct answers (e.g., visual feedback)
    }

    handleIncorrectAnswer() {
        // Logic for handling incorrect answers (e.g., visual feedback)
    }

    endGame() {
        // Logic to display final score and correct answers
    }

    resetGame() {
        this.startGame();
    }
}

export default Matcher;