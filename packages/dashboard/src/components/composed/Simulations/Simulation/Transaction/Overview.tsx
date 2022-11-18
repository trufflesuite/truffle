import { Code } from "@mantine/core";
import type { TransactionProps } from "src/components/composed/Simulations/Simulation/Transaction";
import { inspectDecoding } from "src/utils/dash";

export default function Overview({ decoding }: TransactionProps): JSX.Element {
  const decodingInspected = inspectDecoding(decoding);

  return <Code>{decodingInspected}</Code>;
}
