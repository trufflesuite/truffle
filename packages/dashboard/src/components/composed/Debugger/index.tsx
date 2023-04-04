import { useState, useEffect } from "react";
import { Input, Button, Notification } from "@mantine/core";
import { useInputState, useCounter } from "@mantine/hooks";
import Controls from "src/components/composed/Debugger/Controls";
import Sources from "src/components/composed/Debugger/Sources";
import Variables from "src/components/composed/Debugger/Variables";
import Breakpoints from "src/components/composed/Debugger/Breakpoints";
import Stack from "src/components/composed/Debugger/Stack";
import {
  forkNetworkWithTxAndInitDebugger,
  initDebugger,
  SessionStatus
} from "src/utils/debugger";
import { useDash } from "src/hooks";
import { getCurrentSourceRange } from "src/utils/debugger";
import type { BreakpointType, SourceRange } from "src/utils/debugger";

function Debugger(): JSX.Element {
  const [inputValue, setInputValue] = useInputState("");
  const [sessionUpdated, { increment: sessionTick }] = useCounter();
  const {
    operations,
    state: {
      debugger: { sources, session, txToRun }
    }
  } = useDash()!;

  const [error, setError] = useState<null | Error>(null);
  const [status, setStatus] = useState<SessionStatus>();

  // keep track of addresses for which we can't obtain source material
  const [unknownAddresses, setUnknownAddresses] = useState<string[]>([]);

  // goToBreakpoint stores breakpoint info when a user clicks on one
  // so we can jump to it in Sources
  const [goToBreakpoint, setGoToBreakpoint] = useState<BreakpointType | null>(
    null
  );
  const inputsDisabled =
    status === SessionStatus.Initializing ||
    status === SessionStatus.Fetching ||
    status === SessionStatus.Starting;

  // currentSourceId is the "active" source displayed in Sources
  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null);

  const formDisabled =
    // !/0x[a-z0-9]{64}/i.test(inputValue) || inputsDisabled;
    inputsDisabled;

  let currentSourceRange: SourceRange | Partial<SourceRange> = {
    traceIndex: -1
  };
  let currentStep;

  // wait until the debugger has been initialized and then get source info
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

  // scroll to highlighted source as debugger steps
  useEffect(() => {
    if (isSourceRange(currentSourceRange)) {
      const { source, start } = currentSourceRange!;
      scrollToLine({ sourceId: source!.id, line: start!.line });
    }
  }, [currentSourceRange.traceIndex]);

  // check whether we need to scroll to a breakpoint
  // this is to ensure the source has fully rendered before scrolling
  useEffect(() => {
    if (goToBreakpoint !== null) {
      const { sourceId, line } = goToBreakpoint;
      // @ts-ignore
      scrollToLine({ sourceId, line });
      setGoToBreakpoint(null);
    }
  }, [goToBreakpoint]);

  const handleBreakpointComponentClick = ({
    sourceId,
    line
  }: BreakpointType) => {
    setCurrentSourceId(sourceId);
    setGoToBreakpoint({ sourceId, line });
  };

  const handleBreakpointDeleteClick = ({ sourceId, line }: BreakpointType) => {
    operations.toggleDebuggerBreakpoint({
      sourceId,
      line: parseInt(line)
    });
  };

  const isSourceRange = (item: any): item is SourceRange => {
    // when source exists, that means it should be a full SourceRange
    return item.source !== undefined;
  };

  let content;
  if (session && sources && isSourceRange(currentSourceRange)) {
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
            handleBreakpointDeleteClick={handleBreakpointDeleteClick}
          />
          <Stack session={session} currentStep={currentStep} />
        </div>
      </div>
    );
  } else {
    content = status;
  }

  const onButtonClick = async () => {
    try {
      await initDebugger({
        chainOptions: {},
        operations,
        setUnknownAddresses,
        setStatus
      });
    } catch (err: any) {
      setError(err);
    }
  };

  // tx simulation - forks, runs the tx, and opens the debugger to step through
  useEffect(() => {
    if (txToRun) {
      forkNetworkWithTxAndInitDebugger({
        tx: txToRun,
        operations,
        setUnknownAddresses,
        setStatus
      });
    }
  }, [txToRun]);

  if (error) {
    return (
      <div className="truffle-debugger">
        <Notification
          title="an error occurred"
          className="truffle-debugger-error"
        >
          An error occurred while initializing the debugger.
          {`Error: ${error.message}`}
        </Notification>
      </div>
    );
  } else {
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
            {txToRun ? null : (
              <Button onClick={onButtonClick} disabled={formDisabled}>
                Debug
              </Button>
            )}
          </div>
        </div>

        {content}
      </div>
    );
  }
}

export default Debugger;
