import * as React from "react";
import { ResultComponentProps, ResultComponentOptions } from "../types/ResultComponentProps";
import { FunctionExternalResult, FunctionInternalResult, Result } from "../../../codec/dist/lib/format/values";
import IDefaultComponent from "../types/IDefaultComponent";

export default class FunctionComponent extends IDefaultComponent<FunctionExternalResult | FunctionInternalResult> {
  render() {
    const options = this.props.options || {} as ResultComponentOptions;
    const ContainerElement = options.container || "li";
    return (<ContainerElement>
      Special Things!
    </ContainerElement>);
  }

  public static isType = (props: ResultComponentProps<Result>): props is ResultComponentProps<FunctionExternalResult | FunctionInternalResult> => {
    return props.result.type.typeClass === "function";
  }
}
