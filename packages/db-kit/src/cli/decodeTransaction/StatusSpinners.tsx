import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

export const FailedStatusSpinner = ({ address }) => {
  return (
    <Box key={`address-${address}`}>
      <Box paddingLeft={1} paddingRight={1}>
        <Text dimColor color="yellow">
          ⚠
        </Text>
      </Box>
      <Text dimColor bold>
        {address}
      </Text>
      <Text dimColor color="red">
        {" "}
        ::{" "}
      </Text>
      <Text dimColor color="gray">
        Could not find
      </Text>
    </Box>
  );
};

export const OkStatusSpinner = ({ address }) => {
  return (
    <Box key={`address-${address}`}>
      <Box paddingLeft={1} paddingRight={1}>
        <Text dimColor color="green">
          ✓
        </Text>
      </Box>
      <Text dimColor bold>
        {address}
      </Text>
      <Text dimColor color="red">
        {" "}
        ::{" "}
      </Text>
      <Text dimColor color="gray">
        OK
      </Text>
    </Box>
  );
};

export const FetchingStatusSpinner = ({ address }) => {
  return (
    <Box key={`address-${address}`}>
      <Box paddingLeft={1} paddingRight={1}>
        <Text dimColor color="green">
          <Spinner />
        </Text>
      </Box>
      <Text dimColor bold>
        {address}
      </Text>
      <Text dimColor color="red">
        {" "}
        ::{" "}
      </Text>
      <Text dimColor color="gray">
        Fetching external...
      </Text>
    </Box>
  );
};

export const QueryStatusSpinner = ({ address }) => {
  return (
    <Box key={`address-${address}`}>
      <Box paddingLeft={1} paddingRight={1}>
        <Text dimColor color="green">
          <Spinner />
        </Text>
      </Box>
      <Text dimColor bold>
        {address}
      </Text>
      <Text dimColor color="red">
        {" "}
        ::{" "}
      </Text>
      <Text dimColor color="gray">
        Querying @truffle/db...
      </Text>
    </Box>
  );
};
