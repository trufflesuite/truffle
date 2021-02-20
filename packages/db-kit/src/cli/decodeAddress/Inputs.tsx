import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { UncontrolledTextInput } from "ink-text-input";

import type TruffleConfig from "@truffle/config";

export interface Props {
  config: TruffleConfig;
  onSubmit: (inputProps: {
    address: string;
  }) => void;
}

export const DecodeAddressInputs = ({
  config,
  onSubmit
}: Props) => {
  const provider = config.provider;

  const [address, setAddress] = useState<string | undefined>();

  useEffect(() => {
    if (address) {
      onSubmit({
        address
      });
    }
  }, [address]);

  return <Box flexDirection="column">
    <Text>
      <Text bold>address: </Text>
      {
        address
          ? <Text>{address}</Text>
          : <UncontrolledTextInput
              placeholder="0x..."
              onSubmit={setAddress}
              />
      }
    </Text>
  </Box>;
};
