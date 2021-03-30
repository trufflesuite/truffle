import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { Transaction, TransactionReceipt } from "web3-core";
import type TruffleConfig from "@truffle/config";
import type { WireDecoder } from "@truffle/decoder";
import type { Db, Project } from "@truffle/db";

import { Definitions, Mode } from "./types";

import * as DecodeAddress from "@truffle/db-kit/cli/decodeAddress";
import * as DecodeTransaction from "@truffle/db-kit/cli/decodeTransaction";

export interface MenuProps {
  config: TruffleConfig;
  db: Db;
  project: Project.Project;
  onDone: () => void;
}

export type MenuModes = {
  "decode-transaction": {
    producesEffect: false;
    rendersComponent: true;
    inputProps: {
      transactionHash: string;
      transaction: Transaction;
      receipt: TransactionReceipt;
      addresses: string[];
    };
    screenProps: {
      decoder: WireDecoder;
    };
  };
  "decode-address": {
    producesEffect: false;
    rendersComponent: true;
    inputProps: {
      address: string;
    };
    screenProps: {
      decoder: WireDecoder;
    };
    inputPropName: "address";
  };
  quit: {
    rendersComponent: false;
    producesEffect: true;
  };
};

export type MenuConfig = {
  props: MenuProps;
  modes: MenuModes;
};

export const definitions: Definitions<MenuConfig> = {
  "decode-transaction": {
    label: "Decode transaction",
    components: DecodeTransaction
  },
  "decode-address": {
    label: "Decode contract address",
    components: DecodeAddress
  },
  "quit": {
    label: "Quit",
    effect: ({ onDone }) => {
      onDone();
    }
  }
};

export const Menu = (props: MenuProps) => {
  const { config, db, project, onDone } = props;
  const [mode, setMode] = useState<"wait" | Mode.Name<MenuConfig>>("wait");

  const handleSelect = ({ value }) => {
    setMode(value);
  };

  const [element, setElement] = useState<React.ReactElement | null>(null);
  const [inputProps, setInputProps] = useState<
    Mode.InputProps<MenuConfig, Mode.Name<MenuConfig>> | undefined
  >(undefined);

  useEffect(() => {
    setInputProps(undefined);
  }, [mode]);

  useEffect(() => {
    const definition = definitions[mode];

    if (mode === "wait") {
      setElement(<></>);
      return;
    }

    if (Mode.producesEffect(definition)) {
      definition.effect({ config, db, project, onDone });
    }

    if (Mode.rendersComponent(definition)) {
      const { Inputs, Container, Screen } = definition.components;

      setElement(
        <Box flexDirection="column">
          <Inputs {...props} {...inputProps} onSubmit={setInputProps} />
          {inputProps && (
            <Container Screen={Screen} {...props} {...inputProps} />
          )}
        </Box>
      );
    }
  }, [config, db, onDone, project, props, mode, inputProps]);

  const selectItems =
    mode === "wait"
      ? Object.entries(definitions).map(([value, { label }]) => ({
          label,
          value
        }))
      : Object.entries(definitions)
          .map(([value, { label }]) => ({ label, value }))
          .filter(({ value }) => value === mode);

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginY={1}>
        <Text>Please select:</Text>
        <SelectInput
          isFocused={mode === "wait"}
          items={selectItems}
          onSelect={handleSelect}
        />
      </Box>
      {element}
    </Box>
  );
};
