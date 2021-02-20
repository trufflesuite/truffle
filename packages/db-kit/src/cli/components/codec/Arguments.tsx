import React from "react";
import { Text } from "ink";

import type { AbiArgument } from "@truffle/codec";

import { DefinitionList } from "@truffle/db-kit/cli/components/DefinitionList";
import { Value } from "./Value";

export interface Props {
  args: AbiArgument[]
}

export const Arguments = ({
  args
}: Props) => {
  const entries = args.map(({ name, indexed, value }, index) => ({
    name: name || `[${index}]`,
    node: <Value result={value} />
  }));
  return <DefinitionList
    entries={entries}
    spaceBetween={1}
    nameComponent={({ children }) => <Text bold>{children}</Text>} />;
};
