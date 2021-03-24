class Recipe {
  constructor() {
    this.name = "dummy-loader";
    this.inputLabels = ["path"];
    this.outputLabels = ["message"];
  }

  async *execute({ inputs }) {
    console.log(`Provided path: ${inputs.path}`);
    return { message: "Hello World!" };
  }
}

Recipe.help = "Dummy Loader";

module.exports = { Recipe };
