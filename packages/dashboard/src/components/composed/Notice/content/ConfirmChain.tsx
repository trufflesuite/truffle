import { Alert, Button, Stack, Code } from "@mantine/core";
import { useDash } from "src/contexts/DashContext";

function ConfirmChain(): JSX.Element {
  const { state, ops } = useDash()!;
  const title = "Confirm network";
  const desc = <Code>{state.chainInfo.name}</Code>;

  return (
    <Alert title={title} variant="outline">
      <Stack align="center">
        {desc}
        <Button onClick={ops.toggleNotice}>Confirm</Button>
      </Stack>
    </Alert>
  );
}

export default ConfirmChain;
