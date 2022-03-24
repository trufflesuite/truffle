import React from "react";
import type { ProjectDecoder } from "@truffle/decoder";

export const DecoderContext = React.createContext<ProjectDecoder | undefined>(
  undefined
);
