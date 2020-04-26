
import * as React from "react";
import { ResultComponentProps, ResultComponentOptions } from "../types/ResultComponentProps";
import { ArrayResult, Result, ArrayValue } from "../../../codec/dist/lib/format/values";
import { Errors } from "../../../codec/dist/lib/format";
import IDefaultComponent from "../types/IDefaultComponent";
import ResultComponent from "../ResultComponent";

export default class ArrayComponent extends IDefaultComponent<ArrayResult> {
  public state = {
    collapsed: false
  };
  constructor(props: Readonly<ResultComponentProps<ArrayResult>>){
    super(props);
  }
  expandSection = () => {
    this.setState({collapsed: !this.state.collapsed})
  }
  render() {
    const options = this.props.options || {} as ResultComponentOptions;
    const ContainerElement = options.container || "li";
    const result = this.props.result;
    if ("value" in result) {
      const resultValue = result as ArrayValue;
      return (<ContainerElement>
        <strong>{this.props.name}</strong>
        {
          this.state.collapsed
            ? <span>Array({resultValue.value.length})</span>
            : <ul>
                {
                  resultValue.value.map((result, i) => {
                    return <ResultComponent key={this.props.name + i} name={`[${i}]`} result={result} />
                  })
                }
              </ul>
        }
      </ContainerElement>);
    } else {
      return (<ContainerElement>
        <span>{(this.props.result as Errors.ArrayErrorResult).error}</span>;
      </ContainerElement>);
    }
  }

  public static isType = (props: ResultComponentProps<Result>): props is ResultComponentProps<ArrayResult> => {
    return props.result.type.typeClass === "array";
  }
}
