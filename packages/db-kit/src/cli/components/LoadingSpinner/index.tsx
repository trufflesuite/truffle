import React from "react";
import Spinner from "ink-spinner";
import { Text, Box } from "ink";

type LoadingSpinnerProps = {
  message?: string;
  enabled?: boolean;
};

export const LoadingSpinner = ({
  message,
  enabled = true
}: LoadingSpinnerProps) => {
  if (!enabled) return null;

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
