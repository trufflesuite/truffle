import {
  Group,
  Stack,
  Box,
  ThemeIcon,
  Text,
  createStyles
} from "@mantine/core";
import { useAccount } from "wagmi";
import { Sliders } from "react-feather";
import { useDash } from "src/hooks";
import ChainIcon from "src/components/common/ChainIcon";

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colors, colorScheme, fn, fontFamilyMonospace } = theme;

  return {
    activeChainIcon: {
      backgroundColor:
        colorScheme === "dark"
          ? colors["truffle-brown"][8]
          : colors["truffle-beige"][4]
    },
    text: {
      color:
        colorScheme === "dark"
          ? colors["truffle-beige"][1]
          : fn.darken(colors["truffle-beige"][9], 0.5)
    },
    chainName: {
      fontFamily: fontFamilyMonospace,
      maxWidth: 172,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    },
    address: {
      fontFamily: fontFamilyMonospace
    }
  };
});

function ConnectedContent(): JSX.Element {
  const { address } = useAccount();
  const {
    state: { chainInfo }
  } = useDash()!;
  const { classes } = useStyles();

  return (
    <Group position="apart">
      <Group>
        <ThemeIcon size={60} radius="xl" className={classes.activeChainIcon}>
          <ChainIcon chainID={chainInfo.id!} m="xs" />
        </ThemeIcon>
        <Stack spacing={4}>
          <Text
            size="lg"
            className={`${classes.chainName} ${classes.text}`}
            align="start"
          >
            {chainInfo.name}
          </Text>
          <Text
            size="xs"
            className={`${classes.address} ${classes.text}`}
            align="start"
          >
            {address?.slice(0, 10)}...{address?.slice(-8)}
          </Text>
        </Stack>
      </Group>
      <Box pr="sm">
        <Sliders size={18} color="#bbb" />
      </Box>
    </Group>
  );
}

export default ConnectedContent;
