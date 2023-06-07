import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ComponentDataTypeIsNeverError } from "../../../utils";

export const { OptionsError } = createCodecComponent(
  "OptionsError",
  (_data: Format.Errors.OptionsError) => {
    throw new ComponentDataTypeIsNeverError("Codec.Format.Errors.OptionsError");
  }
);
