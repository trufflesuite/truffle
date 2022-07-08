import { Navbar, Stack, Group, Text, Code, Button, Badge } from "@mantine/core";
import { useAccount, useConnect, useDisconnect, useNetwork } from "wagmi";
import { InjectedConnector } from "@wagmi/core";

function Bottom(): JSX.Element {
  const { connect } = useConnect({ connector: new InjectedConnector() });
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();

  const handleConnectBtnClick = () => void connect();
  const handleDisconnectBtnClick = () => void disconnect();

  return (
    <Navbar.Section py="xl">
      <Stack spacing="md">
        <Text align="center">network + wallet management area</Text>
        <Code mx="lg">
          address = {address?.slice(0, 8)}...{address?.slice(-6)}
          <br />
          chain id = {chain?.id}
          <br />
          chain name = {chain?.name}
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
