import { Flex, Text, createStyles } from "@mantine/core";

const useStyles = createStyles(theme => ({
  notificationContainer: {
    width: "100%",
    height: "100%"
  },
  notification: {
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
      <Text className={classes.notification} size="sm">
        An error occurred while initializing the debugger. See the error below
        for more information.
        {error.message}
      </Text>
    </Flex>
  );
}

export default ErrorNotification;
