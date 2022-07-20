import { Stack } from "@mantine/core";
import { useDash } from "src/contexts/DashContext";
import Tx from "src/components/composed/Txs/Tx";

function Txs(): JSX.Element {
  const { state } = useDash()!;

  const content = Array.from(state.providerMessages, ([, lifecycle]) => (
    <Tx key={lifecycle.message.id} lifecycle={lifecycle} />
  ));

  return (
    <Stack align="center" pt="16vh" pb="8vh">
      {content}
    </Stack>
  );
}

export default Txs;
