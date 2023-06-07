import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ReturnDecoding } from "./return-decoding";
import { RawReturnDecoding } from "./raw-return-decoding";
import { BytecodeDecoding } from "./bytecode-decoding";
import { UnknownBytecodeDecoding } from "./unknown-bytecode-decoding";
import { SelfDestructDecoding } from "./self-destruct-decoding";
import { RevertMessageDecoding } from "./revert-message-decoding";
import { EmptyFailureDecoding } from "./empty-failure-decoding";
import {
  isReturnDecoding,
  isRawReturnDecoding,
  isBytecodeDecoding,
  isUnknownBytecodeDecoding,
  isSelfDestructDecoding,
  isRevertMessageDecoding
} from "../../../utils";

export const { ReturndataDecoding } = createCodecComponent(
  "ReturndataDecoding",
  (data: Codec.ReturndataDecoding) =>
    isReturnDecoding(data) ? (
      <ReturnDecoding data={data} />
    ) : isRawReturnDecoding(data) ? (
      <RawReturnDecoding data={data} />
    ) : isBytecodeDecoding(data) ? (
      <BytecodeDecoding data={data} />
    ) : isUnknownBytecodeDecoding(data) ? (
      <UnknownBytecodeDecoding data={data} />
    ) : isSelfDestructDecoding(data) ? (
      <SelfDestructDecoding data={data} />
    ) : isRevertMessageDecoding(data) ? (
      <RevertMessageDecoding data={data} />
    ) : (
      <EmptyFailureDecoding data={data} />
    )
);
