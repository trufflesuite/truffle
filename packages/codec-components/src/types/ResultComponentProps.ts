import { Format } from "@truffle/codec";

export type ResultComponentOptions = {
  classPrefix: string;
  container: keyof JSX.IntrinsicElements;
};

export type ResultComponentProps<T extends Format.Values.Result> = {
  options?: ResultComponentOptions;
  name: string;
  result: T;
};
