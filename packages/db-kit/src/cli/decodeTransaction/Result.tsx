import React, { useRef, useState, useEffect } from "react";
import { Box, Text, measureElement } from "ink";
import Spinner from "ink-spinner";
import Divider from "ink-divider";

import type { Transaction, TransactionReceipt } from "web3-core";
import type { WireDecoder } from "@truffle/decoder";

import * as Components from "@truffle/db-kit/cli/components";
import { DefinitionList } from "@truffle/db-kit/cli/components";
import { useDecoder } from "@truffle/db-kit/cli/hooks";

import { useDecodedTransaction } from "./useDecodedTransaction";

export interface Props {
  decoder: WireDecoder;
  transaction: Transaction;
  receipt: TransactionReceipt;
}

export const DecodeTransactionResult = ({
  decoder,
  transaction,
  receipt,
}: Props) => {
  const [width, setWidth] = useState(80);
  const ref = useRef();

  useEffect(() => {
    // @ts-ignore
    setWidth(measureElement(ref.current).width);
  }, []);

  const { summary, events } = useDecodedTransaction({
    decoder,
    transaction,
    receipt
  });

  let summaryElement = <Box>
    <Box paddingLeft={1} paddingRight={1}>
      <Text color="green"><Spinner /></Text>
    </Box>
    <Text>Decoding transaction summary...</Text>
  </Box>;
  if (summary.complete) {
    switch (summary.decoding?.kind) {
      case "function":
        summaryElement = <Components.Codec.Function
          transaction={transaction}
          receipt={receipt}
          decoding={summary.decoding} />;
        break;
      case "constructor":
        summaryElement = <Components.Codec.Constructor
          transaction={transaction}
          receipt={receipt}
          decoding={summary.decoding} />;
        break;
      default:
        summaryElement = <Text>{summary.decoding?.kind} </Text>;
        break;
    }
  }

  const eventEntries = events.map((event, index) => {
    const name = `[${index}]`;
    const node = !event.complete
      ? <Box key={index}>
          <Box paddingLeft={1} paddingRight={1}>
            <Text color="green"><Spinner /></Text>
          </Box>
          <Text>Decoding...</Text>
        </Box>
      : <Components.Codec.Event log={event.log} decoding={event.decoding} />;

    return { name, node };
  });

  const eventsElement = eventEntries.length === 0
    ? <Text dimColor italic>{"(no logs emitted)"}</Text>
    : <DefinitionList
        spaceBetween={1}
        nameComponent={({ children }) => <Text dimColor>{children}</Text>}
        entries={eventEntries} />;

  // @ts-ignore
  return <Box ref={ref} flexDirection="column" borderStyle="round" paddingBottom={1}>
    <Divider width={width-2} titleColor="whiteBright" title="Decoded  Transaction" titlePadding={2} padding={0} />
    <Box marginX={2} marginY={1}>
      {summaryElement}
    </Box>
    <Divider width={width-2} titleColor="whiteBright" title="Decoded Events" titlePadding={2} padding={0} />
    <Box marginX={2} marginTop={1} flexDirection="column">
      {eventsElement}
    </Box>
  </Box>
};
