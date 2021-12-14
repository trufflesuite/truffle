import util from "util";

import React, { useState, useEffect } from "react";
import { Box, Text, Newline, useApp } from "ink";
import Spinner from "ink-spinner";

import type { Resources } from "@truffle/db";

import { useConfig, useDb, DbNotEnabledError } from "./hooks";
import { Header, ActivationInstructions } from "./components";
import { Menu, MenuItem } from "./components/Menu";

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
  const [shouldQuit, _setShouldQuit] = useState<boolean>(false);
  const [_mode, setMode] = useState<string>("loading");

  const config = useConfig({ network, configPath });
  const { db, project, error } = useDb({ config });

  function changeMode(newMode: string): void {
    setMode(newMode);
  }

  useEffect(() => {
    if (shouldQuit) {
      exit();
      process.exit();
    }
  });

  return (
    <Box flexDirection="column">
      <Header />
      <Menu onEnterPress={changeMode}>
        <MenuItem mode="address">Address</MenuItem>
        <MenuItem mode="contract">Contract</MenuItem>
        <MenuItem mode="Mapping">Mapping</MenuItem>
      </Menu>

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
