class Recipe {
  constructor(environment) {
    this.name = "dummy-recipe";
    this.dependencies = [];
    this.environmentName = environment.selectedEnvironment;
  }

  async *preserve({ controls }) {
    yield* controls.log({
      message: `Provided environment name: ${this.environmentName}`
    });
    return "Successfully called dummy-recipe:preserve()";
  }
}

Recipe.help = "Dummy Recipe";

module.exports = { Recipe };
