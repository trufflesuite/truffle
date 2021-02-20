import util from "util";
import React, { useState, useEffect } from "react";
import { Box, Newline, Text, Static, useApp } from "ink";
import { UncontrolledTextInput } from "ink-text-input";
import Spinner from "ink-spinner";
import Divider from "ink-divider";

import type { Transaction, TransactionReceipt } from "web3-core";
import type { WireDecoder } from "@truffle/decoder";
import { Format, FunctionDecoding } from "@truffle/codec";
import type { Provider } from "web3/providers";
import type TruffleConfig from "@truffle/config";
import type { Db, Resources } from "@truffle/db";

import { DefinitionList } from "@truffle/db-kit/cli/components/DefinitionList";
import { Arguments } from "./Arguments";

export interface Props {
  decoding: FunctionDecoding;
  transaction: Transaction;
  receipt: TransactionReceipt;
}

export const Function = ({
  decoding,
  transaction
}: Props) => {
  const entries = [
    {
      name: "Kind",
      node: <Text bold>Function call</Text>
    },
    {
      name: "To",
      node: <Text>
        <Text bold>{transaction.to}</Text>
        <Newline />
        <Text bold>{decoding.class.typeName}</Text> ({decoding.class.typeClass})
      </Text>
    },
    {
      name: "Function",
      node: <Box flexDirection="column">
        <Text>
          <Text bold>{decoding.abi.name}</Text>
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
