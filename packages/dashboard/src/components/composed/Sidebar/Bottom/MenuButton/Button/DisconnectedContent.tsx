import { Group, ThemeIcon, Text, createStyles } from "@mantine/core";
import ChainIcon from "src/components/common/ChainIcon";

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colors, colorScheme } = theme;
  return {
    waitingChainIcon: {
      backgroundColor:
        colorScheme === "dark"
          ? colors["truffle-beige"][2]
          : colors["truffle-teal"][3],
      outline:
        colorScheme === "dark"
          ? `1.8px solid ${colors["truffle-beige"][5]}`
          : `1.8px solid ${colors["truffle-teal"][6]}`
    }
  };
});

function DisconnectedContent(): JSX.Element {
  const { classes } = useStyles();

  return (
    <Group>
      <ThemeIcon size={60} radius="xl" className={classes.waitingChainIcon}>
        <ChainIcon chainID={-1} m="xs" />
      </ThemeIcon>
      <Text weight={600} color="#999" ml={36}>
        Click to connect
      </Text>
    </Group>
  );
}

export default DisconnectedContent;
