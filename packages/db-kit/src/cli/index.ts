import React from "react";
import { render } from "ink";
import meow from "meow";

import { App } from "./App";

const cli = meow(
  `
    Usage
      $ db-kit

      Options
        --network  Name of network to connect to
        --config Path to configuration file
`,
  {
    flags: {
      network: {
        type: "string"
      },
      config: {
        type: "string"
      }
    }
  }
);

export async function start() {
  const { network: name, config: configPath } = cli.flags;

  const { waitUntilExit } = render(
    React.createElement(App, {
      network: {
        name
      },
      configPath
    })
  );

  await waitUntilExit();
}
