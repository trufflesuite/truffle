import { asyncToArray } from "iter-tools";

import { Target, Loader, thunk } from "../targets";
import { Recipe } from "../recipes";
import { PreserveOptions, preserve } from "../preserve";

const simpleTarget: Target = {
  source: "hello, world!"
};

const simpleLoader: Loader = {
  name: "simple-loader",

  async load() {
    return simpleTarget;
  }
};

const vowelsRecipe: Recipe = {
  name: "vowels-recipe",

  dependencies: [],

  async preserve({ target }): Promise<{ vowels: string }> {
    const vowels = new Set(["a", "e", "i", "o", "u"]);

    // for testing purposes, this only handles the case of a Content target
    // (no Containers)
    const source = (await thunk(target)).source as string;

    return {
      vowels: source
        .split("")
        .filter(character => vowels.has(character))
        .join("")
    };
  }
};

const vowelsCounterRecipe: Recipe = {
  name: "vowels-counter-recipe",

  dependencies: [vowelsRecipe.name],

  async preserve({ labels }): Promise<{ count: number }> {
    const { vowels } = labels.get(vowelsRecipe.name) as { vowels: string };

    return {
      count: vowels.length
    };
  }
};

const mapByName = <T extends { name: string }>(entities: T[]): Map<string, T> =>
  new Map(entities.map(entity => [entity.name, entity]));

const loaders: PreserveOptions["loaders"] = mapByName([simpleLoader]);

const recipes: PreserveOptions["recipes"] = mapByName([
  vowelsRecipe,
  vowelsCounterRecipe
]);

it("preserves via a single recipe", async () => {
  const jars = await asyncToArray(
    preserve({
      request: {
        loader: simpleLoader.name,
        recipe: vowelsRecipe.name
      },
      loaders,
      recipes
    })
  );

  expect(jars).toHaveLength(1);
  const jar = jars[0];

  expect(jar).toEqual({
    name: vowelsRecipe.name,
    label: {
      vowels: "eoo"
    }
  });
});

it("preserves via a recipe that depends on another recipe", async () => {
  const jars = await asyncToArray(
    preserve({
      request: {
        loader: simpleLoader.name,
        recipe: vowelsCounterRecipe.name
      },
      loaders,
      recipes
    })
  );

  expect(jars).toHaveLength(2);

  {
    // vowels-recipe
    const jar = jars[0];

    expect(jar).toEqual({
      name: vowelsRecipe.name,
      label: {
        vowels: "eoo"
      }
    });
  }

  {
    // vowels-counter-recipe
    const jar = jars[1];

    expect(jar).toEqual({
      name: vowelsCounterRecipe.name,
      label: {
        count: 3
      }
    });
  }
});
