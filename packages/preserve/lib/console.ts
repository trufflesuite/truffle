import chalk from "chalk";
import Spinnies from "spinnies";

import { preserve } from "./preserve";
import { Recipe } from "./recipes";
import { Scopes, Events } from "./recipes/logs";
import { Loader } from "./targets";

export interface ConsolePreserveOptions {
  // only works with @truffle/preserve-fs for now
  request: {
    path: string;
    recipe: string;
  };

  recipes: Map<string, Recipe>;
  loaders: Map<string, Loader>;
  console: Console;
}

export const consolePreserve = async (
  options: ConsolePreserveOptions
): Promise<void> => {
  const {
    recipes,
    loaders,
    console,
    request: { path, recipe }
  } = options;

  const spinners = new Spinnies();

  console.log();
  const message = `Preserving target: ${path}`;
  console.log(message);
  console.log("=".repeat(message.length));

  const events = preserve({
    recipes,
    loaders,
    request: {
      recipe,
      loader: "@truffle/preserve-fs",
      settings: new Map([["@truffle/preserve-fs", { path }]])
    }
  });

  for await (const event of events) {
    const { type, scope } = event;
    const key = Scopes.toKey(scope);

    switch (type) {
      case "begin": {
        console.log();

        spinners.add(key, {
          succeedColor: "white",
          indent: scope.length * 2
        });
        break;
      }

      case "update": {
        const { message } = event as Events.Update;
        spinners.update(key, {
          text: `${message}`
        });
        break;
      }

      case "succeed": {
        const { label, message } = event as Events.Succeed;

        const options = message ? { text: message } : {};

        spinners.succeed(key, options);
        break;
      }

      case "fail": {
        const { error } = event as Events.Fail;
        spinners.fail(key, { text: error.toString() });
        break;
      }

      case "declare": {
        const { message } = event as Events.Declare;
        spinners.add(key, {
          text: message,
          indent: scope.length * 2,
          succeedColor: "white"
        });
        break;
      }
    }
  }

  console.log();
};
