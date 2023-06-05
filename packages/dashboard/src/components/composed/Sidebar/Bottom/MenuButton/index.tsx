import { Menu, Text, useMantineColorScheme, createStyles } from "@mantine/core";
import { showNotification, hideNotification } from "@mantine/notifications";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { InjectedConnector } from "@wagmi/core";
import { Slash } from "react-feather";
import { useDash } from "src/hooks";
import Button from "src/components/composed/Sidebar/Bottom/MenuButton/Button";
import {
  frameWalletNotifications,
  frameWalletNotificationId
} from "src/utils/notifications";

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colors, colorScheme, fn } = theme;
  return {
    menuDropdown: {
      width: 290,
      backgroundColor:
        colorScheme === "dark"
          ? colors["truffle-brown"][7]
          : colors["truffle-beige"][4],
      border:
        colorScheme === "dark"
          ? `1px solid ${colors["truffle-brown"][5]}`
          : `1px solid ${fn.lighten(colors["truffle-beige"][5], 0.3)}`
    }
  };
});

function MenuButton(): JSX.Element {
  const { connect } = useConnect({ connector: new InjectedConnector() });
  const { disconnect } = useDisconnect();
  const { isConnected } = useAccount();
  const {
    state: { chainInfo }
  } = useDash()!;
  const { colorScheme } = useMantineColorScheme();
  const { classes } = useStyles();

  if (!isConnected) {
    return (
      <Button
        onClick={async () => {
          try {
            await window.ethereum?.request({ method: "eth_requestAccounts" });
            hideNotification(frameWalletNotificationId);
          } catch (err) {
            if (/^No Frame account selected$/i.test((err as any)?.message))
              showNotification(frameWalletNotifications["no-account"]);
          }
          connect();
        }}
      />
    );
  } else {
    return (
      <Menu
        position="top"
        transition="rotate-right"
        classNames={{ dropdown: classes.menuDropdown }}
      >
        <Menu.Target>
          <Button />
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>
            <Text size="xs">
              Connected to {chainInfo.name} (Chain ID: {chainInfo.id})
            </Text>
          </Menu.Label>
          <Menu.Item
            onClick={() => void disconnect()}
            icon={<Slash />}
            color={colorScheme === "dark" ? "pink" : "orange"}
          >
            Disconnect
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
  }
}

export default MenuButton;
