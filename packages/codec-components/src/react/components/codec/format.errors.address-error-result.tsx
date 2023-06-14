import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { AddressError } from "./format.errors.address-error";
import { GenericError } from "./format.errors.generic-error";
import { isAddressError } from "../../../utils";

export const { AddressErrorResult } = createCodecComponent(
  "AddressErrorResult",
  ({ error }: Format.Errors.AddressErrorResult) =>
    isAddressError(error) ? (
      <AddressError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
