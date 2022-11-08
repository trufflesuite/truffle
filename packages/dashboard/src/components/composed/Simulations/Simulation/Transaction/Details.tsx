import type { Ethereum } from "ganache";
import { Tabs, Text } from "@mantine/core";
import { Prism } from "@mantine/prism";

interface DetailsProps {
  receipt: Ethereum.Transaction.Receipt;
}

export default function Details({ receipt }: DetailsProps): JSX.Element {
  const receiptStringified = JSON.stringify(receipt, null, 2);

  return (
    <Tabs defaultValue="overview">
      <Tabs.List grow>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="logs">Logs</Tabs.Tab>
        <Tabs.Tab value="debug">Debug</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="overview">
        <Text size="sm" color="teal" weight={700}>
          Transaction receipt
        </Text>
        <Prism language="json" copyLabel="Copy to clipboard" withLineNumbers>
          {receiptStringified}
        </Prism>
      </Tabs.Panel>
    </Tabs>
  );
}
