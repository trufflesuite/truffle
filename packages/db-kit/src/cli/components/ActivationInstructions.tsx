import path from "path";

import React from "react";
import { Newline, Box, Text } from "ink";
import SyntaxHighlight from "ink-syntax-highlight";

import TruffleConfig from "@truffle/config";

const simpleInstructions = `module.exports = {
  // ... rest of truffle-config.js ...
  db: {
    enabled: true
  }
};`;

const customInstructions = `module.exports = {
  // ... rest of truffle-config.js ...
  db: {
    enabled: true,
    adapter: {
      name: "sqlite",
      settings: {
        directory: ".db"
      }
    }
  }
};`;

const defaultDirectory = path.join(
  TruffleConfig.getTruffleDataDirectory(),
  ".db"
);

export const ActivationInstructions = () => (
  <Box flexDirection="column">
    <Box justifyContent="center" marginY={1}>
      <Text>...</Text>
    </Box>
    <Text>
      <Text color="red" bold>
        Error:{" "}
      </Text>
      <Text>This toolkit requires you to enable @truffle/db.</Text>
    </Text>
    <Text bold>Please add the following to your truffle-config.js:</Text>
    <Box flexDirection="column" marginY={1} marginX={2}>
      <Text>
        <Text color="gray">``` </Text>
        <Text italic bold>
          truffle-config.js:{" "}
        </Text>
        <Text italic>Normal configuration</Text>
      </Text>
      <SyntaxHighlight language="javascript" code={simpleInstructions} />
      <Text color="gray">```</Text>
    </Box>
    <Text>
      By default, @truffle/db stores information for all your Truffle projects
      in one place. For your current user, this will be directory:
    </Text>
    <Text bold> {defaultDirectory}</Text>
    <Text>
      <Newline />
      If you'd like to configure @truffle/db to store each project separately,
      add this to your truffle-config.js instead:
    </Text>
    <Box flexDirection="column" marginY={1} marginX={2}>
      <Text>
        <Text color="gray">``` </Text>
        <Text italic bold>
          truffle-config.js:{" "}
        </Text>
        <Text italic>Custom persistence location</Text>
      </Text>
      <SyntaxHighlight language="javascript" code={customInstructions} />
      <Text color="gray">```</Text>
    </Box>
    <Text bold>
      Once you've added this, please re-run this same command. Thank you!
    </Text>
  </Box>
);
