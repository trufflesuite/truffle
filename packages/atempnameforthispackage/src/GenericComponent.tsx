import * as React from "react";
import { Result } from "../../codec/dist/lib/format/values";
import { ResultComponentProps, ResultComponentOptions } from "./types/ResultComponentProps";

/**
 * The GenericComponent simple renders `props.name`, `props.children`, and `props.result.type.typeClass`
 * in that order.
 */
export default class GenericComponent<T extends Result> extends React.Component<ResultComponentProps<T>> {
  render() {
    const options = this.props.options || {} as ResultComponentOptions;
    const result = this.props.result;
    const classPrefix = options.classPrefix || "truffle-json-view-";
    const ContainerElement = options.container || "li";
    const typeClass = result.type.typeClass || "na";
    const classTypes = [`${classPrefix}_${typeClass}`];

    return <ContainerElement className={classTypes.join(" ")}>
      { this.props.name
        ? <><span className={`${classPrefix}_name`}>{this.props.name}</span>: </>
        : ""
      }
      <span className={`${classPrefix}_spacer`}> </span>
      <span className={`${classPrefix}_value`}>{this.props.children}</span> 
      <span className={`${classPrefix}_spacer`}> </span>
      <span className={`${classPrefix}_type`}>({ result.type.typeClass })</span>
    </ContainerElement>
  }
}
