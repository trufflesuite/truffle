import { useState } from "react";
import { Input, Button } from "@mantine/core";
import { useInputState, useCounter } from "@mantine/hooks";
import Controls from "src/components/composed/Debugger/Controls";
import Sources from "src/components/composed/Debugger/Sources";
import Variables from "src/components/composed/Debugger/Variables";
import { setupSession, SessionStatus } from "src/utils/debugger";
import { useDash } from "src/hooks";
import { getCurrentSourceRange } from "src/utils/debugger";

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
  const [unknownAddresses, setUnknownAddresses] = useState<string[]>([]);
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
      "0x8d093f67b6501ff576f259a683ac3ac0a0adb3280b66e272ebbaf691242d99b1";
    // "0xdadd2f626c81322ec8a2a20dec71c780f630ef1fab7393c675a8843365477389";
    // "0x2650974eb6390dc787df16ab86308822855f907e7463107248cfd5e424923176"

    const provider = window.ethereum;
    if (!provider) {
      throw new Error(
        "There was no provider found in the browser. Ensure you have " +
          "MetaMask connected to the current page."
      );
    }
    const { session, sources, unknownAddresses } = await setupSession(
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
    if (unknownAddresses.length > 0) {
      setUnknownAddresses(unknownAddresses);
    }
    operations.setDebuggerSessionData({ sources, session });
  };

  let currentSourceRange, currentStep;
  if (session) {
    currentSourceRange = getCurrentSourceRange(session);
    currentStep = session.view(session.selectors.trace.index);
  }

  let content;
  if (session && sources && currentSourceRange) {
    content = (
      <>
        <Controls session={session} stepEffect={sessionTick} />
        <Sources
          sources={sources}
          unknownAddresses={unknownAddresses}
          session={session}
          sessionUpdated={sessionUpdated}
          currentSourceRange={currentSourceRange}
        />
        <Variables currentStep={currentStep} session={session} />
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
