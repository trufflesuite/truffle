import type { Ethereum } from "ganache";
import { Text } from "@mantine/core";
import { Prism } from "@mantine/prism";

interface DetailsProps {
  receipt: Ethereum.Transaction.Receipt;
}

export default function Details({ receipt }: DetailsProps): JSX.Element {
  const receiptStringified = JSON.stringify(receipt, null, 2);

  return (
    <>
      <Text size="sm" color="teal" weight={700}>
        Transaction receipt
      </Text>
      <Prism language="json" copyLabel="Copy to clipboard" withLineNumbers>
        {receiptStringified}
      </Prism>
    </>
  );
}
