import { useEffect, useRef } from "react";
import { basename } from "path";
import { createStyles, Tabs } from "@mantine/core";
import Source from "src/components/composed/Debugger/Sources/Source";
import UnknownSource from "src/components/composed/Debugger/Sources/UnknownSource";
import type {
  SourceRange,
  Session,
  Source as SourceType
} from "src/utils/debugger";

const useStyles = createStyles((theme, _params, _getRef) => ({
  maxHeight: {
    height: "100%"
  },
  sourceContent: {
    height: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-beige"][3]
        : theme.colors["truffle-brown"][3]
  },
  tabs: {
    fontSize: 16,
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][5]
        : theme.colors["truffle-beige"][3],
    borderStyle: "solid",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderColor:
      theme.colorScheme === "dark"
        ? theme.colors["truffle-brown"][5]
        : theme.colors["truffle-beige"][3]
  }
}));

interface SourcesProps {
  session: Session;
  sessionUpdated: any;
  sources: SourceType[];
  currentSourceRange: SourceRange;
  unknownAddresses: string[];
  currentSourceId: string | null;
  setCurrentSourceId: (sourceId: string) => void;
}

function Sources({
  sources,
  session,
  sessionUpdated,
  currentSourceRange,
  unknownAddresses,
  currentSourceId,
  setCurrentSourceId
}: SourcesProps): JSX.Element {
  const { classes } = useStyles();
  const currentSourceIdRef = useRef(currentSourceId);
  currentSourceIdRef.current = currentSourceId;

  // initialize sources after we get all of them
  useEffect(() => {
    if (currentSourceId === null) {
      const sourceIds = sources.map(({ id }) => id);
      setCurrentSourceId(sourceIds[0]);
    }
  }, [sources, currentSourceId, setCurrentSourceId]);

  useEffect(() => {
    const sessionSourceId = currentSourceRange.source.id;
    if (sessionSourceId !== currentSourceIdRef.current) {
      setCurrentSourceId(sessionSourceId);
    }
  }, [
    session,
    sessionUpdated,
    currentSourceRange.source.id,
    setCurrentSourceId
  ]);

  let sourcesContent, unknownSourcesContent;
  if (currentSourceId !== null) {
    sourcesContent = sources.map((source: SourceType) => (
      <Tabs.Panel
        key={source.id}
        value={source.id}
        className={classes.maxHeight}
      >
        <Source source={source} sourceRange={currentSourceRange} />
      </Tabs.Panel>
    ));
    unknownSourcesContent = unknownAddresses.map((address: string) => (
      <Tabs.Panel key={address} value={address} className={classes.maxHeight}>
        <UnknownSource address={address} />
      </Tabs.Panel>
    ));
  }

  return (
    // @ts-ignore
    <Tabs
      value={currentSourceId}
      onTabChange={setCurrentSourceId}
      style={{ height: "100%" }}
    >
      <Tabs.List>
        {sources.map((source: SourceType) => (
          <Tabs.Tab key={source.id} value={source.id} className={classes.tabs}>
            {basename(source.sourcePath)}
          </Tabs.Tab>
        ))}
        {unknownAddresses.map((address: string) => (
          <Tabs.Tab key={address} value={address} className={classes.tabs}>
            Unknown Contract
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <div className={classes.sourceContent}>
        {sourcesContent}
        {unknownSourcesContent}
      </div>
    </Tabs>
  );
}

export default Sources;
