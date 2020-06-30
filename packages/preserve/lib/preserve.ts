import { Loader } from "./targets";
import { Recipe } from "./recipes";

export interface Request {
  loader: string; // package name
  recipe: string; // package name
  settings?: Map<string, any>; // map package name to settings
}

export interface PreserveOptions {
  request: Request;
  loaders: Map<string, Loader>;
  recipes: Map<string, Recipe>;
}

export interface PreserveResult {
  name: string; // recipe package name
  label: any; // recipe label
}

export async function* preserve(
  options: PreserveOptions
): AsyncIterable<PreserveResult> {
  const { request, loaders, recipes } = options;

  if (!("settings" in request)) {
    request.settings = new Map([]);
  }

  assertLoaderExists({
    name: request.loader,
    modules: loaders
  });

  /*
   * setup
   */
  const loader: Loader = loaders.get(request.loader);
  const recipe: Recipe = recipes.get(request.recipe);

  /*
   * loading
   */
  const loaderSettings = request.settings.get(request.loader);
  const target = await loader.load(loaderSettings);

  /*
   * planning
   * (use BFS)
   */
  const visited: Set<string> = new Set([]);
  const queue: string[] = [recipe.name];

  const plan: Recipe[] = [];
  while (queue.length > 0) {
    const current: Recipe = recipes.get(queue.shift());

    assertRecipeExists({
      name: current.name,
      modules: recipes
    });

    plan.unshift(current);

    const unvisited = current.dependencies.filter(
      dependency => !visited.has(dependency)
    );

    for (const name of unvisited) {
      visited.add(name);
      queue.push(name);
    }
  }

  /*
   * execution
   */
  let labels: Map<string, any> = new Map([]);

  for (const recipe of plan) {
    const settings = request.settings.get(recipe.name);

    const label = await recipe.preserve({
      target,
      labels,
      settings
    });

    labels.set(recipe.name, label);

    yield {
      name: recipe.name,
      label
    };
  }
}

type AssertModuleExistsOptions<T extends Loader | Recipe> = {
  name: string;
  kind?: string;
  modules: Map<string, T>;
};

const assertModuleExists = <T extends Loader | Recipe>(
  options: AssertModuleExistsOptions<T>
): void => {
  const { name, kind = "module", modules } = options;

  if (!modules.has(name)) {
    throw new Error(
      `Unknown ${kind} with name ${name}. ` +
        `Possible choices: [${Array.from(modules.keys()).join(", ")}]`
    );
  }
};

const assertLoaderExists = (
  options: Omit<AssertModuleExistsOptions<Loader>, "kind">
): void => assertModuleExists({ ...options, kind: "loader" });

const assertRecipeExists = (
  options: Omit<AssertModuleExistsOptions<Recipe>, "kind">
): void => assertModuleExists({ ...options, kind: "recipe" });
