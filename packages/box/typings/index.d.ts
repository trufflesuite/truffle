import Console from "console";

export type sandboxOptionsObject = {
  name?: string;
  unsafeCleanup?: boolean;
  setGracefulCleanup?: boolean;
  force?: boolean;
  logger?: Console;
};

export type sandboxOptionsString = string;

export type sandboxOptions = sandboxOptionsObject | sandboxOptionsString;

export type unpackBoxOptions = {
  logger?: Console;
  force?: boolean;
};

export type setUpBoxOptions = {
  recipe?: string;
};

export type unboxOptions = unpackBoxOptions & setUpBoxOptions;

export type boxConfigRecipePrompt = {
  message: string;
  default?: string;
};

export type boxConfigRecipeSpecMv = {
  from: string;
  to: string;
};

export type boxConfigRecipeSpecs =
  | Array<string | boxConfigRecipeSpecMv>
  | { [key: string]: boxConfigRecipeSpecs };

export interface boxConfig {
  ignore: Array<string>;
  commands: object;
  hooks: { "post-unpack": string };
  recipes: {
    prompts?: boxConfigRecipePrompt[];
    common?: string[];
    specs?: boxConfigRecipeSpecs;
  };
}
