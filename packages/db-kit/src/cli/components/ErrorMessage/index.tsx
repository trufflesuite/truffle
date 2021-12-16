import React from "react";
import { Box, Text } from "ink";

type ErrorMessageProps = {
  message?: string;
};

export const ErrorMessage = ({ message }: ErrorMessageProps) => {
  if (!message) return null;

  return (
    <Box>
      <Text bold color="#ff0000">
        Error:
      </Text>
      <Text color="#ff0000">{message}</Text>
    </Box>
  );
};
