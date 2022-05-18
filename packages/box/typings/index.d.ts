import Console from "console";
import inquirer from "inquirer";

export type sandboxOptionsObject = {
  name?: string;
  unsafeCleanup?: boolean;
  setGracefulCleanup?: boolean;
  force?: boolean;
  logger?: Console;
};

export type sandboxOptionsString = string;

export type sandboxOptions = sandboxOptionsObject | sandboxOptionsString;

export type unboxOptions = {
  logger?: Console;
  force?: boolean;
};

export type boxConfigMv = {
  from: string;
  to: string;
};

export interface boxConfig {
  ignore: Array<string>;
  commands: object;
  hooks: { "post-unpack": string };
  modifiers: {
    prompts?: inquirer.Question[];
    "recipe-common"?: string[];
    recipes?: {
      [key: string]: Array<string | boxConfigMv>;
    };
  };
}
