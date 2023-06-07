import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FunctionDecoding } from "./function-decoding";
import { ConstructorDecoding } from "./constructor-decoding";
import { MessageDecoding } from "./message-decoding";
import { UnknownCallDecoding } from "./unknown-call-decoding";
import { UnknownCreationDecoding } from "./unknown-creation-decoding";
import {
  isFunctionDecoding,
  isConstructorDecoding,
  isMessageDecoding,
  isUnknownCallDecoding
} from "../../../utils";

export const { CalldataDecoding } = createCodecComponent(
  "CalldataDecoding",
  (data: Codec.CalldataDecoding) =>
    isFunctionDecoding(data) ? (
      <FunctionDecoding data={data} />
    ) : isConstructorDecoding(data) ? (
      <ConstructorDecoding data={data} />
    ) : isMessageDecoding(data) ? (
      <MessageDecoding data={data} />
    ) : isUnknownCallDecoding(data) ? (
      <UnknownCallDecoding data={data} />
    ) : (
      <UnknownCreationDecoding data={data} />
    )
);
