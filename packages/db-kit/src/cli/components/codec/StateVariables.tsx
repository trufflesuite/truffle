import util from "util";
import React, { useState, useEffect } from "react";
import { Box, Newline, Text, Static, useApp } from "ink";
import { UncontrolledTextInput } from "ink-text-input";
import Spinner from "ink-spinner";
import Divider from "ink-divider";

import type { Transaction, TransactionReceipt } from "web3-core";
import type * as Decoder from "@truffle/decoder";
import { Format, FunctionDecoding } from "@truffle/codec";
import type { Provider } from "web3/providers";
import type TruffleConfig from "@truffle/config";
import type { Db, Resources } from "@truffle/db";

import { DefinitionList } from "@truffle/db-kit/cli/components/DefinitionList";
import { Value } from "./Value";

export interface Props {
  contract: Format.Types.ContractType;
  variables: Decoder.StateVariable[];
}

export const StateVariables = ({
  contract,
  variables
}: Props) => {
  const entries = variables.map((variable, index) => ({
    name: variable.name || `[${index}]`,
    node: (
      variable.class.kind === "native" &&
      contract.kind === "native" &&
      variable.class.id !== contract.id
    )
      ? <Box flexDirection="column">
          <Value result={variable.value} />
          <Text>
            <Text dimColor>defined in: </Text>
            <Text bold>{variable.class.typeName}</Text>
            {" "}({variable.class.typeClass})
          </Text>
        </Box>
      : <Value result={variable.value} />
  }));
  return <DefinitionList
    entries={entries}
    spaceBetween={1}
    entryComponent={({ width, nameComponent, name, node }) => {
      // const divider = () => <Text>{"─".repeat(Math.max(0,width-2))}</Text>;
      return (
        <Box flexDirection="column">
          {nameComponent({ children: <Text>{name}: </Text> })}
          <Box marginLeft={2}>
            {node}
          </Box>
        </Box>
      );
    }}
    nameComponent={({ children }) => <Text bold>{children}</Text>} />;
};
