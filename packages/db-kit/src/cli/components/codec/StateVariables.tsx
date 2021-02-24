import React from "react";
import { Box, Text } from "ink";

import type * as Decoder from "@truffle/decoder";
import { Format } from "@truffle/codec";

import { DefinitionList } from "@truffle/db-kit/cli/components/DefinitionList";
import { Value } from "./Value";

export interface Props {
  contract: Format.Types.ContractType;
  variables: Decoder.StateVariable[];
}

export const StateVariables = ({ contract, variables }: Props) => {
  const entries = variables.map((variable, index) => ({
    name: variable.name || `[${index}]`,
    node:
      variable.class.kind === "native" &&
      contract.kind === "native" &&
      variable.class.id !== contract.id ? (
        <Box flexDirection="column">
          <Value result={variable.value} />
          <Text>
            <Text dimColor>defined in: </Text>
            <Text bold>{variable.class.typeName}</Text> (
            {variable.class.typeClass})
          </Text>
        </Box>
      ) : (
        <Value result={variable.value} />
      )
  }));
  return (
    <DefinitionList
      entries={entries}
      spaceBetween={1}
      EntryComponent={({ NameComponent, name, node }) => {
        return (
          <Box flexDirection="column">
            <NameComponent>
              <Text>{name}: </Text>
            </NameComponent>
            <Box marginLeft={2}>{node}</Box>
          </Box>
        );
      }}
      NameComponent={({ children }) => <Text bold>{children}</Text>}
    />
  );
};
