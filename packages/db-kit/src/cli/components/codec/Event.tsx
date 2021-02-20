import util from "util";
import React, { useState, useRef, useEffect } from "react";
import { Box, Text, measureElement } from "ink";

import type { Log } from "@truffle/decoder";
import { LogDecoding } from "@truffle/codec";

import { DefinitionList } from "@truffle/db-kit/cli/components/DefinitionList";

import { Arguments } from "./Arguments";

export interface EventProps {
  log: Log;
  decoding: LogDecoding | undefined
}

export const Event = ({
  log,
  decoding
}: EventProps) => {
  const [width, setWidth] = useState(0);
  const ref = useRef();

  useEffect(() => {
    // @ts-ignore
    setWidth(measureElement(ref.current).width);
  }, []);

  const element = !decoding
    ? <Box flexDirection="column">
        <Text bold>Unknown event</Text>
        <Text italic>Address:</Text>
        <Box marginLeft={2}>
          <Text color="gray">{log.address}</Text>
        </Box>
        <Text italic>Data:</Text>
        <Box marginLeft={2}>
          <Text color="gray">{log.data}</Text>
        </Box>
        <Text italic>Topics:</Text>
        {
          log.topics.length === 0
            ? <Box marginLeft={2}>
                <Text color="gray" italic>(none)</Text>
              </Box>
            : log.topics.map((topic, index) => (
                <Box marginLeft={2} key={index}>
                  <Text color="gray">
                    {topic}
                    {index !== log.topics.length - 1 ? "," : ""}
                  </Text>
                </Box>
              ))
        }
      </Box>
    : <Box flexDirection="column">
        <Text>
          {decoding.kind === "anonymous"
            ? <Text dimColor italic>{"<anonymous> "}</Text>
            : <></>}
          <Text bold>
            {decoding.definedIn
              ? decoding.definedIn.typeName
              : decoding.class.typeName}
            {"."}
            {decoding.abi.name}
          </Text>
          <Text>(</Text>
        </Text>
        <Box paddingLeft={2}>
          <Arguments args={decoding.arguments} />
        </Box>
        <Text>)</Text>
      </Box>

  // @ts-ignore
  return <Box ref={ref}>
    {element}
  </Box>;
};
