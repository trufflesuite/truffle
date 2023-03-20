import { useState, useEffect } from "react";
import { Input, Button } from "@mantine/core";
import { useInputState, useCounter } from "@mantine/hooks";
import Controls from "src/components/composed/Debugger/Controls";
import Sources from "src/components/composed/Debugger/Sources";
import Variables from "src/components/composed/Debugger/Variables";
import Breakpoints from "src/components/composed/Debugger/Breakpoints";
import { initDebugger, SessionStatus } from "src/utils/debugger";
import { useDash } from "src/hooks";
import { getCurrentSourceRange } from "src/utils/debugger";
import type { BreakpointType, SourceRange } from "src/utils/debugger";

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

  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null);

  let currentSourceRange: SourceRange | undefined, currentStep;
  if (session) {
    currentSourceRange = getCurrentSourceRange(session);
    currentStep = session.view(session.selectors.trace.index);
  }

  const scrollToLine = ({
    sourceId,
    line
  }: {
    sourceId: string;
    line: number;
  }) => {
    const lineNumber = line + 1;
    const scrollTarget = document.getElementsByClassName(
      `${sourceId.slice(-10)}-${lineNumber}`
    );
    if (scrollTarget[0]) {
      scrollTarget[0].scrollIntoView({ block: "center" });
    }
  };

  useEffect(() => {
    if (currentSourceRange) {
      const { source, start } = currentSourceRange!;
      scrollToLine({ sourceId: source.id, line: start.line });
    }
  }, [currentSourceRange]);

  const handleBreakpointComponentClick = ({
    sourceId,
    line
  }: BreakpointType) => {
    setCurrentSourceId(sourceId);
    // @ts-ignore
    scrollToLine({ sourceId, line });
  };

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

  const onButtonClick = () => {
    initDebugger({
      operations,
      setUnknownAddresses,
      setStatus
    });
  };

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
          <Button onClick={onButtonClick} disabled={formDisabled}>
            Debug
          </Button>
        </div>
      </div>

      {content}
    </div>
  );
}

export default Debugger;
