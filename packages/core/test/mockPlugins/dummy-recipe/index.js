class Recipe {
  constructor(environment) {
    this.name = "dummy-recipe";
    this.inputLabels = ["message"];
    this.outputLabels = [];
    this.environmentName = environment.selectedEnvironment;
  }

  async *execute({ inputs }) {
    console.log(`Provided environment name: ${this.environmentName}`);
    console.log(`Provided message: ${inputs.message}`);

    return "Successfully called dummy-recipe:preserve()";
  }
}

Recipe.help = "Dummy Recipe";

module.exports = { Recipe };
