class Recipe {
  static help = "Dummy Recipe";

  name = "dummy-recipe";
  dependencies = [];

  constructor(environment) {
    this.address = environment.address;
  }

  async *preserve({ controls }) {
    yield* controls.log({ message: `Provided address: ${this.address}` });
    return "Successfully called dummy-recipe:preserve()";
  }
}

module.exports = { Recipe };
