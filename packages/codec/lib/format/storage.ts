import BN from "bn.js";
import * as Elementary from "./elementary";
import { Config, DefaultConfig } from "./config";

export interface Range<
  C extends Config = DefaultConfig
> {
  from: StoragePosition<C>;
  to?: StoragePosition<C>;
  length?: number;
}

export interface StoragePosition<
  C extends Config = DefaultConfig
> {
  slot: Slot<C>;
  index: number;
}

export type Slot<
  C extends Config = DefaultConfig
> = SlotBaseFields<C> & SlotOffsetFields[C["integerType"]];

interface SlotBaseFields<
  C extends Config = DefaultConfig
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
