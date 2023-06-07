import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { AddressValue } from "./format.values.address-value";
import { AddressErrorResult } from "./format.errors.address-error-result";
import { isAddressValue } from "../../../utils";

export const { AddressResult } = createCodecComponent(
  "AddressResult",
  (data: Format.Values.AddressResult) =>
    isAddressValue(data) ? (
      <AddressValue data={data} />
    ) : (
      <AddressErrorResult data={data} />
    )
);
