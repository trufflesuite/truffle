import { useEffect, useState } from "react";
import { useAccount, useConnect, useNetwork } from "wagmi";
import ConfirmNetworkChanged from "./components/ConfirmNetworkChange";
import Header from "./components/header/Header";
import DashboardProvider from "./components/dashboardprovider";
import ConnectNetwork from "./components/ConnectNetwork";
import {
  DashboardProviderMessage,
  isDashboardProviderMessage,
  isDebugMessage,
  isInvalidateMessage,
  isLogMessage,
  Message
} from "@truffle/dashboard-message-bus-common";
import {
  DashboardMessageBusClient,
  ReceivedMessageLifecycle
} from "@truffle/dashboard-message-bus-client";

function Dashboard() {
  const [paused, setPaused] = useState<boolean>(false);
  const [connectedChainId, setConnectedChainId] = useState<
    number | undefined
  >();
  const [chainId, setChainId] = useState<number>();
  const [client, setClient] = useState<DashboardMessageBusClient | undefined>();
  const [dashboardProviderRequests, setDashboardProviderRequests] = useState<
    ReceivedMessageLifecycle<DashboardProviderMessage>[]
  >([]);

  const [{ data }] = useNetwork();
  const [{}, disconnect] = useAccount();
  const [{ data: connectData }] = useConnect();

  useEffect(() => {
    setChainId(chainId);

    if (!chainId || !client) {
      return;
    }

    if (connectedChainId) {
      if (connectedChainId !== chainId) {
        setPaused(true);
      }
      if (connectedChainId === chainId) {
        setPaused(false);
      }
    } else {
      setConnectedChainId(chainId);
    }
  }, [data, connectData, client, chainId, connectedChainId]);

  const initializeSocket = async () => {
    if (client) {
      await client.ready();
      return;
    }

    const host = window.location.hostname;
    const port =
      process.env.NODE_ENV === "development"
        ? 24012
        : Number(window.location.port);

    const c = new DashboardMessageBusClient({
      host,
      port
    });

    await c.ready();
    console.debug(`Connected to message bus at ws://${host}:${port}`);

    const subscription = c.subscribe({});

    subscription.on(
      "message",
      (lifecycle: ReceivedMessageLifecycle<Message>) => {
        const message = lifecycle.message;

        if (isDashboardProviderMessage(message)) {
          console.debug(`received provider message`, message);
          setDashboardProviderRequests(previousRequests => [
            ...previousRequests,
            lifecycle as ReceivedMessageLifecycle<DashboardProviderMessage>
          ]);
        } else if (isInvalidateMessage(message)) {
          console.debug(`received invalidate message `, message);
          setDashboardProviderRequests(previousRequests =>
            previousRequests.filter(
              request => request.message.id !== message.payload
            )
          );
        } else if (isDebugMessage(message)) {
          console.debug(`received invalidate message `, message);
          const { payload } = message;
          console.log(payload.message);

          lifecycle.respond({ payload: undefined });
        } else if (isLogMessage(message)) {
          console.debug(`received log message `, message);
          const { payload } = message;
          console.log(payload.message);

          lifecycle.respond({ payload: undefined });
        }
      }
    );

    setClient(c);
  };

  const disconnectAccount = () => {
    console.debug(`Disconnecting`);
    // turn everything off.
    disconnect();
    setConnectedChainId(undefined);
    setPaused(false);
    client?.close();
    setClient(undefined);
  };

  return (
    <div className="h-full min-h-screen bg-gradient-to-b from-truffle-lighter to-truffle-light">
      <Header disconnect={disconnectAccount} />
      {paused && chainId && connectedChainId && (
        <ConfirmNetworkChanged
          newChainId={chainId}
          previousChainId={connectedChainId}
          confirm={() => setConnectedChainId(chainId)}
        />
      )}
      {!paused && !client && <ConnectNetwork confirm={initializeSocket} />}
      {!paused && client && (
        <DashboardProvider
          paused={paused}
          requests={dashboardProviderRequests}
          setRequests={setDashboardProviderRequests}
        />
      )}
    </div>
  );
}

export default Dashboard;
