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
}

export const App = ({
  network = {
    name: "development"
  }
}: Props) => {
  const { exit } = useApp();
  const [shouldQuit, setShouldQuit] = useState<boolean>(false);

  const config = useConfig({ network });
  const { db, project, error } = useDb({ config });

  useEffect(() => {
    if (shouldQuit) {
      exit();
    }
  });

  let element = <></>;

  if (!error && project && db && config) {
    element = (
      <Menu
        config={config}
        db={db}
        project={project}
        onDone={() => setShouldQuit(true)}
      />
    );
  } else if (!error) {
    element = (
      <Text>
        <Text color="green">
          <Spinner />
        </Text>
        {" Reading truffle-config and connecting to network..."}
      </Text>
    );
  } else if (error instanceof DbNotEnabledError) {
    element = <ActivationInstructions />;
  } else {
    element = (
      <Text>
        <Newline />
        <Text color="red" bold>
          Unhandled exception:{" "}
        </Text>
        <Text>{util.inspect(error)}</Text>
      </Text>
    );
  }

  return (
    <Box flexDirection="column">
      <Header />
      {element}
    </Box>
  );
};
