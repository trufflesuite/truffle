const Recipe = {
  name: "dummy-recipe",
  dependencies: [],

  preserve() {
    return "Successfully called dummy-recipe:preserve()";
  }
};

module.exports = { Recipe };
