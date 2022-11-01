import { Button, Group, Text } from "@mantine/core";
import { useDash } from "src/hooks";

export default function Simulations(): JSX.Element {
  const { state, operations } = useDash()!;

  const overview = Array.from(state.simulations, ([key, data]) => (
    <Text key={`simulation-${key}`}>
      Simulation {key}: {data.label}
    </Text>
  ));

  return (
    <Group>
      {overview}
      <Button
        onClick={operations.addSimulation}
        color="truffle-beige"
        variant="light"
      >
        New simulation
      </Button>
    </Group>
  );
}
