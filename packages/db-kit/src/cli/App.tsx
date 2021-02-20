import React, { useState, useEffect } from "react";
import { Box, Text, Static, useApp } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";

import type { Resources } from "@truffle/db";

import { useConfig, useDb } from "./hooks";
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
  const { db, project } = useDb({ config });

  useEffect(() => {
    if (shouldQuit) {
      exit();
    }
  });

  if (!config || !db || !project) {
    return <Text>
      <Text color="green"><Spinner /></Text>
      {' Reading truffle-config and connecting to network...'}
    </Text>;
  }

  return <Menu
    config={config}
    db={db}
    project={project}
    onDone={() => setShouldQuit(true)} />;
}
