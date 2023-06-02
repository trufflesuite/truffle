import { Flex, Text, Container, createStyles } from "@mantine/core";
import { WarningIcon } from "src/components/composed/Debugger/WarningIcon";

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
    border: `solid #C92A2A`,
    borderRadius: 4
  },
  notificationHeader: {
    backgroundColor: "#C92A2A",
    width: "100%",
    padding: 15,
    display: "flex",
    alignItems: "center"
  },
  notificationHeaderText: {
    color: "white"
  },
  icon: {
    marginRight: 10,
    paddingTop: 5
  },
  errorTextContainer: {
    padding: 15
  }
}));

function ErrorNotification({ error }: { error: Error }): JSX.Element {
  const { classes } = useStyles();

  return (
    <Flex
      className={classes.notificationContainer}
      align="center"
      justify="center"
      direction="column"
    >
      <div className={classes.notificationAndError}>
        <div className={classes.notificationHeader}>
          <div className={classes.icon}>
            <WarningIcon />
          </div>
          <div className={classes.notificationHeaderText}>
            There's an issue...
          </div>
        </div>
        <div className={classes.errorTextContainer}>
          <Text>
            An error occurred while initializing the debugger. Often errors can
            be caused by being connected to the incorrect network for a specific
            transaction. Ensure you have MetaMask connected to the appropriate
            network for your transaction. See the error below for more
            information.
          </Text>
          <Text fw={700}>{error.message}</Text>
        </div>
      </div>
    </Flex>
  );
}

export default ErrorNotification;
