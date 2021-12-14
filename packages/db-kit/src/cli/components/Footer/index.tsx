import React from "react";
import { Text, Box, useInput, useApp } from "ink";
import { brandColors } from "../../brandColors";

const { truffleWhite, truffleBlue } = brandColors;

type FooterProps = {
  returnToMenu: () => void;
};

export const Footer = ({ returnToMenu }: FooterProps) => {
  const { exit } = useApp();

  useInput(input => {
    if (input === "m" || input === "M") {
      returnToMenu();
    }
    if (input === "q" || input === "Q") {
      exit();
      process.exit();
    }
  });
  return (
    <Box flexDirection={"column"}>
      <Text color={truffleWhite}>
        Return to [<Text color={truffleBlue}>M</Text>]enu or [
        <Text color={truffleBlue}>Q</Text>]uit:{" "}
      </Text>
    </Box>
  );
};
