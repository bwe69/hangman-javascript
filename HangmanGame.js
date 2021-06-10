const fs = require('fs');
const wordData = fs.readFileSync("./Hangman/WordBank.tsv", "utf-8");
const wordBank = wordData.split("\n").reduce((acc, curr) => {
  const tab = curr.split("	");
  if (!acc[tab[2]]) {
    acc[tab[2]] = [];
  }
  acc[tab[2]].push({
    name: tab[0],
    definition: tab[1]
  });
  return acc;
}, {});

const WordCollection = require("./WordCollection.js");
const hangmanMan = require("./HangmanMan.js");

const wordCollection = new WordCollection(wordBank, hangmanMan);

// Start game
wordCollection.mainMenu();