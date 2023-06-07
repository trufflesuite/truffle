import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { EventDecoding } from "./event-decoding";
import { AnonymousDecoding } from "./anonymous-decoding";
import { isEventDecoding } from "../../../utils";

export const { LogDecoding } = createCodecComponent(
  "LogDecoding",
  (data: Codec.LogDecoding) =>
    isEventDecoding(data) ? (
      <EventDecoding data={data} />
    ) : (
      <AnonymousDecoding data={data} />
    )
);
