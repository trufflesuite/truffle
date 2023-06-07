import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ComponentDataTypeIsNeverError } from "../../../utils";

export const { MappingError } = createCodecComponent(
  "MappingError",
  (_data: Format.Errors.MappingError) => {
    throw new ComponentDataTypeIsNeverError("Codec.Format.Errors.MappingError");
  }
);
