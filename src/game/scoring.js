const scoring = {
    scores: [],
    
    addScore: function(username, score) {
        this.scores.push({ username, score });
        this.saveScores();
    },

    getScores: function() {
        return this.scores;
    },

    saveScores: function() {
        localStorage.setItem('matchingGameScores', JSON.stringify(this.scores));
    },

    loadScores: function() {
        const savedScores = localStorage.getItem('matchingGameScores');
        if (savedScores) {
            this.scores = JSON.parse(savedScores);
        }
    },

    clearScores: function() {
        this.scores = [];
        this.saveScores();
    },

    getTopScores: function(limit = 10) {
        return this.scores.sort((a, b) => b.score - a.score).slice(0, limit);
    }
};

scoring.loadScores();

export default scoring;