import {
  Container,
  Stack,
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
    "color": "#E03131",
    "fontSize": 14
  },
  halfWidth: {
    width: "50%"
  },
  promptContainer: {
    width: "50%",
    borderRadius: 4,
    backgroundColor:
      theme.colorScheme === "dark"
        ? "#082720"
        : theme.colors["truffle-teal"][0],
    border: `solid ${theme.colors["truffle-teal"][7]}`,
    padding: 15
  },
  etherscanMessageContainer: {
    width: "100%"
  }
}));

function EtherScanApiKeyPrompt() {
  const { classes } = useStyles();

  const [etherscanApiKey, setEtherscanApiKey, removeEtherscanApiKey] =
    useLocalStorage({
      key: "etherscan-api-key"
    });
  const [inputValue, setInputValue] = useInputState<string>("");

  const buttonStyles = {
    height: "42px",
    borderTopLeftRadius: "0px",
    borderBottomLeftRadius: "0px"
  };

  if (etherscanApiKey === undefined) {
    const onButtonClick = () => {
      setEtherscanApiKey(inputValue);
    };

    return (
      <Container className={classes.promptContainer}>
        <Text size="sm">
          <b>Want a speedier experience?</b> Add your EtherScan API key to more
          quickly download external contract sources.
        </Text>
        <Flex className={classes.inputGroup}>
          <Input
            value={inputValue}
            onChange={setInputValue}
            type="text"
            placeholder="Etherscan api key"
          />
          <Button onClick={onButtonClick} style={buttonStyles}>
            Submit
          </Button>
        </Flex>
      </Container>
    );
  } else {
    const onElementClick = () => removeEtherscanApiKey();
    return (
      <Stack className={classes.promptContainer}>
        <Text size="sm">
          <b>
            We found an EtherScan API key that you've previously entered via
            your browser.
          </b>{" "}
          Delete it from browser storage to use another key.
        </Text>
        <Text
          size="sm"
          className={`${classes.reset}`}
          onClick={onElementClick}
          underline={true}
          weight={700}
        >
          Delete API Key
        </Text>
      </Stack>
    );
  }
}

export default EtherScanApiKeyPrompt;
