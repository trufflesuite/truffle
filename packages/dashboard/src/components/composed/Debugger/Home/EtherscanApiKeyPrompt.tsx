import { Flex, Text, Button, Input, createStyles } from "@mantine/core";
import { useInputState } from "@mantine/hooks";
import { useDash } from "src/hooks";

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
    }
  }
}));

function EtherScanApiKeyPrompt() {
  const { classes } = useStyles();
  const {
    operations: { setEtherscanApiKey },
    state: {
      debugger: { etherscanApiKey }
    }
  } = useDash()!;

  const [inputValue, setInputValue] = useInputState<string>("");

  const buttonStyles = {
    height: "42px",
    borderTopLeftRadius: "0px",
    borderBottomLeftRadius: "0px"
  };

  if (etherscanApiKey === "" || etherscanApiKey === undefined) {
    const onButtonClick = () => {
      localStorage.etherscanApiKey = inputValue;
      setEtherscanApiKey(localStorage.etherscanApiKey);
    };

    return (
      <>
        <Text size="sm" className={classes.halfWidth}>
          Would you like a faster experience? Truffle will sometimes download
          source material from Etherscan when it is missing. Enter your
          Etherscan API key in the box below to speed up your downloads.
        </Text>
        <Flex className={classes.inputGroup}>
          <Input
            value={inputValue}
            onChange={setInputValue}
            type="text"
            placeholder="Etherscan API Key"
          />
          <Button onClick={onButtonClick} style={buttonStyles}>
            Submit
          </Button>
        </Flex>
      </>
    );
  } else {
    const onElementClick = () => {
      localStorage.etherscanApiKey = "";
      setEtherscanApiKey(localStorage.etherscanApiKey);
    };
    return (
      <div className={classes.reset} onClick={onElementClick}>
        "reset your api key"
      </div>
    );
  }
}

export default EtherScanApiKeyPrompt;
