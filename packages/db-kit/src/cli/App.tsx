import util from "util";

import React, { useState, useEffect } from "react";
import { Box, Text, Newline, useApp, Spacer } from "ink";
import Spinner from "ink-spinner";

import type { Resources } from "@truffle/db";

import { useConfig, useDb, DbNotEnabledError } from "./hooks";
import { Header, ActivationInstructions } from "./components";
import { Footer } from "./components/Footer";
import { Menu, MenuItem } from "./components/Menu";
import { ScreenRouter, Screen } from "./components/ScreenRouter";
import { brandColors } from "./brandColors";

const { truffleBrown } = brandColors;
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
  const defaultMode = "menu";
  const [mode, setMode] = useState<string>(defaultMode);

  const config = useConfig({ network, configPath });
  const { db, project, error } = useDb({ config });

  function changeMode(newMode: string): void {
    setMode(newMode);
  }

  function returnToMenu() {
    changeMode(defaultMode);
  }

  useEffect(() => {
    if (!error && !(project && db && config)) {
      setMode("loading");
    } else if (error) {
      if (error instanceof DbNotEnabledError) {
        setMode("error-DbNotEnabled");
      } else {
        setMode("error-default");
      }
    } else {
      setMode("menu");
    }
  }, [error, project, db, config]);

  return (
    <Box
      paddingLeft={1}
      paddingRight={1}
      flexDirection="column"
      borderStyle={"round"}
      borderColor={truffleBrown}
    >
      <Header />
      <Box height={6} marginTop={1} flexDirection="column">
        <ScreenRouter mode={mode}>
          <Screen mode="menu">
            <Menu onEnterPress={changeMode}>
              <MenuItem mode="address">Address</MenuItem>
              <MenuItem mode="contract">Contract</MenuItem>
              <MenuItem mode="Mapping">Mapping</MenuItem>
            </Menu>
          </Screen>
          <Screen mode="loading">
            <Text>
              <Text color="green">
                <Spinner />
              </Text>
              {" Reading truffle-config and connecting to network..."}
            </Text>
          </Screen>
          <Screen mode="error-DbNotEnabled">
            <ActivationInstructions />
          </Screen>
          <Screen mode="error-default">
            <Text>
              <Newline />
              <Text color="red" bold>
                Unhandled exception:{" "}
              </Text>
              <Text>{util.inspect(error)}</Text>
            </Text>
          </Screen>
        </ScreenRouter>

        <Spacer />
        <Footer returnToMenu={returnToMenu} />
      </Box>
    </Box>
  );
};
