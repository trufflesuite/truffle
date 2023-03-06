import React from "react";
import { useEffect, useState, useRef } from "react";
import { basename } from "path";
import { Tabs } from "@mantine/core";
import Source from "src/components/composed/Debugger/Sources/Source";
import type {
  SourceRange,
  Session,
  Source as SourceType
} from "src/utils/debugger";

interface SourcesProps {
  session: Session;
  sessionUpdated: any;
  sources: SourceType[];
  currentSourceRange: SourceRange;
  unknownAddresses: string[];
}

function Sources({
  sources,
  session,
  sessionUpdated,
  currentSourceRange,
  unknownAddresses
}: SourcesProps): JSX.Element {
  const sourceIds = sources.map(({ id }) => id);
  const [currentSourceId, setCurrentSourceId] = useState(sourceIds[0]);
  const currentSourceIdRef = useRef(currentSourceId);
  currentSourceIdRef.current = currentSourceId;
  const scrollRef = React.createRef();

  useEffect(() => {
    if (scrollRef?.current) {
      // @ts-ignore
      scrollRef.current.scrollIntoView();
    }
    const sessionSourceId = currentSourceRange.source.id;
    if (sessionSourceId !== currentSourceIdRef.current) {
      setCurrentSourceId(sessionSourceId);
    }
  }, [session, sessionUpdated, currentSourceRange.source.id, scrollRef]);
  const unknownSources = unknownAddresses.map(address => ({
    id: address,
    sourcePath: "",
    contents: `Could not locate source material for address ${address}.`,
    language: ""
  }));
  return (
    // @ts-ignore
    <Tabs value={currentSourceId} onTabChange={setCurrentSourceId}>
      <Tabs.List>
        {sources.map((source: SourceType) => (
          <Tabs.Tab key={source.id} value={source.id}>
            {basename(source.sourcePath)}
          </Tabs.Tab>
        ))}
        {unknownSources.map((source: SourceType) => (
          <Tabs.Tab key={source.id} value={source.id}>
            Unknown Contract
          </Tabs.Tab>
        ))}
      </Tabs.List>

      {sources.map((source: SourceType) => (
        <Tabs.Panel key={source.id} value={source.id}>
          <Source
            scrollRef={scrollRef}
            source={source}
            sourceRange={currentSourceRange}
          />
        </Tabs.Panel>
      ))}
      {unknownSources.map((source: SourceType) => (
        <Tabs.Panel key={source.id} value={source.id}>
          <Source
            scrollRef={undefined}
            source={source}
            sourceRange={currentSourceRange}
          />
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

export default Sources;
