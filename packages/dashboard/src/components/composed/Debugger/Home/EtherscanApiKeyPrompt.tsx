import { Flex, Text, Button, Input, createStyles } from "@mantine/core";
import { useInputState, useLocalStorage } from "@mantine/hooks";

const useStyles = createStyles(() => ({
  halfWidth: {
    width: "50%"
  },
  inputGroup: {
    width: "50%",
    input: {
      height: 42,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0
    }
  },
  reset: {
    "&:hover": {
      cursor: "pointer"
    },
    "width": "50%",
    "color": "blue",
    "textAlign": "right",
    "fontSize": 14
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
      <>
        <Text size="sm" className={classes.halfWidth}>
          Would you like a faster experience? Truffle will sometimes download
          source material from Etherscan when it is missing. Enter your
          Etherscan API key in the box below to speed up your downloads.
          Alternatively you may set an API key in your Truffle config file in
          the directory where you are running `truffle dashboard`. To do this,
          set `etherscan.apiKey` in your `truffle-config.js`.
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
      </>
    );
  } else {
    const onElementClick = () => removeEtherscanApiKey();
    return (
      <>
        <Text size="sm" className={classes.halfWidth}>
          We have found an Etherscan API key that you previously entered in your
          browser. To delete this from browser storage, click the link below.
        </Text>
        <Text size="sm" className={classes.reset} onClick={onElementClick}>
          delete your api key
        </Text>
      </>
    );
  }
}

export default EtherScanApiKeyPrompt;
