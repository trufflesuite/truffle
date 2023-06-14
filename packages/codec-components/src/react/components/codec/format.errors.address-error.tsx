import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { AddressPaddingError } from "./format.errors.address-padding-error";

export const { AddressError } = createCodecComponent(
  "AddressError",
  (data: Format.Errors.AddressError) => <AddressPaddingError data={data} />
);
