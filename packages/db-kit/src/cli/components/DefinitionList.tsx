import React, { FC, ReactNode, useState, useRef, useEffect } from "react";
import { Box, Text, measureElement } from "ink";

export interface Props {
  entries: {
    name: string;
    node: ReactNode;
  }[];

  spaceBetween?: number;

  EntryComponent?: EntryComponent;
  NameComponent?: NameComponent;
}

export type EntryComponent = FC<{
  NameComponent: FC;
  width: number;
  maxNameWidth: number;
  name: string;
  node: ReactNode;
}>;

export type NameComponent = FC<{}>;

const DefaultNameComponent: NameComponent = ({ children }) => (
  <Text italic>{children}</Text>
);

const DefaultEntryComponent: EntryComponent = ({
  NameComponent,
  maxNameWidth,
  name,
  node
}) => {
  return (
    <Box>
      <Box width={maxNameWidth} justifyContent="flex-end" flexShrink={0}>
        <NameComponent>
          <Text>{name}: </Text>
        </NameComponent>
      </Box>
      <Box width="100%">{node}</Box>
    </Box>
  );
};

export const DefinitionList = ({
  entries,
  spaceBetween = 0,
  NameComponent = DefaultNameComponent,
  EntryComponent = DefaultEntryComponent
}: Props) => {
  const [width, setWidth] = useState(0);
  const ref = useRef();

  useEffect(() => {
    // @ts-ignore
    setWidth(measureElement(ref.current).width);
  }, []);

  const maxNameWidth =
    Math.max(0, ...entries.map(({ name }) => name.length)) + 2;

  return (
    // @ts-ignore
    <Box ref={ref} flexDirection="column">
      {...entries.map(({ name, node }, index) => {
        return (
          <Box key={index} marginTop={index === 0 ? 0 : spaceBetween}>
            <EntryComponent
              {...{
                NameComponent,
                width,
                maxNameWidth,
                name,
                node
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
};
