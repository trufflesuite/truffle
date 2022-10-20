import type { Recipe } from "./recipes";
import { control, Event } from "./control";
const TruffleError = require("@truffle/error");

export interface Request {
  recipe: Recipe;
  settings?: Map<string, any>; // map package name to settings
  inputs?: any;
}

export interface PreserveOptions {
  request: Request;
  recipes: Recipe[]; // List of all recipes
}

export async function* preserve(
  options: PreserveOptions
): AsyncIterable<Event> {
  const { request, recipes } = options;
  const { recipe } = request;

  if (!("settings" in request)) {
    request.settings = new Map([]);
  }

  if (!("inputs" in request)) {
    request.inputs = {};
  }

  const inputLabels = Object.keys(request.inputs);

  /*
   * planning
   * (use BFS)
   */
  const queue: Recipe[] = [recipe];
  let plan: Recipe[] = [];

  while (queue.length > 0) {
    const current = queue.shift();

    plan.unshift(current!);

    for (const label of current!.inputLabels) {
      const plugin = getRecipeForLabel(label, inputLabels, recipes);
      if (plugin) queue.push(plugin);
    }
  }

  // Filter out duplicates afterwards so that we only keep the first occurrence of the plugin
  plan = plan.filter(
    (plugin, index) =>
      index === plan.findIndex(other => other.name === plugin.name)
  );

  /*
   * execution
   */

  // Populate initial preserve inputs with provided inputs
  let inputs = { ...request.inputs };

  for (const recipe of plan) {
    const settings = request.settings?.get(recipe.name) || {};

    const { name } = recipe;
    const method = recipe.execute.bind(recipe);

    const results = yield* control({ name, method }, { inputs, settings });

    // Add all result key + values to the inputs object for the next plugin
    for (const [key, value] of Object.entries(results || {})) {
      inputs[key] = value;
    }
  }
}

const getRecipeForLabel = (
  label: string,
  inputLabels: string[],
  plugins: Recipe[]
) => {
  // If the label exists in the initial inputLabels it is provided without recipe
  if (inputLabels.includes(label)) return;

  const pluginsForLabel = plugins.filter(plugin =>
    plugin.outputLabels.includes(label)
  );

  if (pluginsForLabel.length === 0) {
    throw new TruffleError(
      `No plugins found that output the label "${label}".`
    );
  }

  if (pluginsForLabel.length > 1) {
    console.warn(
      `Warning: multiple plugins found that output the label "${label}".`
    );
  }

  const [plugin] = pluginsForLabel;

  return plugin;
};
