import React, { useState } from "react";
import { Box, useInput } from "ink";

type MenuProps = {
  children: React.ReactNode[];
  onEnterPress: (mode: string) => void;
};

export const Menu = ({ children, onEnterPress }: MenuProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const changeSelectedIndex = (newSelectedIndex: number) => {
    if (newSelectedIndex < 0) newSelectedIndex = 0;
    if (newSelectedIndex > children.length - 1)
      newSelectedIndex = children.length - 1;

    setSelectedIndex(newSelectedIndex);
  };

  useInput((_input, key) => {
    if (key.downArrow) {
      changeSelectedIndex(selectedIndex + 1);
    }
    if (key.upArrow) {
      changeSelectedIndex(selectedIndex - 1);
    }
  });

  const childrenWithProps = React.Children.map(children, (child, index) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        selected: index === selectedIndex,
        onEnterPress,
        index: index + 1
      });
    }
    return child;
  });

  return <Box flexDirection="column">{childrenWithProps}</Box>;
};
