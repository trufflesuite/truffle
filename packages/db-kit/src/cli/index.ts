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
`,
  {
    flags: {
      network: {
        type: "string"
      }
    }
  }
);

export async function start() {
  const { network: name } = cli.flags;

  const { waitUntilExit } = render(
    React.createElement(App, {
      network: {
        name
      }
    })
  );

  await waitUntilExit();
}
