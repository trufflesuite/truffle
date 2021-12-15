import React from "react";
import Spinner from "ink-spinner";
import { Text, Box } from "ink";

type LoadingSpinnerProps = {
  message?: string;
};

export const LoadingSpinner = ({ message }: LoadingSpinnerProps) => {
  return (
    <Box>
      <Box marginRight={1}>
        <Text color="green">
          <Spinner />
        </Text>
      </Box>
      <Text>{message}</Text>
    </Box>
  );
};
