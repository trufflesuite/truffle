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
    "color": "blue",
    "textAlign": "right",
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
          Would you like a faster experience? Truffle will attempt download
          source material from Etherscan when it is missing. Enter your
          Etherscan API key in the box below to save it in the browser and speed
          up your downloads. Alternatively you may set an API key in your
          Truffle config file in the directory where you are running `truffle
          dashboard`. To do this, set `etherscan.apiKey` in your
          `truffle-config.js`.
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
      <Stack align="center" className={classes.etherscanMessageContainer}>
        <Text size="sm" className={classes.halfWidth}>
          We have found an Etherscan API key that you previously entered in your
          browser. To delete this from browser storage, click the link below.
        </Text>
        <Text
          size="sm"
          className={`${classes.reset} ${classes.halfWidth}`}
          onClick={onElementClick}
        >
          delete your api key
        </Text>
      </Stack>
    );
  }
}

export default EtherScanApiKeyPrompt;
