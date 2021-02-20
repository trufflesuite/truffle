import React, { ReactNode, useState, useRef, useEffect } from "react";
import { Box, Text, measureElement } from "ink";

export interface Props {
  entries: {
    name: string;
    node: ReactNode;
  }[];

  spaceBetween?: number;

  entryComponent?: (props: {
    nameComponent: (props: React.PropsWithChildren<{}>) => ReactNode;
    width: number;
    maxNameWidth: number;
    name: string;
    node: ReactNode
  }) => ReactNode;

  nameComponent?: (props: React.PropsWithChildren<{}>) => ReactNode;
}

const DefaultNameComponent = ({ children }: React.PropsWithChildren<{}>) => (
  <Text italic>{children}</Text>
);

const DefaultEntryComponent = ({ nameComponent, maxNameWidth, name, node }) => {
  const nameElement = nameComponent({ children: <Text>{name}: </Text> });

  return (
    <Box>
      <Box width={maxNameWidth} justifyContent="flex-end" flexShrink={0}>
        {nameElement}
      </Box>
      <Box width="100%">
        {node}
      </Box>
    </Box>
  );
}

export const DefinitionList = ({
  entries,
  spaceBetween = 0,
  nameComponent = DefaultNameComponent,
  entryComponent = DefaultEntryComponent
}: Props) => {
  const [width, setWidth] = useState(0);
  const ref = useRef();

  useEffect(() => {
    // @ts-ignore
    setWidth(measureElement(ref.current).width);
  }, []);

  const maxNameWidth = Math.max(0, ...entries.map(({ name }) => name.length)) + 2;

  // @ts-ignore
  return <Box ref={ref} flexDirection="column">
    {
      ...entries.map(({ name, node }, index) => {
        const entryElement = entryComponent({
          width,
          maxNameWidth,
          nameComponent,
          name,
          node
        });

        return (
          <Box key={index} marginTop={index === 0 ? 0 : spaceBetween}>
            {entryElement}
          </Box>
        );
      })
    }
  </Box>;
}
