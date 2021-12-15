import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { UserInput } from "../UserInput";

export const Transaction = () => {
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (txHash) {
      console.log(txHash);
    }
  }, [txHash]);

  return (
    <Box flexDirection={"column"}>
      <UserInput
        description={"Tx hash"}
        onSubmit={setTxHash}
        enabled={!txHash}
      />

      <Box>
        <Text>Fetching: </Text>
        <Text>{txHash}</Text>
      </Box>
    </Box>
  );
};
