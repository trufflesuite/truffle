import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { UserInput } from "../UserInput";

import { LoadingSpinner } from "../LoadingSpinner";
import { fetchTransactionInfo } from "../../actions/fetchTransactionInfo";
import { useTransactionInfo } from "../../hooks/useTransactionInfo";
import { useDecoder } from "../../hooks";
import { TransactionDetails } from "./TransactionDetails";

type TransactionProps = {
  config: any;
  db: any;
  project: any;
};

export const Transaction = ({ config, db, project }: TransactionProps) => {
  const [transactionHash, setTransactionHash] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [transactionInfo, setTransactionInfo] = useState<any | undefined>();

  useEffect(() => {
    async function getTxInfo() {
      if (transactionHash) {
        const {
          transaction,
          receipt,
          addresses,
          error
        } = await fetchTransactionInfo({ config, transactionHash });
        if (error) {
          return setError(error);
        }

        setTransactionInfo({ transaction, receipt, addresses });
      }
    }

    getTxInfo();
  }, [transactionHash, config]);

  return (
    <Box flexDirection={"column"}>
      <UserInput
        description={"Tx hash"}
        onSubmit={setTransactionHash}
        enabled={!transactionHash}
        display={!transactionHash}
      />

      <LoadingSpinner
        message={"Reading transaction..."}
        enabled={!!transactionHash && !transactionInfo}
      />
      <LoadingSpinner
        message={"Reading transaction receipt..."}
        enabled={!!transactionHash && !transactionInfo}
      />

      <Text>{error}</Text>

      {transactionInfo && (
        <TransactionDetails
          config={config}
          db={db}
          project={project}
          {...transactionInfo}
        />
      )}
    </Box>
  );
};
