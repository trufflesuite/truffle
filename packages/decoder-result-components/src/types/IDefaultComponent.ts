import * as React from "react";
import { ResultComponentProps } from "./ResultComponentProps";
import { Format } from "@truffle/codec";

// Not an actual interface because interfaces can't have static properties
// and I'm too stubborn to not have one here. Change my mind.
export default class IDefaultComponent<
  T extends Format.Values.Result
> extends React.Component<ResultComponentProps<T>> {
  static isType: (
    props: ResultComponentProps<Format.Values.Result>
  ) => props is ResultComponentProps<Format.Values.Result>;
}
