import util from "util";
import React, { useState, useRef, useEffect } from "react";
import { Box, Text, measureElement } from "ink";

import { Format } from "@truffle/codec";

export interface Props {
  result: Format.Values.Result;
  indexed?: boolean;
}

export const Value = ({
  result,
  indexed = false
}: Props) => {
  const [width, setWidth] = useState(0);
  const ref = useRef();

  useEffect(() => {
    // @ts-ignore
    setWidth(measureElement(ref.current).width);
  }, []);

  // finite breakLength prevents tight-packing; this wastes screen real estate
  // particularly for arrays (i.e. give breathing room to structs, e.g.!)
  const { breakLength, compact } =
    result.type.typeClass !== "array"
      ? { breakLength: width, compact: false }
      : { breakLength: Infinity, compact: true };

  // @ts-ignore
  return <Box ref={ref} flexDirection="column" width="100%">
    <Text>{
      util.inspect(new Format.Utils.Inspect.ResultInspector(result), {
        breakLength,
        compact,
        colors: true
      })
    }</Text>
    <Text>
      <Text dimColor>type: </Text>
      <Text bold color="gray">{Format.Types.typeStringWithoutLocation(result.type)}</Text>
    </Text>
    {indexed
      ? <Text dimColor italic>{"<indexed>"}</Text>
      : <></>
    }
  </Box>;
};
