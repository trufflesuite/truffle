import Console from "console";

export type sandboxOptionsObject = {
  name?: string;
  unsafeCleanup?: boolean;
  setGracefulCleanup?: boolean;
};

export type sandboxOptionsString = string;

export type sandboxOptions = sandboxOptionsObject | sandboxOptionsString;

export type unboxOptions = {
  logger?: Console;
  force?: boolean;
};

export interface boxConfig {
  ignore: Array<string>;
  commands: object;
  hooks: { "post-unpack": string };
}
