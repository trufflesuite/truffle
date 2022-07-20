import { Stack, Text, Anchor, createStyles } from "@mantine/core";
import { useDash } from "src/hooks";
import Tx from "src/components/composed/Txs/Tx";
import LogoImg from "src/components/common/LogoImg";

const useStyles = createStyles((_theme, _params, _getRef) => ({
  maxSize: {
    width: "100%",
    height: "100%"
  }
}));

function Txs(): JSX.Element {
  const { state } = useDash()!;
  const { classes } = useStyles();

  const content = Array.from(state.providerMessages, ([, lifecycle]) => (
    <Tx key={lifecycle.message.id} lifecycle={lifecycle} />
  ));

  if (content.length > 0) {
    return (
      <Stack align="center" pt="16vh" pb="8vh">
        {content}
      </Stack>
    );
  } else {
    return (
      <Stack
        align="center"
        justify="center"
        pb="4%"
        className={classes.maxSize}
      >
        <LogoImg size={200} variant="dimmed" />
        <Text size="sm" color="dimmed">
          Nothing to see for now... Get started with&nbsp;
          <Anchor
            href="https://trufflesuite.com/docs/truffle/getting-started/using-the-truffle-dashboard"
            target="_blank"
            color="truffle-beige"
            inherit
          >
            our docs
          </Anchor>
          .
        </Text>
      </Stack>
    );
  }
}

export default Txs;
