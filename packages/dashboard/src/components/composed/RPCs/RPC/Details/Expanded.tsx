import { Stack, Text, createStyles } from "@mantine/core";
import { Prism } from "@mantine/prism";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colors, colorScheme, fn } = theme;
  return {
    container: {
      minHeight: 26
    },
    code: {
      backgroundColor:
        colorScheme === "dark"
          ? `${fn.darken(colors["truffle-brown"][9], 0.1)} !important`
          : `${colors["truffle-beige"][0]} !important`
    },
    lineNumber: {
      color:
        colorScheme === "dark"
          ? colors["truffle-brown"][5]
          : colors["truffle-beige"][5]
    }
  };
});

type ExpandedProps = {
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>;
};

function Expanded({ lifecycle }: ExpandedProps): JSX.Element {
  const { params } = lifecycle.message.payload;
  const paramsStringified = JSON.stringify(params, null, 2);
  const { classes } = useStyles();

  return (
    <Stack spacing="xs" px="md" pt="sm" pb="xl" className={classes.container}>
      <Text size="sm" color="teal" weight={700}>
        Parameters
      </Text>
      <Prism
        language="json"
        copyLabel="Copy to clipboard"
        withLineNumbers
        classNames={{
          code: classes.code,
          lineNumber: classes.lineNumber
        }}
      >
        {paramsStringified}
      </Prism>
    </Stack>
  );
}

export default Expanded;
