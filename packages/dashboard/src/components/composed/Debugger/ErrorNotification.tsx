import { Flex, Text, Container, createStyles } from "@mantine/core";

const useStyles = createStyles(theme => ({
  notificationContainer: {
    width: "100%",
    height: "100%"
  },
  notificationAndError: {
    maxWidth: "75%",
    backgroundColor:
      theme.colorScheme === "dark"
        ? "#082720"
        : theme.colors["truffle-teal"][0],
    padding: 15,
    border: `solid red`,
    borderRadius: 4
  }
}));

function ErrorNotification({ error }: { error: Error }): JSX.Element {
  const { classes } = useStyles();

  return (
    <Flex
      className={classes.notificationContainer}
      align="center"
      justify="center"
    >
      <Container className={classes.notificationAndError}>
        <Text>
          An error occurred while initializing the debugger. Often errors can be
          caused by being connected to the incorrect network for a specific
          transaction. Ensure you have MetaMask connected to the appropriate
          network for your transaction. See the error below for more
          information.
        </Text>
        <Text>{error.message}</Text>
      </Container>
    </Flex>
  );
}

export default ErrorNotification;
