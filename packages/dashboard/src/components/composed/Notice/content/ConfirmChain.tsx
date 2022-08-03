import {
  Alert,
  Stack,
  Space,
  Button,
  Badge,
  Title,
  Text,
  useMantineColorScheme,
  createStyles
} from "@mantine/core";
import { Info } from "react-feather";
import { useDash } from "src/hooks";
import ChainIcon from "src/components/common/ChainIcon";

const useStyles = createStyles((_theme, _params, _getRef) => ({
  title: {
    justifyContent: "center"
  },
  label: {
    "> .mantine-Title-root": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }
}));

function ConfirmChain(): JSX.Element {
  const {
    state: { chainInfo },
    operations: { toggleNotice }
  } = useDash()!;
  const { colorScheme } = useMantineColorScheme();
  const { classes } = useStyles();

  const title = (
    <Title order={4}>
      <Info size={18} />
      <Space w={6} />
      Confirm Network
    </Title>
  );
  const desc = (
    <Text size="sm" align="center">
      Confirm&nbsp;
      <Badge
        size="md"
        color={colorScheme === "dark" ? "pink" : "orange"}
        leftSection={<ChainIcon chainID={chainInfo.id!} height={11} />}
        pl={5}
        pr={6}
      >
        {chainInfo.name}
      </Badge>
      &nbsp;is the desired network,
      <br />
      or switch before continuing.
    </Text>
  );

  return (
    <Alert
      title={title}
      color="truffle-beige"
      px={30}
      py="lg"
      classNames={{
        title: classes.title,
        label: classes.label
      }}
    >
      <Stack align="center">
        {desc}
        <Button onClick={toggleNotice} color="truffle-beige">
          Confirm
        </Button>
      </Stack>
    </Alert>
  );
}

export default ConfirmChain;
