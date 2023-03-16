import { useState } from "react";
import { Input, Button } from "@mantine/core";
import { useInputState, useCounter } from "@mantine/hooks";
import Controls from "src/components/composed/Debugger/Controls";
import Sources from "src/components/composed/Debugger/Sources";
import Variables from "src/components/composed/Debugger/Variables";
import Breakpoints from "src/components/composed/Debugger/Breakpoints";
import { setupSession, SessionStatus } from "src/utils/debugger";
import { useDash } from "src/hooks";
import { getCurrentSourceRange } from "src/utils/debugger";
import type { SourceRange } from "src/utils/debugger";

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
  const [manualSourceRange, setManualSourceRange] = useState<{
    set: boolean;
    sourceRange: SourceRange | null;
  }>({ set: false, sourceRange: null });
  const inputsDisabled =
    status === SessionStatus.Initializing ||
    status === SessionStatus.Fetching ||
    status === SessionStatus.Starting;
  const formDisabled =
    // !/0x[a-z0-9]{64}/i.test(inputValue) || inputsDisabled;
    inputsDisabled;

  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null);

  const handleBreakpointComponentClick = (sourceRange: SourceRange) => {
    setManualSourceRange({
      set: true,
      sourceRange
    });
  };
  const initDebugger = async () => {
    const compilations = await operations.getCompilations();
    const testTxHash =
      // "0xf5ad7387297428dd152997aab72c190954bcce692daf022bb63ab9aa5f199c33"; // cross contract goerli text tx hash (link verified)
      // "0xfb09532437064597ac2a07f62440dd45e3806d6299e4fc86da6231ab2856f021"; // cross contract goerli test tx hash (dai unverified)
      // "0x8d093f67b6501ff576f259a683ac3ac0a0adb3280b66e272ebbaf691242d99b1";
      "0xdadd2f626c81322ec8a2a20dec71c780f630ef1fab7393c675a8843365477389"; //goerli tx
    // "0x2650974eb6390dc787df16ab86308822855f907e7463107248cfd5e424923176"
    // "0xab2cba8e3e57a173a125d3f77a9a0a485809b8a7098b540a13593631909ccf00"; //dai tx
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
  if (manualSourceRange.set && session) {
    currentSourceRange = manualSourceRange.sourceRange;
    setManualSourceRange({
      set: false,
      sourceRange: manualSourceRange.sourceRange
    });
  } else if (session) {
    currentSourceRange = getCurrentSourceRange(session);
    currentStep = session.view(session.selectors.trace.index);
  }

  let content;
  if (session && sources && currentSourceRange) {
    content = (
      <div className="truffle-debugger-sources-variables">
        <Sources
          sources={sources}
          unknownAddresses={unknownAddresses}
          session={session}
          sessionUpdated={sessionUpdated}
          currentSourceRange={currentSourceRange}
          currentSourceId={currentSourceId}
          setCurrentSourceId={setCurrentSourceId}
        />
        <div className="truffle-debugger-variables-breakpoints">
          <Variables currentStep={currentStep} session={session} />
          <Breakpoints
            sources={sources}
            handleBreakpointComponentClick={handleBreakpointComponentClick}
          />
        </div>
      </div>
    );
  } else {
    content = status;
  }

  return (
    <div className="truffle-debugger">
      <div className="truffle-debugger-input">
        <Controls session={session} stepEffect={sessionTick} />
        <div className="truffle-debugger-input-group">
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
        </div>
      </div>

      {content}
    </div>
  );
}

export default Debugger;
