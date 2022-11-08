import type { Ethereum } from "ganache";
import { Tabs, Text } from "@mantine/core";
import { Prism } from "@mantine/prism";

interface DetailsProps {
  transaction: any;
  receipt: Ethereum.Transaction.Receipt;
}

export default function Details({
  transaction,
  receipt
}: DetailsProps): JSX.Element {
  return (
    <Tabs defaultValue="overview">
      <Tabs.List grow>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="logs">Logs</Tabs.Tab>
        <Tabs.Tab value="debug">Debug</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="overview">
        <Text size="sm" color="teal" weight={700}>
          Transaction
        </Text>
        <Prism language="json" copyLabel="Copy to clipboard" withLineNumbers>
          {JSON.stringify(transaction, null, 2)}
        </Prism>
        <Text size="sm" color="teal" weight={700}>
          Transaction receipt
        </Text>
        <Prism language="json" copyLabel="Copy to clipboard" withLineNumbers>
          {JSON.stringify(receipt, null, 2)}
        </Prism>
      </Tabs.Panel>
    </Tabs>
  );
}
