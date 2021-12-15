import React, { useState, useEffect } from "react";
import { Box } from "ink";
import { UserInput } from "../UserInput";

import { LoadingSpinner } from "../LoadingSpinner";
import { useTransactionInfo } from "../../hooks/useTransactionInfo";
import { TransactionDetails } from "./TransactionDetails";

const TransactionInput = ({ enabled, onSubmit }) => {
  if (!enabled) return null;

  return (
    <UserInput description={"Tx hash"} onSubmit={onSubmit} enabled={enabled} />
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
      <TransactionInput
        enabled={!transactionHash}
        onSubmit={setTransactionHash}
      />
      <LoadingSpinner
        message={"Reading transaction..."}
        enabled={!!transactionHash && !addresses}
      />
      <LoadingSpinner
        message={"Reading transaction receipt..."}
        enabled={!!transactionHash && !addresses}
      />

      {addresses && (
        <Box flexDirection={"column"}>
          <TransactionDetails
            config={config}
            db={db}
            project={project}
            transaction={transaction}
            receipt={receipt}
            addresses={addresses}
          />
        </Box>
      )}
    </Box>
  );
};
