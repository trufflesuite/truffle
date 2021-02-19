class Recipe {
  static help = "Dummy Recipe";

  name = "dummy-recipe";
  dependencies = [];

  constructor(environment) {
    this.environmentName = environment.selectedEnvironment;
  }

  async *preserve({ controls }) {
    yield* controls.log({
      message: `Provided environment name: ${this.environmentName}`
    });
    return "Successfully called dummy-recipe:preserve()";
  }
}

module.exports = { Recipe };
