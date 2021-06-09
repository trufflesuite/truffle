import BN from "bn.js";
import * as Elementary from "./elementary";
import * as Config from "./config";

export interface Range<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  from: StoragePosition<C>;
  to?: StoragePosition<C>;
  length?: number;
}

export interface StoragePosition<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  slot: Slot<C>;
  index: number;
}

export type Slot<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> = SlotBaseFields<C> & SlotOffsetFields[C["integerType"]];

interface SlotBaseFields<
  C extends Config.FormatConfig = Config.DefaultFormatConfig
> {
  key?: Elementary.ElementaryValue<C>;
  path?: Slot<C>;
  hashPath?: boolean;
}

interface SlotOffsetFields {
  BN: {
    offset: BN;
  };
  string: {
    offsetAsString: string;
  };
}
