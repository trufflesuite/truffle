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
  const { state, operations } = useDash()!;
  const [selected, setSelected] = useState(
    state.simulations.size > 0 ? "0" : undefined
  );

  const selectData = Array.from(state.simulations, ([key, data]) => ({
    value: key.toString(),
    label: data.label
  }));

  const handleButtonClick = async () => {
    const simulationId = parseInt(selected!);
    await operations.simulateTransaction(providerMessageId, simulationId);
  };

  return (
    <Group>
      <Button onClick={handleButtonClick} disabled={!selected} color="indigo">
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
