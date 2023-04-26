import React, { ReactNode, useState, useEffect } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { Transaction, TransactionReceipt } from "web3-types";
import type TruffleConfig from "@truffle/config";
import type { Db, Project } from "@truffle/db";

import type { Definitions, ModeInputProps, ModeName } from "./types";

import * as DecodeAddress from "@truffle/db-kit/cli/decodeAddress";
import * as DecodeTransaction from "@truffle/db-kit/cli/decodeTransaction";

export interface Props {
  config: TruffleConfig;
  db: Db;
  project: Project.Project;
  onDone: () => void;
}

export type MenuModes = {
  "decode-transaction": {
    producesEffect: false;
    rendersComponent: true;
    props: Props & {
      transactionHash: string;
      transaction: Transaction;
      receipt: TransactionReceipt;
      addresses: string[];
    };
    inputPropName: "transactionHash" | "transaction" | "receipt" | "addresses";
  };
  "decode-address": {
    producesEffect: false;
    rendersComponent: true;
    props: Props & {
      address: string;
    };
    inputPropName: "address";
  };
  "quit": {
    rendersComponent: false;
    producesEffect: true;
    props: Props;
  };
};

export const definitions: Definitions<MenuModes> = {
  "decode-transaction": {
    label: "Decode transaction",
    PropsInputComponent: DecodeTransaction.Inputs,
    ScreenComponent: DecodeTransaction.Splash
  },
  "decode-address": {
    label: "Decode contract address",
    PropsInputComponent: DecodeAddress.Inputs,
    ScreenComponent: DecodeAddress.Splash
  },
  "quit": {
    label: "Quit",
    effect: ({ onDone }) => {
      onDone();
    }
  }
};

export const Menu = (props: Props) => {
  const { config, db, project, onDone } = props;
  const [mode, setMode] = useState<"wait" | ModeName<MenuModes>>("wait");

  const handleSelect = ({ value }) => {
    setMode(value);
  };

  const [element, setElement] = useState<ReactNode>(null);
  const [inputProps, setInputProps] = useState<
    ModeInputProps<MenuModes, ModeName<MenuModes>> | undefined
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

    if (definition.effect) {
      definition.effect({ config, db, project, onDone });
    }

    if (definition.ScreenComponent) {
      const { PropsInputComponent, ScreenComponent } = definition;

      setElement(
        <Box flexDirection="column">
          <PropsInputComponent
            {...props}
            {...inputProps}
            onSubmit={setInputProps}
          />
          {inputProps && <ScreenComponent {...props} {...inputProps} />}
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
