import * as React from "react";
import { ResultComponentProps } from "./ResultComponentProps";
import { Result } from "../../../codec/dist/lib/format/values";

// Not an actual interface because interfaces can't have static properties
// and I'm too stubborn to not have one here. Change my mind.
export default class IDefaultComponent<
  T extends Result
> extends React.Component<ResultComponentProps<T>> {
  static isType: (
    props: ResultComponentProps<Result>
  ) => props is ResultComponentProps<Result>;
}
