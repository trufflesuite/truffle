import React from "react";
import { Box, Text, useInput } from "ink";
import * as figures from "figures";
import { brandColors } from "../../brandColors";

const { truffleBlue, truffleWhite } = brandColors;

type MenuItemProps = {
  children: React.ReactNode[] | string;
  index?: number;
  selected?: boolean;
  onEnterPress?: (mode: string) => void;
  mode: string;
};

export const MenuItem = ({
  children,
  index,
  selected,
  onEnterPress,
  mode
}: MenuItemProps) => {
  useInput((_input, key) => {
    if (key.return && onEnterPress && selected) onEnterPress(mode);
  });

  return (
    <Box>
      <Box marginRight={1} width={1}>
        <Text color={selected ? truffleBlue : truffleWhite}>
          {selected && figures.pointer}
        </Text>
      </Box>
      <Box marginRight={1}>
        <Text color={selected ? truffleBlue : truffleWhite}>{index}.</Text>
      </Box>
      <Text color={selected ? truffleBlue : truffleWhite}>{children}</Text>
    </Box>
  );
};
