import { Menu, Text, createStyles } from "@mantine/core";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { InjectedConnector } from "@wagmi/core";
import { Slash } from "react-feather";
import { useDash } from "src/contexts/DashContext";
import Btn from "src/components/composed/Sidebar/Bottom/MenuBtn/Btn";

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colors, fn } = theme;
  return {
    menuRoot: {
      width: "100%"
    },
    menuBody: {
      border: `1px solid ${fn.rgba(colors["truffle-beige"][8], 0.5)}`
    }
  };
});

function MenuBtn(): JSX.Element {
  const { connect } = useConnect({ connector: new InjectedConnector() });
  const { disconnect } = useDisconnect();
  const { isConnected } = useAccount();
  const {
    state: { chainInfo }
  } = useDash()!;
  const { classes } = useStyles();

  if (!isConnected) {
    return <Btn onClick={() => void connect()} />;
  } else {
    return (
      <Menu
        control={<Btn />}
        placement="center"
        size="xl"
        transition="rotate-right"
        classNames={{
          root: classes.menuRoot,
          body: classes.menuBody
        }}
      >
        <Menu.Label>
          <Text size="xs">
            Connected to {chainInfo.name} (Chain ID: {chainInfo.id})
          </Text>
        </Menu.Label>
        <Menu.Item
          onClick={() => void disconnect()}
          icon={<Slash />}
          color="red"
        >
          Disconnect
        </Menu.Item>
      </Menu>
    );
  }
}

export default MenuBtn;
