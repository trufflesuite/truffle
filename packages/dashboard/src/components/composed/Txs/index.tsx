import { Stack, ScrollArea } from "@mantine/core";
import { useDash } from "src/contexts/DashContext";
import Card from "src/components/composed/Txs/Card";

function Txs(): JSX.Element {
  const { state } = useDash()!;

  const cards = Array.from(state.providerMessages, ([, lifecycle]) => (
    <Card key={lifecycle.message.id} lifecycle={lifecycle} />
  ));

  return (
    <ScrollArea>
      <Stack align="center" sx={{ maxHeight: "100vh" }}>
        {cards}
      </Stack>
    </ScrollArea>
  );
}

export default Txs;
