import { Process, Recipe } from "../lib";
import { ValueResolutionController } from "../lib/control";

export const simpleTarget = "hello, world!";

export const simpleLoader: Recipe = {
  name: "simple-loader",

  inputLabels: [],
  outputLabels: ["string"],

  async *execute() {
    return { string: simpleTarget };
  }
};

export const vowelsRecipe: Recipe = {
  name: "vowels-recipe",

  inputLabels: ["string"],
  outputLabels: ["vowels"],

  async *execute({ inputs, controls }): Process<{ vowels: string }> {
    const { update, step } = controls;
    yield* update({ message: "Filtering vowels..." });

    const vowels = new Set(["a", "e", "i", "o", "u"]);

    const finalize = yield* step({
      identifier: "finalize",
      message: "Finalizing string..."
    });

    yield* finalize.succeed();

    return {
      vowels: (inputs.string as string)
        .split("")
        .filter(character => vowels.has(character))
        .join("")
    };
  }
};

export const vowelsCounterRecipe: Recipe = {
  name: "vowels-counter-recipe",

  inputLabels: ["vowels"],
  outputLabels: ["vowels-count"],

  async *execute({ inputs, controls }): Process<{ "vowels-count": number }> {
    const { update, declare } = controls;

    yield* update({ message: "Counting vowels..." });

    const allVowels = ["a", "e", "i", "o", "u"];

    const valueResolutions: { [vowel: string]: ValueResolutionController } = {};
    for (const vowel of allVowels) {
      valueResolutions[vowel] = yield* declare({
        identifier: vowel,
        message: `# of ${vowel}'s`
      });
    }

    const { vowels } = inputs;

    const counts = allVowels
      .map(vowel => ({ [vowel]: { count: 0 } }))
      .reduce((a, b) => ({ ...a, ...b }), {});

    for (const vowel of vowels) {
      counts[vowel].count++;
    }

    for (const [vowel, valueResolution] of Object.entries(valueResolutions)) {
      yield* valueResolution.resolve({
        resolution: counts[vowel]
      });
    }

    return {
      "vowels-count": vowels.length
    };
  }
};

export const expectedEventsForVowelsRecipe = [
  {
    type: "begin",
    scope: ["simple-loader"]
  },
  {
    type: "succeed",
    scope: ["simple-loader"],
    result: { string: "hello, world!" }
  },
  {
    type: "begin",
    scope: ["vowels-recipe"]
  },
  {
    type: "update",
    scope: ["vowels-recipe"],
    message: "Filtering vowels..."
  },
  {
    type: "step",
    scope: ["vowels-recipe", "finalize"],
    message: "Finalizing string..."
  },
  {
    type: "succeed",
    scope: ["vowels-recipe", "finalize"]
  },
  {
    type: "succeed",
    scope: ["vowels-recipe"],
    result: { vowels: "eoo" }
  }
];

export const expectedEventsForVowelsCounterRecipe = [
  {
    type: "begin",
    scope: ["vowels-counter-recipe"]
  },
  {
    type: "update",
    scope: ["vowels-counter-recipe"],
    message: "Counting vowels..."
  },
  {
    type: "declare",
    scope: ["vowels-counter-recipe", "a"],
    message: "# of a's"
  },
  {
    type: "declare",
    scope: ["vowels-counter-recipe", "e"],
    message: "# of e's"
  },
  {
    type: "declare",
    scope: ["vowels-counter-recipe", "i"],
    message: "# of i's"
  },
  {
    type: "declare",
    scope: ["vowels-counter-recipe", "o"],
    message: "# of o's"
  },
  {
    type: "declare",
    scope: ["vowels-counter-recipe", "u"],
    message: "# of u's"
  },
  {
    type: "resolve",
    scope: ["vowels-counter-recipe", "a"],
    resolution: { count: 0 }
  },
  {
    type: "resolve",
    scope: ["vowels-counter-recipe", "e"],
    resolution: { count: 1 }
  },
  {
    type: "resolve",
    scope: ["vowels-counter-recipe", "i"],
    resolution: { count: 0 }
  },
  {
    type: "resolve",
    scope: ["vowels-counter-recipe", "o"],
    resolution: { count: 2 }
  },
  {
    type: "resolve",
    scope: ["vowels-counter-recipe", "u"],
    resolution: { count: 0 }
  },
  {
    type: "succeed",
    scope: ["vowels-counter-recipe"],
    result: { "vowels-count": 3 }
  }
];
