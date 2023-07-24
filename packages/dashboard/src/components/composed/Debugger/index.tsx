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
  forkNetworkWithTxAndInitDebugger,
  SessionStatus
} from "src/components/composed/Debugger/utils";
import { useDash } from "src/hooks";
import type { BreakpointType } from "src/components/composed/Debugger/utils";
import { etherscanApiKeyName } from "src/utils/constants";

const useStyles = createStyles(theme => ({
  debugger: {
    height: "100vh",
    overflowY: "hidden"
  },
  inputGroup: {
    paddingTop: 26,
    paddingLeft: 32,
    paddingRight: 32,
    display: "flex",
    border: "none",
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][8]
        : theme.colors["truffle-beige"][3]
  },
  inputAndButton: {
    "display": "flex",
    "flexGrow": 1,
    "& > div > input": {
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
      border: 0,
      height: 42
    }
  },
  button: {
    height: "42px",
    borderTopLeftRadius: "0px",
    borderBottomLeftRadius: "0px"
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

  const [etherscanApiKey] = useLocalStorage({ key: etherscanApiKeyName });
  const [error, setError] = useState<Error>();
  const [loggingOutput, setLoggingOutput] = useState<string>("");
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.Inactive);

  if (txToRun && status === SessionStatus.Inactive) {
    setStatus(SessionStatus.Initializing);
    forkNetworkWithTxAndInitDebugger({
      tx: txToRun,
      operations,
      setStatus,
      etherscanApiKey,
      setLoggingOutput
    });
  }

  // goToBreakpoint stores breakpoint info when a user clicks on one
  // so we can jump to it in Sources
  const [goToBreakpoint, setGoToBreakpoint] = useState<BreakpointType | null>(
    null
  );
  const inputsDisabled =
    status === SessionStatus.PreparingForInitialization ||
    status === SessionStatus.Initializing ||
    status === SessionStatus.Fetching ||
    status === SessionStatus.Starting;
  const formDisabled = !/0x[a-z0-9]{64}/i.test(inputValue) || inputsDisabled;

  // currentSourceId is the "active" source displayed in Sources
  const [currentSourceId, setCurrentSourceId] = useState<string | undefined>(
    undefined
  );

  const scrollToLine = ({
    sourceId,
    line
  }: {
    sourceId: string;
    line: number;
  }) => {
    const lineNumber = line + 1;
    const lineId = `${sourceId.slice(-10)}-${lineNumber}`;
    const targetLine: HTMLElement | null = document.getElementById(lineId);
    if (targetLine) {
      const offsetTop = targetLine.offsetTop;
      const scroller = document.getElementById(
        `source-${sourceId.slice(-10)}`
      )!;
      const scrollerHeight = scroller.offsetHeight;
      // approx. 60% gets the line to the middle of the container
      scroller.scrollTop = offsetTop - scrollerHeight * 0.6;
    }
  };

  const startDebugger = async () => {
    setStatus(SessionStatus.PreparingForInitialization);
    const provider = window.ethereum as any;
    const networkId = await provider.request({
      method: "net_version",
      params: []
    });
    const ganacheOptions = {
      fork: { provider },
      // normally Ganache forks 5 blocks behind the current block, turn this off
      preLatestConfirmations: 0,
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

  const onButtonClick = () => startDebugger();

  // make input responsive to "enter" key
  const handleKeyDown = (e: any) => {
    if (formDisabled) return;
    if (e.keyCode === 13) {
      startDebugger();
    }
  };

  // check whether we need to scroll to a breakpoint
  // this is to ensure the source has fully rendered before scrolling
  useEffect(() => {
    if (goToBreakpoint !== null) {
      const { sourceId, line } = goToBreakpoint;
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
      line
    });
  };

  let content;
  if (session && sources) {
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
              currentSourceId={currentSourceId}
              setCurrentSourceId={setCurrentSourceId}
              scrollToLine={scrollToLine}
            />
          </Grid.Col>
          <Grid.Col span={2} className={classes.fullHeight}>
            <Variables />
            <Breakpoints
              sources={sources}
              handleBreakpointComponentClick={handleBreakpointComponentClick}
              handleBreakpointDeleteClick={handleBreakpointDeleteClick}
            />
            <Stack />
          </Grid.Col>
        </Grid>
      </div>
    );
  }

  const preparingSession =
    status === SessionStatus.PreparingForInitialization ||
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
          <div className={classes.inputAndButton}>
            <Input
              style={{ height: "42px", marginLeft: "34px" }}
              value={inputValue}
              onChange={setInputValue}
              disabled={inputsDisabled}
              type="text"
              placeholder="Transaction hash"
              onKeyDown={handleKeyDown}
            />
            <Button
              onClick={onButtonClick}
              disabled={formDisabled}
              classNames={{ root: classes.button }}
            >
              Debug
            </Button>
          </div>
        </Header>
        {mainBody}
      </div>
    );
  }
}

export default Debugger;
