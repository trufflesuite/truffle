import util from "util";

import React, { useState, useEffect } from "react";
import { Box, Text, Newline, useApp } from "ink";
import Spinner from "ink-spinner";

import type { Resources } from "@truffle/db";

import { useConfig, useDb, DbNotEnabledError } from "./hooks";
import { Header, ActivationInstructions } from "./components";
import { Menu } from "./menu";

export interface Props {
  network?: Pick<Resources.Resource<"networks">, "name">;
  configPath?: string;
}

export const App = ({
  network = {
    name: "development"
  },
  configPath
}: Props) => {
  const { exit } = useApp();
  const [shouldQuit, setShouldQuit] = useState<boolean>(false);

  const config = useConfig({ network, configPath });
  const { db, project, error } = useDb({ config });

  useEffect(() => {
    if (shouldQuit) {
      exit();
    }
  });

  return (
    <Box flexDirection="column">
      <Header />
      {!error &&
      project &&
      db &&
      config && ( // success case
          <Menu
            config={config}
            db={db}
            project={project}
            onDone={() => setShouldQuit(true)}
          />
        )}
      {!error &&
      !(project && db && config) && ( // still loading case
          <Text>
            <Text color="green">
              <Spinner />
            </Text>
            {" Reading truffle-config and connecting to network..."}
          </Text>
        )}
      {
        error && error instanceof DbNotEnabledError && (
          <ActivationInstructions />
        ) // specific error case
      }
      {error &&
      !(error instanceof DbNotEnabledError) && ( // unknown error case
          <Text>
            <Newline />
            <Text color="red" bold>
              Unhandled exception:{" "}
            </Text>
            <Text>{util.inspect(error)}</Text>
          </Text>
        )}
    </Box>
  );
};
