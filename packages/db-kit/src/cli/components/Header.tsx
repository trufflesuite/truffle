import React from "react";
import { Newline, Box, Text } from "ink";
import BigText from "ink-big-text";

export const Header = () => (
  <Box flexDirection="column">
    <BigText text="@truffle/db-kit" font="grid" colors={["yellow", "gray"]} />
    <Text>
      <Text bold>
        @truffle/db is a system of record for blockchain metadata.
      </Text>
      <Newline />
      <Text>
        This tool provides a few utilities to demo @truffle/db and other Truffle
        libraries. Since this is for demo purposes, please consider this package
        experimental and subject to future deprecation: we plan to move these
        utilities to be part of Truffle itself.
      </Text>
      <Newline />
      <Text>Thanks for trying this out! We hope you enjoy.</Text>
    </Text>
  </Box>
);
