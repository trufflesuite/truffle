import { Alert } from "@mantine/core";

function Connect(): JSX.Element {
  const title = "Welcome!";
  const desc = "Please connect your wallet to start using Truffle Dashboard.";

  return (
    <Alert title={title} variant="outline">
      {desc}
    </Alert>
  );
}

export default Connect;
