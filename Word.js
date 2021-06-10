class Word {
  constructor(name, definition, category) {
    this.name = name;
    this.definition = definition;
    this.category = category;
    this.guessed = Array(name.length).fill(false);
  }
}

module.exports = Word;
