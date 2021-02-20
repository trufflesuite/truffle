import React, { useRef, useState, useEffect } from "react";
import { Box, Text, measureElement } from "ink";
import Spinner from "ink-spinner";
import Divider from "ink-divider";

import type { WireDecoder } from "@truffle/decoder";
import Web3 from "web3";

import { useDecodedAddress } from "./useDecodedAddress";

import * as Components from "@truffle/db-kit/cli/components";
import { DefinitionList } from "@truffle/db-kit/cli/components";

export interface Props {
  decoder: WireDecoder;
  address: string;
}

export const DecodeAddressResult = ({
  decoder,
  address
}: Props) => {
  const [width, setWidth] = useState(80);
  const ref = useRef();

  useEffect(() => {
    // @ts-ignore
    setWidth(measureElement(ref.current).width);
  }, []);

  const { summary, variables } = useDecodedAddress({
    decoder,
    address
  });

  let summaryElement = <Box>
    <Box paddingLeft={1} paddingRight={1}>
      <Text color="green"><Spinner /></Text>
    </Box>
    <Text>Decoding address summary...</Text>
  </Box>;
  if (summary.complete) {
    const { contract } = summary;
    if (contract) {
      summaryElement = <DefinitionList entries={[
        {
          name: "Address",
          node: <Text bold>{address}</Text>
        },
        {
          name: "Contract",
          node: <Text>
            <Text bold>{contract.class.typeName}</Text>
            {" "}({contract.class.typeClass})
          </Text>
        },
        {
          name: "Balance",
          node: <Text bold color="cyan">
            {
              Web3.utils.fromWei(contract.balanceAsBN.toString(), "ether")
            }{" "}ETH
          </Text>
        }

      ]} />
    } else {
      summaryElement = <Text italic color="red">
        Error decoding contract state
      </Text>
    }
  }

  let variablesElement = <Box>
    <Box paddingLeft={1} paddingRight={1}>
      <Text color="green"><Spinner /></Text>
    </Box>
    <Text>Decoding variables...</Text>
  </Box>;
  if (summary.complete && summary.contract && variables.complete) {
    if (variables.variables) {
      variablesElement = <Components.Codec.StateVariables
        contract={summary.contract.class}
        variables={variables.variables} />
    } else {
      variablesElement = <Text italic color="red">
        Error decoding contract variables
      </Text>
    }
  }

  // @ts-ignore
  return <Box ref={ref} flexDirection="column" borderStyle="round" paddingBottom={1}>
    <Divider width={width-2} titleColor="whiteBright" title="Contract Summary" titlePadding={2} padding={0} />
    <Box marginX={2} marginY={1}>
      {summaryElement}
    </Box>
    <Divider width={width-2} titleColor="whiteBright" title="State  Variables" titlePadding={2} padding={0} />
    <Box marginX={2} marginTop={1} flexDirection="column">
      {variablesElement}
    </Box>
  </Box>
};
