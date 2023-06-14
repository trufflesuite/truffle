import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ComponentDataTypeIsNeverError } from "../../../utils";

export const { TypeErrorUnion } = createCodecComponent(
  "TypeErrorUnion",
  (_data: Format.Errors.TypeErrorUnion) => {
    throw new ComponentDataTypeIsNeverError(
      "Codec.Format.Errors.TypeErrorUnion"
    );
  }
);
