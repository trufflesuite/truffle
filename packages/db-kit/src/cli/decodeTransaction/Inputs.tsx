import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { UncontrolledTextInput } from "ink-text-input";
import Spinner from "ink-spinner";
import Divider from "ink-divider";
import type { Transaction, TransactionReceipt } from "web3-core";
import type TruffleConfig from "@truffle/config";

import { useTransactionInfo } from "./useTransactionInfo";

export interface Props {
  config: TruffleConfig;
  onSubmit: (inputProps: {
    transactionHash: string;
    transaction: Transaction;
    receipt: TransactionReceipt;
    addresses: string[];
  }) => void;
}

export const DecodeTransactionInputs = ({
  config,
  onSubmit
}: Props) => {
  const [transactionHash, setTransactionHash] = useState<string | undefined>();
  const { transaction, receipt, addresses } = useTransactionInfo({
    config, transactionHash
  });

  useEffect(() => {
    if (transactionHash && transaction && receipt && addresses) {
      onSubmit({
        transactionHash,
        transaction,
        receipt,
        addresses
      });
    }
  }, [transaction, addresses]);

  const spinners = [
    ...(!transactionHash || transaction
      ? []
      : [
          <Box key="transaction">
            <Box paddingLeft={1} paddingRight={1}>
              <Text color="green"><Spinner /></Text>
            </Box>
            <Text>Reading transaction...</Text>
          </Box>
        ]
    ),
    ...(!transactionHash || receipt
      ? []
      : [
          <Box key="receipt">
            <Box paddingLeft={1} paddingRight={1}>
              <Text color="green"><Spinner /></Text>
            </Box>
            <Text>Reading transaction receipt...</Text>
          </Box>
        ]
    ),
  ];

  return <Box flexDirection="column">
    <Text>
      <Text bold>tx hash: </Text>
      {
        transactionHash
          ? <Text>{transactionHash}</Text>
          : <UncontrolledTextInput
              placeholder="0x..."
              onSubmit={setTransactionHash}
              />
      }
    </Text>
    {...spinners}
  </Box>;
};
