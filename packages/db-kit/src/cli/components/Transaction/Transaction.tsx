import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { UserInput } from "../UserInput";
import { useTransactionInfo } from "../../hooks/useTransactionInfo";
import { TransactionDetails } from "./TransactionDetails";

export const TransactionInfo = ({ transaction }) => {
  if (!transaction) return null;

  return (
    <Box key="transaction">
      <Box paddingLeft={1} paddingRight={1}>
        <Text color="green">
          <Spinner />
        </Text>
      </Box>
      <Text>Reading transaction...</Text>
    </Box>
  );
};

export const TransactionReceiptInfo = ({ receipt }) => {
  if (!receipt) return null;

  return (
    <Box key="receipt">
      <Box paddingLeft={1} paddingRight={1}>
        <Text color="green">
          <Spinner />
        </Text>
      </Box>
      <Text>Reading transaction receipt...</Text>
    </Box>
  );
};

type TransactionProps = {
  config: any;
  db: any;
  project: any;
};

export const Transaction = ({ config, db, project }: TransactionProps) => {
  const [transactionHash, setTransactionHash] = useState<string | undefined>();
  const { transaction, receipt, addresses } = useTransactionInfo({
    config,
    transactionHash
  });

  useEffect(() => {}, [transactionHash, config]);

  return (
    <Box flexDirection={"column"}>
      {!transactionHash && (
        <Box>
          <UserInput
            description={"Tx hash"}
            onSubmit={setTransactionHash}
            enabled={!transactionHash}
          />
          <TransactionInfo transaction={transaction} />
          <TransactionReceiptInfo receipt={receipt} />
        </Box>
      )}
      {addresses && (
        <TransactionDetails
          config={config}
          db={db}
          project={project}
          transaction={transaction}
          receipt={receipt}
          addresses={addresses}
        />
      )}
    </Box>
  );
};
