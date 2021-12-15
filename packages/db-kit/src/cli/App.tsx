import util from "util";

import React, { useState, useEffect } from "react";
import { Box, Text, Newline, Spacer } from "ink";
import { useConfig, useDb, DbNotEnabledError } from "./hooks";
import {
  ActivationInstructions,
  Footer,
  Header,
  LoadingSpinner,
  Menu,
  MenuItem,
  ScreenRouter,
  Screen,
  Transaction
} from "./components";
import { brandColors } from "./brandColors";

import type { Resources } from "@truffle/db";

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
      <Box minHeight={6} marginTop={1} flexDirection="column">
        <ScreenRouter mode={mode}>
          <Screen mode="menu">
            <Menu onEnterPress={changeMode}>
              <MenuItem mode="transaction">Transaction</MenuItem>
              <MenuItem mode="contract">Contract</MenuItem>
              <MenuItem mode="mapping">Mapping</MenuItem>
            </Menu>
          </Screen>
          <Screen mode="transaction">
            <Transaction config={config} db={db} project={project} />
          </Screen>
          <Screen mode="loading">
            <LoadingSpinner
              message={"Reading truffle-config and connecting to network..."}
            />
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
