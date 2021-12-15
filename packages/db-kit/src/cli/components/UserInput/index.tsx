import React from "react";
import { Box, Text } from "ink";
import { UncontrolledTextInput } from "ink-text-input";

type UserInputProps = {
  description: string;
  onSubmit: (data) => void;
  enabled?: boolean;
};

export const UserInput = ({
  description,
  onSubmit,
  enabled
}: UserInputProps) => {
  return (
    <Box>
      <Text bold>{description}:</Text>
      <Text>
        <UncontrolledTextInput
          placeholder="0x..."
          onSubmit={onSubmit}
          focus={enabled}
        />
      </Text>
    </Box>
  );
};
