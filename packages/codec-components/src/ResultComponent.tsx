import * as React from "react";

import { Format } from "@truffle/codec";
import { ResultComponentProps, ResultComponentOptions } from "./types/ResultComponentProps";
import GenericComponent from "./GenericComponent";
import DefaultComponents from "./default-components";
import IDefaultComponent from "./types/IDefaultComponent";

function findDefaultComponent<T extends Format.Values.Result>(
  props: ResultComponentProps<T>,
  components:
    (React.JSXElementConstructor<ResultComponentProps<Format.Values.Result>> &
      {
        [K in keyof typeof IDefaultComponent]: typeof IDefaultComponent[K]
      }
    )[]
) {
  for (const Component of components) {
    if (Component.isType(props)) {
      return <Component {...props} />;
    }
  }
}

type Result = Format.Values.Result & {kind: "value" | "error"};

export default class ResultComponent<T extends Result> extends React.Component<ResultComponentProps<T>> {
  render() {
    const props = this.props;
    const result = props.result as Format.Values.Result;

    let children: any;
    if (result.kind === "value") {
      const Component = findDefaultComponent(props, Object.values(DefaultComponents));
      if (Component){
        return Component;
      }

      // handle generic components...
      const value = result.value;
      if ("asBN" in value) {
        children = value.asBN.toString();
      } else if ("asBoolean" in value) {
        children = value.asBoolean;
      } else if ("asHex" in value) {
        children = value.asHex;
      } else if ("asAddress" in value) {
        children = value.asAddress;
      } else if ("asBig" in value) {
        children = value.asBig.toString();
      } else {
        // TODO: find the rest of them
      }
    } else if (result.kind === "error") {
      // TODO: more robust error handling.
      children = result.error.kind;
    }

    return <GenericComponent {...this.props}>
      {children}
    </GenericComponent>;
  }
}

// To whom it may concern:
// The following is just a idea/POC I don't wnat to get rid of yet. /shrug

function ResultComponentFactory<T extends Result>() {
  return (props: ResultComponentProps<T>) => (<ResultComponent<T> {...props}/>);
}

const ElementaryResultComponent = ResultComponentFactory<Format.Values.ElementaryResult>();
const UintResultComponent = ResultComponentFactory<Format.Values.UintResult>();
const IntResultComponent = ResultComponentFactory<Format.Values.IntResult>();
const BoolResultComponent = ResultComponentFactory<Format.Values.BoolResult>();
const BytesResultComponent = ResultComponentFactory<Format.Values.BytesResult>();
const AddressResultComponent = ResultComponentFactory<Format.Values.AddressResult>();
const StringResultComponent = ResultComponentFactory<Format.Values.StringResult>();
const FixedResultComponent = ResultComponentFactory<Format.Values.FixedResult>();
const UfixedResultComponent = ResultComponentFactory<Format.Values.UfixedResult>();
const EnumResultComponent = ResultComponentFactory<Format.Values.EnumResult>();
const ContractResultComponent = ResultComponentFactory<Format.Values.ContractResult>();
const ArrayResultComponent = ResultComponentFactory<Format.Values.ArrayResult>();
const MappingResultComponent = ResultComponentFactory<Format.Values.MappingResult>();
const StructResultComponent = ResultComponentFactory<Format.Values.StructResult>();
const TupleResultComponent = ResultComponentFactory<Format.Values.TupleResult>();
const MagicResultComponent = ResultComponentFactory<Format.Values.MagicResult>();
const TypeResultComponent = ResultComponentFactory<Format.Values.TypeResult>();
const FunctionExternalResultComponent = ResultComponentFactory<Format.Values.FunctionExternalResult>();
const FunctionInternalResultComponent = ResultComponentFactory<Format.Values.FunctionInternalResult>();
