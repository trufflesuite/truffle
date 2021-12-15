import React, { useState } from "react";
import { Box, Text } from "ink";
import { UncontrolledTextInput } from "ink-text-input";

type UserInputProps = {
  description: string;
};

export const UserInput = ({ description }: UserInputProps) => {
  const [data, setData] = useState<string | undefined>();

  return (
    <Box>
      <Text bold>
        {description}: {data}
      </Text>
      <UncontrolledTextInput placeholder="0x..." onSubmit={setData} />
    </Box>
  );
};
