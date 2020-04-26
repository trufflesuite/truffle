import { Result } from "../../../codec/dist/lib/format/values";

export type ResultComponentOptions = {
  classPrefix: string;
  container: keyof JSX.IntrinsicElements;
};

export type ResultComponentProps<T extends Result> = {
  options?: ResultComponentOptions;
  name: string;
  result: T;
};
