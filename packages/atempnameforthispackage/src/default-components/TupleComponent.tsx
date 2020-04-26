import * as React from "react";
import { ResultComponentProps, ResultComponentOptions } from "../types/ResultComponentProps";
import { TupleResult, Result } from "../../../codec/dist/lib/format/values";
import IDefaultComponent from "../types/IDefaultComponent";

export default class TupleComponent extends IDefaultComponent<TupleResult> {
  render() {
    const options = this.props.options || {} as ResultComponentOptions;
    const ContainerElement = options.container || "li";
    return (<ContainerElement>
      Special Things!
    </ContainerElement>);
  }

  public static isType = (props: ResultComponentProps<Result>): props is ResultComponentProps<TupleResult> => {
    return props.result.type.typeClass === "tuple";
  }
}
