import { useState } from "react";
import { Input, Select, Button } from "@mantine/core";
import { useInputState, useCounter } from "@mantine/hooks";
import Controls from "src/components/composed/Debugger/Controls";
import Sources from "src/components/composed/Debugger/Sources";
import { setupSession, SessionStatus } from "src/utils/debugger";
import { useDash } from "src/hooks";

function Debugger(): JSX.Element {
  const [inputValue, setInputValue] = useInputState("");
  const [selectValue, setSelectValue] = useInputState("");
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
    // !/0x[a-z0-9]{64}/i.test(inputValue) || !selectValue || inputsDisabled;
    inputsDisabled;

  const initDebugger = async () => {
    const compilations = await operations.getCompilations();
    const testTxHash =
      "0xdadd2f626c81322ec8a2a20dec71c780f630ef1fab7393c675a8843365477389";
    const { session, relevantSources } = await setupSession(
      testTxHash,
      selectValue,
      compilations,
      {
        onInit: () => setStatus(SessionStatus.Initializing),
        onFetch: () => setStatus(SessionStatus.Fetching),
        onStart: () => setStatus(SessionStatus.Starting),
        onReady: () => setStatus(SessionStatus.Ready)
      }
    );
    operations.setDebuggerSourcesAndSession({
      sources: relevantSources,
      session
    });
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
      <Select
        value={selectValue}
        onChange={setSelectValue}
        disabled={inputsDisabled}
        data={[
          { value: "mainnet", label: "Mainnet" },
          { value: "goerli", label: "Görli" },
          { value: "sepolia", label: "Sepolia" }
        ]}
      />
      <Button onClick={initDebugger} disabled={formDisabled}>
        Debug
      </Button>

      {content}
    </>
  );
}

export default Debugger;
