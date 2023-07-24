import { useEffect, useRef, useState } from "react";
import { basename } from "path";
import { createStyles, Tabs } from "@mantine/core";
import Source from "src/components/composed/Debugger/Sources/Source";
import UnknownSource from "src/components/composed/Debugger/Sources/UnknownSource";
import type {
  SourceRange,
  Session,
  Source as SourceType,
  UnknownAddress
} from "src/components/composed/Debugger/utils";
import { getCurrentSourceRange } from "src/components/composed/Debugger/utils";

const useStyles = createStyles((theme, _params, _getRef) => ({
  maxHeight: {
    height: "100%"
  },
  sourceContent: {
    height: "98%",
    overflow: "hidden",
    borderStyle: "solid",
    borderRadius: "0px 0px 4px 4px",
    borderWidth: 1,
    borderColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][3]
        : `${theme.colors["truffle-beige"][5]}73`
  },
  tab: {
    fontSize: 16,
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][5]
        : theme.colors["truffle-beige"][3],
    borderStyle: "solid",
    height: 42,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][5]
        : `${theme.colors["truffle-beige"][5]}73`,
    color: theme.colors["truffle-beige"][7]
  },
  activeTab: {
    fontSize: 16,
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][8]
        : theme.colors["truffle-beige"][4],
    color: theme.colorScheme === "dark" ? "white" : "black",
    borderStyle: "solid",
    height: 42,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][5]
        : `${theme.colors["truffle-beige"][5]}73`
  }
}));

interface SourcesProps {
  session: Session;
  sessionUpdated: any;
  sources: SourceType[];
  unknownAddresses: UnknownAddress[] | null;
  currentSourceId: string | undefined;
  setCurrentSourceId: (sourceId: string) => void;
  scrollToLine: (arg: { sourceId: string; line: number }) => void;
}

function Sources({
  sources,
  session,
  sessionUpdated,
  unknownAddresses,
  currentSourceId,
  setCurrentSourceId,
  scrollToLine
}: SourcesProps): JSX.Element {
  const { classes } = useStyles();
  const currentSourceIdRef = useRef(currentSourceId);
  currentSourceIdRef.current = currentSourceId;

  const [currentSourceRange, setCurrentSourceRange] = useState<
    SourceRange | { traceIndex: number; source: any }
  >({
    traceIndex: -1,
    source: {}
  });

  // display the first source when currentSourceRange is `undefined`
  useEffect(() => {
    if (currentSourceId === undefined) {
      setCurrentSourceId(sources[0].id);
    }
  }, [sources, currentSourceId, setCurrentSourceId]);

  useEffect(() => {
    const sessionSourceId = currentSourceRange.source!.id;
    if (sessionSourceId !== currentSourceIdRef.current) {
      setCurrentSourceId(sessionSourceId);
    }
  }, [
    session,
    sessionUpdated,
    currentSourceRange.source.id,
    setCurrentSourceId
  ]);

  useEffect(() => {
    setCurrentSourceRange(getCurrentSourceRange(session));
    // if the starting source is unknown, we may get `undefined` in the source
    // range - in that case we'll initialize it manually from the stacktrace
    if (!currentSourceRange.source?.id && !currentSourceId) {
      const currentContractAddress = session.view(
        session.selectors.stacktrace.current.report
      )[0].address;
      // when the contract is "unknown", the source id will be the address
      // we need this if check so that no loop occurs when the value is falsy
      if (currentContractAddress) {
        setCurrentSourceId(currentContractAddress);
      }
    }
  }, [session.view(session.selectors.trace.index)]);

  const isSourceRange = (item: any): item is SourceRange => {
    return item.source.id !== undefined;
  };

  useEffect(() => {
    if (isSourceRange(currentSourceRange)) {
      const { source, start } = currentSourceRange!;
      scrollToLine({ sourceId: source.id, line: start.line });
    }
  }, [session!.view(session!.selectors.trace.index), currentSourceId]);

  const unknownSourcesExist = unknownAddresses && unknownAddresses.length > 0;

  let sourcesContent, unknownSourcesContent;
  if (isSourceRange(currentSourceRange) && currentSourceId !== undefined) {
    sourcesContent = sources.map((source: SourceType) => (
      <Tabs.Panel
        key={source.id}
        value={source.id}
        className={classes.maxHeight}
      >
        <Source source={source} sourceRange={currentSourceRange} />
      </Tabs.Panel>
    ));
    unknownSourcesContent = !unknownSourcesExist
      ? []
      : unknownAddresses!.map((address: string) => (
          <Tabs.Panel
            key={address}
            value={address}
            className={classes.maxHeight}
          >
            <UnknownSource address={address} />
          </Tabs.Panel>
        ));
  }

  return (
    <Tabs
      value={currentSourceId}
      onTabChange={setCurrentSourceId}
      style={{ height: "100%" }}
    >
      <Tabs.List
        style={{ flexWrap: "nowrap", overflowX: "scroll", overflowY: "hidden" }}
      >
        {sources.map((source: SourceType) => {
          const tabClass =
            currentSourceId === source.id ? classes.activeTab : classes.tab;
          return (
            <Tabs.Tab key={source.id} value={source.id} className={tabClass}>
              {basename(source.sourcePath)}
            </Tabs.Tab>
          );
        })}
        {!unknownSourcesExist
          ? null
          : unknownAddresses!.map((address: string) => {
              const tabClass = (currentSourceId =
                currentSourceId === address ? classes.activeTab : classes.tab);
              return (
                <Tabs.Tab key={address} value={address} className={tabClass}>
                  Unknown Contract
                </Tabs.Tab>
              );
            })}
      </Tabs.List>
      <div className={classes.sourceContent}>
        {sourcesContent}
        {unknownSourcesContent}
      </div>
    </Tabs>
  );
}

export default Sources;
