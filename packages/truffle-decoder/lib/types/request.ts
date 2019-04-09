import BN from "bn.js";

export interface DecoderRequest {
  requesting: "storage";
  slot?: BN; //will add more fields as needed
}
