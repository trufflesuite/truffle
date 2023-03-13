import React, { useEffect, useState, useRef } from "react";
import { basename } from "path";
import { Tabs } from "@mantine/core";
import Source from "src/components/composed/Debugger/Sources/Source";
import UnknownSource from "src/components/composed/Debugger/Sources/UnknownSource";
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
      scrollRef.current.scrollIntoView({ block: "center" });
    }
  }, [scrollRef, session]);

  useEffect(() => {
    const sessionSourceId = currentSourceRange.source.id;
    if (sessionSourceId !== currentSourceIdRef.current) {
      setCurrentSourceId(sessionSourceId);
    }
  }, [session, sessionUpdated, currentSourceRange.source.id]);
  return (
    // @ts-ignore
    <Tabs value={currentSourceId} onTabChange={setCurrentSourceId}>
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

      {sources.map((source: SourceType) => (
        <Tabs.Panel
          key={source.id}
          value={source.id}
          className="truffle-debugger-sources"
        >
          <Source
            scrollRef={scrollRef}
            source={source}
            sourceRange={currentSourceRange}
            sourceId={currentSourceId}
          />
        </Tabs.Panel>
      ))}
      {unknownAddresses.map((address: string) => (
        <Tabs.Panel key={address} value={address}>
          <UnknownSource address={address} />
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

export default Sources;
