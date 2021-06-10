const input = require('readline-sync');
const fs = require('fs');
const Word = require("./Word.js");
const howToPlay = require("./howToPlay.js");
const { time } = require('console');

class WordCollection {
  constructor(wordList, hangmanMan) {
    // Gameplay
    this.playerName = "";
    this.existingScore = 0;
    this.existingTime = 0;
    this.categoryInPlay = "";
    this.categories = [];
    this.wordList = wordList;
    this.score = 0;
    this.wrongGuesses = 0;
    this.hangmanMan = hangmanMan;
    this.currentWord = new Word("");
    this.alphabets = "abcdefghijklmnopqrstuvwxyz".split("");
    this.lifelineVowel = true;
    this.lifelineDefinition = true;
    this.lifelinePass = true;
    this.lettersGuessed = [];
    this.words = [];
    this.wordsInPlay = [];
    this.forceComplete = false;
    // Gamerule
    this.numberOfRounds = 10;
  }

  generateWords() {
    // Convert word list into word array with identifiers: name, definition, category, guessed
    this.words = Object.entries(this.wordList).reduce((acc, [category, words]) => {
      const parsedWords = words.map((word) => new Word(word.name, word.definition, category));
      this.categories.push(category);
      return [...acc, parsedWords];
    }, []).flat();
    this.categories = this.categories.filter((cat) => cat !== "undefined");
  }

  chooseCategory() { // Choose category
    var str = `Welcome ${this.playerName}, please choose a category:`;
    for (var i = 0; i < this.categories.length; i++) {
      str += `\n(${i + 1}) ${this.categories[i]}`;
    }
    str += `\n>> `
    do {
      console.clear();
      this.displayHangmanTextArt();
      if (index !== undefined) {
        console.log(`Error: You have entered an invalid category: "${index}"`);
      }
      var index = input.question(str);
    } while (!(index > 0 && index <= this.categories.length));
    this.categoryInPlay = this.categories[index - 1];
  }

