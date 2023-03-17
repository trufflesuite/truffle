import { useEffect, useRef } from "react";
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
  const currentSourceIdRef = useRef(currentSourceId);
  currentSourceIdRef.current = currentSourceId;

  useEffect(() => {
    if (currentSourceId === null) {
      const sourceIds = sources.map(({ id }) => id);
      setCurrentSourceId(sourceIds[0]);
    }
  });

  useEffect(() => {
    const sessionSourceId = currentSourceRange.source.id;
    if (sessionSourceId !== currentSourceIdRef.current) {
      setCurrentSourceId(sessionSourceId);
    }
  }, [session, sessionUpdated, currentSourceRange.source.id]);

  let sourcesContent, unknownSourcesContent;
  if (currentSourceId !== null) {
    sourcesContent = sources.map((source: SourceType) => (
      <Tabs.Panel
        key={source.id}
        value={source.id}
        className="truffle-debugger-sources"
      >
        <Source
          source={source}
          sourceRange={currentSourceRange}
          sourceId={currentSourceId}
        />
      </Tabs.Panel>
    ));
    unknownSourcesContent = unknownAddresses.map((address: string) => (
      <Tabs.Panel key={address} value={address}>
        <UnknownSource address={address} />
      </Tabs.Panel>
    ));
  }

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
      {sourcesContent}
      {unknownSourcesContent}
    </Tabs>
  );
}

export default Sources;
