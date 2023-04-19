import { createStyles } from "@mantine/core";

const useStyles = createStyles(theme => ({
  unknownSourceContainer: {
    height: "100%",
    padding: 15,
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-beige"][9]
        : "#FFF3BF"
  },
  unknownSourceTitle: {
    fontSize: 18
  }
}));

function UnknownSource({ address }: { address: string }): JSX.Element {
  const { classes } = useStyles();
  return (
    <div className={classes.unknownSourceContainer}>
      <div className={classes.unknownSourceTitle}>Unknown Source</div>
      <div>
        We're unable to locate the source material for the contract at the
        following address: {address}. Please consider recompiling with Truffle
        Dashboard running if you have the sources locally.
      </div>
    </div>
  );
}

export default UnknownSource;
