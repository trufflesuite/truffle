import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ComponentDataTypeIsNeverError } from "../../../utils";

export const { MagicError } = createCodecComponent(
  "MagicError",
  (_data: Format.Errors.MagicError) => {
    throw new ComponentDataTypeIsNeverError("Codec.Format.Errors.MagicError");
  }
);
