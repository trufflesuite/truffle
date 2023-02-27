import { useState } from "react";
import { Input, Button } from "@mantine/core";
import { useInputState, useCounter } from "@mantine/hooks";
import Controls from "src/components/composed/Debugger/Controls";
import Sources from "src/components/composed/Debugger/Sources";
import { setupSession, SessionStatus } from "src/utils/debugger";
import { useDash } from "src/hooks";

function Debugger(): JSX.Element {
  const [inputValue, setInputValue] = useInputState("");
  const [sessionUpdated, { increment: sessionTick }] = useCounter();
  const {
    operations,
    state: {
      debugger: { sources, session }
    }
  } = useDash()!;
  const [status, setStatus] = useState<SessionStatus>();
  const inputsDisabled =
    status === SessionStatus.Initializing ||
    status === SessionStatus.Fetching ||
    status === SessionStatus.Starting;
  const formDisabled =
    // !/0x[a-z0-9]{64}/i.test(inputValue) || inputsDisabled;
    inputsDisabled;

  const initDebugger = async () => {
    const compilations = await operations.getCompilations();
    const testTxHash =
      "0xdadd2f626c81322ec8a2a20dec71c780f630ef1fab7393c675a8843365477389";
    // "0x2650974eb6390dc787df16ab86308822855f907e7463107248cfd5e424923176"

    const provider = window.ethereum;
    if (!provider) {
      throw new Error(
        "There was no provider found in the browser. Ensure you have " +
          "MetaMask connected to the current page."
      );
    }
    const { session, sources } = await setupSession(
      testTxHash,
      provider,
      compilations,
      {
        onInit: () => setStatus(SessionStatus.Initializing),
        onFetch: () => setStatus(SessionStatus.Fetching),
        onStart: () => setStatus(SessionStatus.Starting),
        onReady: () => setStatus(SessionStatus.Ready)
      }
    );
    operations.setDebuggerSourcesAndSession({ sources, session });
  };

  let content;
  if (session && sources) {
    content = (
      <>
        <Controls session={session} stepEffect={sessionTick} />
        <Sources
          sources={sources}
          session={session}
          sessionUpdated={sessionUpdated}
        />
      </>
    );
  } else {
    content = status;
  }

  return (
    <>
      <Input
        value={inputValue}
        onChange={setInputValue}
        disabled={inputsDisabled}
        type="text"
        placeholder="Transaction hash"
      />
      <Button onClick={initDebugger} disabled={formDisabled}>
        Debug
      </Button>

      {content}
    </>
  );
}

export default Debugger;
