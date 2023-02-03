import { useEffect, useState, useRef } from "react";
import { basename } from "path";
import { Tabs } from "@mantine/core";
import Source from "src/components/composed/Debugger/Sources/Source";
import { getSources, getCurrentSourceRange } from "src/utils/debugger";
import type { Session } from "src/utils/debugger";

interface SourcesProps {
  session: Session;
  sessionUpdated: any;
}

function Sources({ session, sessionUpdated }: SourcesProps): JSX.Element {
  const sources = getSources(session);
  const sourceIds = sources.map(({ id }) => id);
  const currentSourceRange = getCurrentSourceRange(session);
  const [currentSourceId, setCurrentSourceId] = useState(sourceIds[0]);
  const currentSourceIdRef = useRef(currentSourceId);
  currentSourceIdRef.current = currentSourceId;

  useEffect(() => {
    const sessionSourceId = currentSourceRange.source.id;
    if (sessionSourceId !== currentSourceIdRef.current) {
      setCurrentSourceId(sessionSourceId);
    }
  }, [session, sessionUpdated, currentSourceRange.source.id]);

  return (
    <Tabs value={currentSourceId} onTabChange={setCurrentSourceId}>
      <Tabs.List>
        {sources.map(source => (
          <Tabs.Tab key={source.id} value={source.id}>
            {basename(source.sourcePath)}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      {sources.map(source => (
        <Tabs.Panel key={source.id} value={source.id}>
          <Source source={source} sourceRange={currentSourceRange} />
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

export default Sources;
