import { Navbar, Stack, Group, Text, Code, Button, Badge } from "@mantine/core";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { InjectedConnector } from "@wagmi/core";
import { useDash } from "src/contexts/DashContext";

function Bottom(): JSX.Element {
  const { connect } = useConnect({ connector: new InjectedConnector() });
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const {
    state: { chainInfo }
  } = useDash()!;

  const handleConnectBtnClick = () => void connect();
  const handleDisconnectBtnClick = () => void disconnect();

  return (
    <Navbar.Section py="xl">
      <Stack spacing="md">
        <Text align="center">network + wallet management area</Text>
        <Code mx="lg">
          address = {address?.slice(0, 8)}...{address?.slice(-6)}
          <br />
          chain id = {chainInfo.id}
          <br />
          chain name = {chainInfo.name}
        </Code>
        <Group position="center">
          {isConnected ? (
            <>
              <Badge>Connected</Badge>
              <Button color="gray" onClick={handleDisconnectBtnClick}>
                Disconnect
              </Button>
            </>
          ) : (
            <>
              <Badge color="gray">Disconnected</Badge>
              <Button onClick={handleConnectBtnClick}>Connect</Button>
            </>
          )}
        </Group>
      </Stack>
    </Navbar.Section>
  );
}

export default Bottom;
