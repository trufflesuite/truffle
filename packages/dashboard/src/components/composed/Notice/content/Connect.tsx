import { Alert, Title, Text } from "@mantine/core";
import { Coffee } from "react-feather";

function Connect(): JSX.Element {
  const title = <Title order={4}>Welcome!</Title>;
  const desc = (
    <Text size="sm">Connect your wallet to start using Truffle Dashboard.</Text>
  );

  return (
    <Alert
      title={title}
      icon={<Coffee />}
      color="truffle-beige"
      px={30}
      py="lg"
    >
      {desc}
    </Alert>
  );
}

export default Connect;
