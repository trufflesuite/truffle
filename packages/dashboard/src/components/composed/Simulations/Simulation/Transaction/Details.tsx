import { Tabs, Text } from "@mantine/core";
import { Prism } from "@mantine/prism";
import type { TransactionProps } from "src/components/composed/Simulations/Simulation/Transaction";

export default function Details({
  data,
  receipt
}: TransactionProps): JSX.Element {
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
          {JSON.stringify(data, null, 2)}
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
