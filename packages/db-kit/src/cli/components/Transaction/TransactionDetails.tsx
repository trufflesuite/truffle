import React from "react";
import { Box, Text } from "ink";
import { StatusSpinners } from "./StatusSpinners";
import { TransactionResults } from "./TransactionResults";
import { useDecoder } from "../../hooks";

import type { Transaction, TransactionReceipt } from "web3-core";
import type TruffleConfig from "@truffle/config";
import type { Db, Resources } from "@truffle/db";

type TransactionDetailsProps = {
  config: TruffleConfig;
  db: Db;
  project: Resources.IdObject<"projects">;
  transaction: Transaction;
  receipt: TransactionReceipt;
  addresses: string[];
};

export const TransactionDetails = ({
  config,
  db,
  project,
  transaction,
  receipt,
  addresses
}: TransactionDetailsProps) => {
  const { decoder, statusByAddress } = useDecoder({
    config,
    db,
    project,
    network: { name: config.network },
    addresses
  });

  const showLoaders = Object.values(statusByAddress).find(
    status => status !== "ok"
  );

  if (!decoder) return null;

  return (
    <Box flexDirection="column">
      {showLoaders && (
        <Box
          key="loaders"
          flexDirection="column"
          borderStyle="round"
          borderColor="dim"
        >
          <Box paddingX={1}>
            <Text dimColor bold>
              Related addresses:
            </Text>
          </Box>
          <Box paddingX={2} flexDirection="column">
            <StatusSpinners statusByAddress={statusByAddress} />
          </Box>
        </Box>
      )}
      <TransactionResults
        decoder={decoder}
        transaction={transaction}
        receipt={receipt}
      />
    </Box>
  );
};
