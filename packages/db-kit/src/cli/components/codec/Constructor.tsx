import React from "react";
import { Box, Text, Newline } from "ink";

import type { Transaction, TransactionReceipt } from "web3-core";
import { ConstructorDecoding } from "@truffle/codec";

import { DefinitionList } from "@truffle/db-kit/cli/components/DefinitionList";
import { Arguments } from "./Arguments";

export interface Props {
  decoding: ConstructorDecoding;
  transaction: Transaction;
  receipt: TransactionReceipt;
}

export const Constructor = ({
  decoding,
  receipt
}: Props) => {
  const entries = [
    {
      name: "Kind",
      node: <Text bold>Contract creation</Text>
    },
    {
      name: "Created",
      node: <Text>
        <Text bold>{receipt.contractAddress}</Text>
        <Newline />
        <Text bold>{decoding.class.typeName}</Text> ({decoding.class.typeClass})
      </Text>
    },
    {
      name: "Constructor",
      node: <Box flexDirection="column">
        <Text>
          <Text bold>constructor</Text>
          <Text>(</Text>
        </Text>
        <Box paddingLeft={2}>
          <Arguments args={decoding.arguments} />
        </Box>
        <Text>)</Text>
      </Box>
    }
  ];

  return <DefinitionList entries={entries} spaceBetween={1} />
};
