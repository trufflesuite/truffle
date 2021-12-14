import React from "react";
import { Box } from "ink";
type ScreenProps = {
  mode: string;
  children: React.ReactNode;
};

export const Screen = ({ children }: ScreenProps) => {
  return <Box>{children}</Box>;
};

type RouterProps = {
  mode: string;
  children: React.ReactNode[] | React.ReactNode;
};

export const ScreenRouter = ({ mode, children }: RouterProps) => {
  const childNode = React.Children.toArray(children).filter(child => {
    if (React.isValidElement(child) && child.props.mode === mode) {
      return child;
    }
    return null;
  });

  return <Box>{childNode}</Box>;
};