  initialiseWordsInPlay() {
    // Fisher Yates Shuffle
    for (var i = this.words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.words[i], this.words[j]] = [this.words[j], this.words[i]];
    }
    // Take 10 words to use in game
    this.wordsInPlay = this.words.filter((word) => word.category === this.categoryInPlay).slice(0, this.numberOfRounds);
  }

  chooseWord() { // Choose first word & get start time
    this.currentWord = this.wordsInPlay[Math.floor(Math.random() * this.wordsInPlay.length)]; // Extra shuffle
  }

  startWord() { // Choose consecutive words
    // Remove the current word from bank
    const index = this.wordsInPlay.findIndex((word) => word.name === this.currentWord.name);
    this.wordsInPlay.splice(index, 1);
    this.alphabets = "abcdefghijklmnopqrstuvwxyz".split("");
    this.chooseWord();
    this.startTurn();
  }

  mainMenu() { // Main menu UI
    do {
      console.clear();
      this.displayHangmanTextArt();
      if (menu !== undefined) {
        console.log(`Invalid input: "${menu}"`)
      }
      var menu = input.question(`
(1) Play Game
(2) Leaderboards
(3) How to play
(4) Exit game
\n>> `);
    } while (!(menu === "1" || menu === "2" || menu === "3" || menu === "4"));
    switch (menu) {
      case "1": this.startGame();
        break;
      case "2": this.leaderboards();
        break;
      case "3": this.howToPlay();
        break;
      case "4": console.log("Exitting game...");
    }
  }

  startGame() {
    console.clear();
    this.displayHangmanTextArt();
    this.playerName = input.question("Please enter your name (0 to exit):\n>> ");
    if (this.playerName == 0) {
      this.mainMenu();
      return;
    }
    if (fs.existsSync("./Hangman/Scores.json")) {
      if ((JSON.parse(fs.readFileSync("./Hangman/Scores.json", "utf-8"))[this.playerName])) {
        this.existingScore = (JSON.parse(fs.readFileSync("./Hangman/Scores.json", "utf-8"))[this.playerName]);
      } else {
        this.existingScore = 0;
      }
    } else {
      fs.writeFileSync("./Hangman/Scores.json", JSON.stringify({}));
      this.existingScore = 0;
    }
    this.generateWords();
    this.chooseCategory();
    console.clear();
    this.initialiseWordsInPlay();
    this.chooseWord();
    this.initStartTime = new Date(); // Get start time
    this.startTime = this.initStartTime.getTime();
    this.startTurn();
  }

  startTurn() {
    // Check word completion
    if ((this.currentWord.guessed.every(guessed => guessed)) || this.forceComplete === true) {
      this.forceComplete = false;
      this.increaseScore();
      // Check game/round completion
      if (this.score === this.numberOfRounds) {
        this.updateLeaderboard();
        console.clear();
        console.log(`Congratulations, you've won the game with a score of ${this.score}!`);
        console.log(`Your total score is now ${this.totalScore}.`);
        console.log(`The last word was "${this.currentWord.name.charAt(0).toUpperCase() + this.currentWord.name.slice(1)}".`);
        console.log(`Time elapsed: ${this.timeLapsed}s`);
        var l = input.question("(Enter any key to continue)\n>> ");
        this.mainMenu();
      } else {
        if (this.lifelineDefinition == false) {
          this.lifelineDefinition = null;
        }
        console.clear();
        console.log("You've finished this round!");
        console.log(`The word was "${this.currentWord.name.charAt(0).toUpperCase() + this.currentWord.name.slice(1)}".`);
        this.resetRound();
        this.startWord();
      }
      return;
    }
    // Check loss
    if (this.wrongGuesses == 8) {
      this.updateLeaderboard();
      console.log(this.hangmanMan[this.wrongGuesses]);
      console.log(`Better luck next time, you've lost the game with a score of ${this.score}!`);
      console.log(`Your total score is now ${this.totalScore}.`);
      console.log(`The word was "${this.currentWord.name.charAt(0).toUpperCase() + this.currentWord.name.slice(1)}".`);
      console.log(`Time elapsed: ${this.timeLapsed}s`);
      var l = input.question("(Enter any key to continue)\n>> ");
      this.mainMenu();
      return;
    }

    // Display score, word and alphabets
    this.displayWord();

    var guess = input.question(`${this.playerName}'s guess (Enter 9 for lifelines or 0 to pass)\n>> `);
    guess = guess.toLowerCase();

    // Guess other than unguessed alphabets
    if (!this.alphabets.includes(guess)) {
      if (!(guess.length === 1 && guess.match(/[a-z]/i))) {
        if (guess === "9") { // Lifeline
          this.displayLifeline();
          return;
        } else if (guess === "0") { // Pass
          this.forceComplete = true;
          this.startTurn();
          return;
        } else if (guess.length === this.currentWord.name.length && !(guess.match(/[^a-z]/i))) { // Immediate guess
          if (guess === this.currentWord.name) {
            this.forceComplete = true;
            this.startTurn();
            return;
          }
          this.wrongGuesses++;
          console.clear();
          console.log(`Sorry, the word is not "${guess.charAt(0).toUpperCase() + guess.slice(1)}".`);
          this.startTurn();
          return;
        }
        console.clear(); // Invalid guess
        console.log(`Invalid guess: "${guess}".`);
        this.startTurn();
        return;
      }
      console.clear(); // Duplicate guess
      console.log(`You have already guessed "${guess}".`);
      this.startTurn();
      return;
    }

    // Valid character
    const index = this.alphabets.indexOf(guess);
    this.alphabets[index] = " ";
    if (this.currentWord.name.includes(guess)) {
      const indexes = this.currentWord.name
        .split("")
        .map((letter, index) => {
          if (letter === guess) {
            return index;
          }
          return -1;
        })
        .filter((i) => i >= 0);
      indexes.forEach((index) => {
        this.currentWord.guessed[index] = true;
      });
      console.clear();
      console.log(`Well done! ${guess.toUpperCase()} is one of the letters!`);
    } else {
      console.clear();
      console.log(`Sorry, ${guess.toUpperCase()} is not a part of the word.`);
      this.wrongGuesses++;
    }
    this.startTurn();
  }

  displayHangmanTextArt() {
    console.log(`
 _   _    _    _   _  ____ __  __    _    _   _ 
| | | |  / \\  | \\ | |/ ___|  \\/  |  / \\  | \\ | |
| |_| | / _ \\ |  \\| | |  _| |\\/| | / _ \\ |  \\| |
|  _  |/ ___ \\| |\\  | |_| | |  | |/ ___ \\| |\\  |
|_| |_/_/   \\_\\_| \\_|\\____|_|  |_/_/   \\_\\_| \\_|
    `);
  }

  displayWord() {
    console.log(`${this.playerName}'s score is now ${this.score} (Total score: ${this.totalScore})`); // Player score
    console.log(`Word ${this.score + 1} / ${this.numberOfRounds}`); // Word number
    const wordDisplay = this.currentWord.name.split("").map((letter, index) => {
      if (this.currentWord.guessed[index]) {
        return letter.toUpperCase();
      }
      return "_";
    });

    if (this.lifelineDefinition == false) {
      console.log(`Definition: ${this.currentWord.definition}`);
    }
    console.log(`Lives left: ${8 - this.wrongGuesses}`);
    console.log(this.hangmanMan[this.wrongGuesses]);
    console.log(wordDisplay.join(" "));
    console.log("\n");
    console.log(this.alphabets.join(" ").toUpperCase());
    console.log("\n");
  }

  displayLifeline() {
    if (!(this.lifelineVowel || this.lifelineDefinition || this.lifelinePass)) {
      console.clear();
      console.log("No lifelines available!");
      this.startTurn();
      return;
    }
    console.log("Lifelines:");
    if (this.lifelineVowel) {
      console.log("1: Show all vowels");
    }
    if (this.lifelineDefinition) {
      console.log("2: Show word definition");
    }
    if (this.lifelinePass) {
      console.log("3: Pass word and +1 to score");
    }

    var lifeline = input.question("Please enter lifeline:\n>> ");
    if (lifeline === "1" && this.lifelineVowel) {
      const vowels = ["a", "e", "i", "o", "u"];

      // Remove vowels from alphabets
      this.alphabets = this.alphabets.filter(letter => !vowels.includes(letter));

      // Set all vowels as guessed
      this.currentWord.guessed = this.currentWord.guessed.map(
        (_, index) => {
          if (this.currentWord.guessed[index] == false) {
            return vowels.includes(
              this.currentWord.name.charAt(index)
            );
          } else {
            return true;
          }
        }
      );
      console.clear();
      console.log("Used vowel lifeline. \n");
      this.lifelineVowel = false;
      this.startTurn();
    } else if (lifeline === "2" && this.lifelineDefinition) {
      console.clear();
      console.log("Used definition lifeline. \n");
      this.lifelineDefinition = false;
      this.startTurn();
    } else if (lifeline === "3" && this.lifelinePass) {
      this.forceComplete = true;
      this.lifelinePass = false;
      this.startTurn();
    } else {
      console.clear();
      console.log(`Invalid lifeline: "${lifeline}".`);
      this.startTurn();
    }
  }

  resetRound() {
    this.wrongGuesses = 0;
  }

  get totalScore() {
    return this.score + this.existingScore;
  }

  increaseScore() {
    this.score++;
    var scores = JSON.parse(fs.readFileSync("./Hangman/Scores.json", "utf-8"));
    fs.writeFileSync("./Hangman/Scores.json", JSON.stringify({ ...scores, [this.playerName]: this.totalScore }));
  }

  updateLeaderboard() {
    this.initEndTime = new Date();
    this.endTime = this.initEndTime.getTime();
    this.timeLapsed = (((this.endTime - this.startTime) / 1000).toFixed(1)); // Get end date and calculate time elapsed
    if (fs.existsSync("./Hangman/Times.json")) {
      if ((JSON.parse(fs.readFileSync("./Hangman/Times.json", "utf-8"))[this.playerName])) {
        this.existingTime = (JSON.parse(fs.readFileSync("./Hangman/Times.json", "utf-8"))[this.playerName]);
      } else {
        this.existingTime = null;
      }
    } else {
      fs.writeFileSync("./Hangman/Times.json", JSON.stringify({}));
      this.existingTime = null;
    }
    if (this.timeLapsed < this.existingTime || this.existingTime === null) {
      var times = JSON.parse(fs.readFileSync("./Hangman/Times.json", "utf-8"));
      fs.writeFileSync("./Hangman/Times.json", JSON.stringify({ ...times, [this.playerName]: parseFloat(this.timeLapsed) }));
    }
  }

  leaderboards() {
    var str = "";
    var leaderboardTimeObj = JSON.parse(fs.readFileSync("./Hangman/Times.json", "utf-8"));
    var leaderboardTimeArr = Object.entries(leaderboardTimeObj);
    var leaderboardTime = leaderboardTimeArr.sort(function (a, b) {
      return a[1] > b[1] ? 1 : -1;
    });
    console.clear();
    str += `Fastest Time Lapse:\n`
    for (var i = 0; i < leaderboardTime.length; i++) {
      str += `(${i + 1}) ${leaderboardTime[i][0]}: ${leaderboardTime[i][1]}s\n`;
    }
    var leaderboardScoreObj = JSON.parse(fs.readFileSync("./Hangman/Scores.json", "utf-8"));
    var leaderboardScoreArr = Object.entries(leaderboardScoreObj);
    var leaderboardScore = leaderboardScoreArr.sort(function (a, b) {
      return b[1] > a[1] ? 1 : -1;
    });
    str += `\n\nHighest Total Score:\n`
    for (var i = 0; i < leaderboardScore.length; i++) {
      str += `(${i + 1}) ${leaderboardScore[i][0]}: ${leaderboardScore[i][1]}pts\n`;
    }
    var j = input.question(`${str}(Press any key to exit)\n>> `);
    this.mainMenu();
  }

  howToPlay() {
    for (var i = 0; i < howToPlay.length; i++) {
      if (k !== "0") {
        console.clear();
        var k = input.question(`${howToPlay[i]}\nPress any key to continue (Enter 0 to exit)\n>> `);
      } else {
        this.mainMenu();
        return;
      }
    }
    this.mainMenu();
    return;
  }
}

module.exports = WordCollection;