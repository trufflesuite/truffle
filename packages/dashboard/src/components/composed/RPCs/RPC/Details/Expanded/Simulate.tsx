import { useState } from "react";
import { Group, Button, Select } from "@mantine/core";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import { useDash } from "src/hooks";

interface SimulateProps {
  providerMessageId: DashboardProviderMessage["id"];
}

export default function Simulate({
  providerMessageId
}: SimulateProps): JSX.Element {
  const { state } = useDash()!;
  const [selected, setSelected] = useState(
    state.simulations.size > 0 ? "0" : undefined
  );

  const selectData = Array.from(state.simulations, ([key, data]) => ({
    value: key.toString(),
    label: data.label
  }));

  const simulate = () => {
    const simulationId = parseInt(selected!);
    console.log(`Simulate ${providerMessageId} on ${simulationId}`);
  };

  return (
    <Group>
      <Button onClick={simulate} disabled={!selected} color="indigo">
        Simulate
      </Button>
      <Select
        data={selectData}
        value={selected}
        onChange={setSelected as (x: string) => void}
      />
    </Group>
  );
}
