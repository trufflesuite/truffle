import { Stack, Space, Text, Anchor, createStyles } from "@mantine/core";
import { ExternalLink } from "react-feather";
import { useDash } from "src/hooks";
import RPC from "src/components/composed/RPCs/RPC";
import Logo from "src/components/common/Logo";

const useStyles = createStyles((_theme, _params, _getRef) => ({
  maxSize: {
    width: "100%",
    height: "100%"
  },
  docsAnchor: {
    display: "inline-flex",
    alignItems: "center"
  }
}));

function RPCs(): JSX.Element {
  const { state } = useDash()!;
  const { classes } = useStyles();

  const content = Array.from(
    state.providerMessages,
    ([lifecycleMessageID, lifecycle]) => (
      <RPC key={lifecycleMessageID} lifecycle={lifecycle} />
    )
  );

  if (content.length > 0) {
    return (
      <Stack spacing={32} align="center" py="12vh">
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
        <Logo size={200} variant="dimmed" />
        <Text size="sm" color="dimmed">
          Nothing to see for now... Get started with&nbsp;
          <Anchor
            href="https://trufflesuite.com/docs/truffle/getting-started/using-the-truffle-dashboard"
            target="_blank"
            color="truffle-beige"
            inherit
            className={classes.docsAnchor}
          >
            our docs
            <Space w={3} />
            <ExternalLink size={12} />
          </Anchor>
        </Text>
      </Stack>
    );
  }
}

export default RPCs;
