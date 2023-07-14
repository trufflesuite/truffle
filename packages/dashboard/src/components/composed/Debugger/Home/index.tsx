import { Stack, Text, createStyles } from "@mantine/core";
import EtherscanApiKeyPrompt from "src/components/composed/Debugger/Home/EtherscanApiKeyPrompt";

const useStyles = createStyles(theme => ({
  welcomeMessage: {
    textAlign: "left",
    width: "100%",
    height: "80%",
    color:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-beige"][2]
        : theme.colors["truffle-beige"][9]
  },
  halfWidth: {
    width: "50%"
  }
}));

function Home(): JSX.Element {
  const { classes } = useStyles();

  return (
    <Stack
      align="center"
      justify="center"
      pb="4%"
      className={classes.welcomeMessage}
    >
      <Text size="lg" className={classes.halfWidth}>
        Welcome!
      </Text>
      <Text size="sm" className={classes.halfWidth}>
        Here you can paste a transaction hash to begin debugging it. You can
        also start the debugger by clicking the Debug button on a signature
        request.
      </Text>
      <EtherscanApiKeyPrompt />
    </Stack>
  );
}

export default Home;
