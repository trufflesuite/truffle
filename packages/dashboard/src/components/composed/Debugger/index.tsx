import { useState, useEffect } from "react";
import { Input, Button, Header, Grid, createStyles } from "@mantine/core";
import { useInputState, useCounter, useLocalStorage } from "@mantine/hooks";
import Controls from "src/components/composed/Debugger/Controls";
import Sources from "src/components/composed/Debugger/Sources";
import Variables from "src/components/composed/Debugger/Variables";
import Breakpoints from "src/components/composed/Debugger/Breakpoints";
import Stack from "src/components/composed/Debugger/Stack";
import PreparingSession from "src/components/composed/Debugger/PreparingSession";
import Home from "src/components/composed/Debugger/Home";
import ErrorNotification from "src/components/composed/Debugger/ErrorNotification";
import {
  initDebugger,
  SessionStatus
} from "src/components/composed/Debugger/utils";
import { useDash } from "src/hooks";
import { getCurrentSourceRange } from "src/components/composed/Debugger/utils";
import type {
  BreakpointType,
  SourceRange
} from "src/components/composed/Debugger/utils";

const useStyles = createStyles(theme => ({
  debugger: {
    height: "100vh",
    overflowY: "hidden",
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][8]
        : theme.colors["truffle-beige"][3]
  },
  inputGroup: {
    paddingTop: 26,
    paddingLeft: 32,
    paddingRight: 32,
    display: "flex",
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][8]
        : theme.colors["truffle-beige"][3]
  },
  mainContent: {
    height: "calc(100vh - 108px)",
    paddingBottom: 36,
    margin: 32,
    fontSize: 12,
    fontWeight: 700
  },
  fullHeight: {
    height: "100%"
  }
}));

function Debugger(): JSX.Element {
  const { classes } = useStyles();
  const [inputValue, setInputValue] = useInputState("");
  const [sessionUpdated, { increment: sessionTick }] = useCounter();
  const {
    operations,
    state: {
      debugger: { sources, unknownAddresses, session, txToRun }
    }
  } = useDash()!;

  const [etherscanApiKey] = useLocalStorage({ key: "etherscan-api-key" });
  const [error, setError] = useState<Error>();
  const [loggingOutput, setLoggingOutput] = useState<string>("");
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.Inactive);

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

  const formDisabled = inputsDisabled;
  // !/0x[a-z0-9]{64}/i.test(inputValue) || inputsDisabled;

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
    const lineId = `${sourceId.slice(-10)}-${lineNumber}`;
    const targetLine: any = document.getElementById(lineId);
    if (targetLine) {
      const offsetTop = targetLine.offsetTop;
      // @ts-ignore
      const scroller = document.getElementById(`source-${sourceId.slice(-10)}`);
      // @ts-ignore
      const scrollerHeight = scroller.offsetHeight;
      // @ts-ignore - approx. 60% gets the line to the middle of the container
      scroller.scrollTop = offsetTop - scrollerHeight * 0.6;
    }
  };

  const onButtonClick = async () => {
    const provider = window.ethereum;
    if (!provider) {
      throw new Error(
        "There was no provider found in the browser. Ensure you have " +
          "MetaMask connected to the current page."
      );
    }
    const networkId = await provider.request({
      // @ts-ignore
      method: "net_version",
      // @ts-ignore
      params: []
    });
    const ganacheOptions = {
      fork: { provider },
      logging: {
        logger: {
          log: (message: string) => {
            setLoggingOutput(message);
          }
        }
      }
    };
    const fetchingOptions = {
      networkId,
      etherscanApiKey
    };
    const txHash = inputValue === "" ? undefined : inputValue;
    try {
      await initDebugger({
        ganacheOptions,
        operations,
        setStatus,
        provider,
        fetchingOptions,
        txHash
      });
    } catch (error) {
      setError(error as Error);
    }
  };

  const buttonStyles = {
    height: "42px",
    borderTopLeftRadius: "0px",
    borderBottomLeftRadius: "0px"
  };

  // scroll to highlighted source as debugger steps
  useEffect(() => {
    if (isSourceRange(currentSourceRange) && currentSourceRange.source.id) {
      const { source, start } = currentSourceRange!;
      scrollToLine({ sourceId: source.id, line: start.line });
    }
  });

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

  if (session) {
    currentSourceRange = getCurrentSourceRange(session);
    currentStep = session.view(session.selectors.trace.index);
  }

  let content;
  if (session && sources && isSourceRange(currentSourceRange)) {
    content = (
      <div className={classes.mainContent}>
        <Grid
          className={classes.fullHeight}
          columns={6}
          gutter={5}
          gutterXs="md"
          gutterMd="xl"
          gutterXl={50}
        >
          <Grid.Col span={4} className={classes.fullHeight}>
            <Sources
              sources={sources}
              unknownAddresses={unknownAddresses}
              session={session}
              sessionUpdated={sessionUpdated}
              currentSourceRange={currentSourceRange}
              currentSourceId={currentSourceId}
              setCurrentSourceId={setCurrentSourceId}
            />
          </Grid.Col>
          <Grid.Col span={2} className={classes.fullHeight}>
            <Variables currentStep={currentStep} session={session} />
            <Breakpoints
              sources={sources}
              handleBreakpointComponentClick={handleBreakpointComponentClick}
              handleBreakpointDeleteClick={handleBreakpointDeleteClick}
            />
            <Stack session={session} currentStep={currentStep} />
          </Grid.Col>
        </Grid>
      </div>
    );
  }

  const preparingSession =
    status === SessionStatus.Initializing ||
    status === SessionStatus.Fetching ||
    status === SessionStatus.Starting;
  let mainBody;
  // we check the session in case the user navigated elsewhere in dashboard and
  // then comes back to the debugger - their session will still be loaded
  if (status === SessionStatus.Inactive && !session) {
    mainBody = <Home />;
  } else if (preparingSession) {
    mainBody = <PreparingSession ganacheLoggingOutput={loggingOutput} />;
  } else {
    mainBody = content;
  }

  if (error) {
    return <ErrorNotification error={error} />;
  } else {
    return (
      <div className={classes.debugger}>
        <Header height={66} className={classes.inputGroup}>
          <Controls session={session} stepEffect={sessionTick} />
          <div className="truffle-debugger-input-and-button">
            <Input
              style={{ height: "42px", marginLeft: "34px" }}
              value={inputValue}
              onChange={setInputValue}
              disabled={inputsDisabled}
              type="text"
              placeholder="Transaction hash"
            />
            {txToRun ? null : (
              <Button
                onClick={onButtonClick}
                disabled={formDisabled}
                style={buttonStyles}
              >
                Debug
              </Button>
            )}
          </div>
        </Header>
        {mainBody}
      </div>
    );
  }
}

export default Debugger;
