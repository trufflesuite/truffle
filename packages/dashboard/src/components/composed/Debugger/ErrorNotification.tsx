import {
  Container,
  Flex,
  Text,
  Button,
  Input,
  createStyles
} from "@mantine/core";
import { useInputState, useLocalStorage } from "@mantine/hooks";

const useStyles = createStyles(theme => ({
  inputGroup: {
    marginTop: 10,
    input: {
      height: 42,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
      border: 0
    }
  },
  reset: {
    "&:hover": {
      cursor: "pointer"
    },
    "color": "blue",
    "textAlign": "right",
    "fontSize": 14
  },
  promptContainer: {
    width: "50%",
    borderRadius: 4,
    backgroundColor:
      theme.colorScheme === "dark"
        ? "#082720"
        : theme.colors["truffle-teal"][0],
    border: `solid ${theme.colors["red"]}`,
    padding: 15
  }
}));

function ErrorNotification({ error }: { error: Error }): JSX.Element {
  const { classes } = useStyles();

  return (
    <Container className={classes.promptContainer}>
      <Text size="sm">An error occurred while initializing the debugger.</Text>
    </Container>
  );
}

export default ErrorNotification;
