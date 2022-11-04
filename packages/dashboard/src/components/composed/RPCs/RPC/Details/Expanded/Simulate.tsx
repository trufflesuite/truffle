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
  const [waiting, setWaiting] = useState(false);

  const selectData = Array.from(state.simulations, ([key, data]) => ({
    value: key.toString(),
    label: data.label
  }));

  const handleButtonClick = async () => {
    setWaiting(true);
    const simulationId = parseInt(selected!);
    try {
      await operations.simulateTransaction(providerMessageId, simulationId);
    } catch (err) {
      console.error(err);
    }
    setWaiting(false);
  };

  return (
    <Group>
      <Button
        onClick={handleButtonClick}
        disabled={!selected || waiting}
        color="indigo"
      >
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
