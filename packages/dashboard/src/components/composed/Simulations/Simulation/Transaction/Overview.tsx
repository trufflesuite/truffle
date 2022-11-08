import { Text } from "@mantine/core";

interface OverviewProps {
  transactionHash: string;
}

export default function Overview({
  transactionHash
}: OverviewProps): JSX.Element {
  return <Text>{transactionHash}</Text>;
}
