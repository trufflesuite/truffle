import { useEffect, useRef } from "react";
import { basename } from "path";
import React from "react";
import { createStyles, Tabs } from "@mantine/core";
import Source from "src/components/composed/Debugger/Sources/Source";
import UnknownSource from "src/components/composed/Debugger/Sources/UnknownSource";
import type {
  SourceRange,
  Session,
  Source as SourceType
} from "src/utils/debugger";

const useStyles = createStyles((_theme, _params, _getRef) => ({
  maxHeight: {
    height: "100%"
  },
  sourceContent: {
    height: "100%"
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
  const scrollRef = React.createRef();

  // initialize sources after we get all of them
  useEffect(() => {
    if (currentSourceId === null) {
      const sourceIds = sources.map(({ id }) => id);
      setCurrentSourceId(sourceIds[0]);
    }
  }, [sources, currentSourceId, setCurrentSourceId]);

  useEffect(() => {
    if (scrollRef) {
      // @ts-ignore
      scrollRef.current.scrollIntoView();
    }
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
        className={classes.sourceContent}
      >
        <Source source={source} sourceRange={currentSourceRange} />
      </Tabs.Panel>
    ));
    unknownSourcesContent = unknownAddresses.map((address: string) => (
      <Tabs.Panel
        key={address}
        value={address}
        className={classes.sourceContent}
      >
        <UnknownSource address={address} />
      </Tabs.Panel>
    ));
  }

  return (
    <Tabs
      value={currentSourceId}
      onTabChange={setCurrentSourceId}
      className={classes.maxHeight}
    >
      <Tabs.List>
        {sources.map((source: SourceType) => (
          <Tabs.Tab key={source.id} value={source.id}>
            {basename(source.sourcePath)}
          </Tabs.Tab>
        ))}
        {unknownAddresses.map((address: string) => (
          <Tabs.Tab key={address} value={address}>
            Unknown Contract
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {sourcesContent}
      {unknownSourcesContent}
    </Tabs>
  );
}

export default Sources;
