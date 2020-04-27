import * as React from "react";
import createContext from "mini-create-react-context";

import { Format } from "@truffle/codec";

export const ResultContext = createContext<Format.Values.Result | null>(null);
export const ValueContext = createContext<Format.Values.Value["value"] | null>(null);
export const ErrorContext = createContext<Format.Errors.ErrorResult["error"] | null>(null);

export interface HasValueProp<V extends Format.Values.Value = Format.Values.Value> {
  type: V["type"],
  value: V["value"]
}

export interface HasTypeProp<T extends Format.Types.Type = Format.Types.Type> {
  type: T
}

export class UintValueComponent extends React.PureComponent<
  HasValueProp<Format.Values.UintValue>
> {
  render () {
    const { asBN } = this.props.value;

    return asBN.toString();
  }
}

export class GenericValueComponent<V extends Format.Values.Value = Format.Values.Value> extends React.PureComponent<HasValueProp<V>> {
  render () {
    return <span>value</span>
  }
};

export class GenericTypeComponent<T extends Format.Types.Type = Format.Types.Type> extends React.PureComponent<HasTypeProp<T>> {
  render () {
    return <span>{this.props.type.typeClass}</span>
  }
};

export interface TypeComponents {
  address?: React.ComponentClass<HasTypeProp<Format.Types.AddressType>>,
  array?: React.ComponentClass<HasTypeProp<Format.Types.ArrayType>>,
  bool?: React.ComponentClass<HasTypeProp<Format.Types.BoolType>>,
  bytes?: React.ComponentClass<HasTypeProp<Format.Types.BytesType>>,
  contract?: React.ComponentClass<HasTypeProp<Format.Types.ContractType>>,
  enum?: React.ComponentClass<HasTypeProp<Format.Types.EnumType>>,
  fixed?: React.ComponentClass<HasTypeProp<Format.Types.FixedType>>,
  function?: React.ComponentClass<HasTypeProp<Format.Types.FunctionExternalType | Format.Types.FunctionInternalType>>,
  int?: React.ComponentClass<HasTypeProp<Format.Types.IntType>>,
  magic?: React.ComponentClass<HasTypeProp<Format.Types.MagicType>>,
  mapping?: React.ComponentClass<HasTypeProp<Format.Types.MappingType>>,
  string?: React.ComponentClass<HasTypeProp<Format.Types.StringType>>,
  struct?: React.ComponentClass<HasTypeProp<Format.Types.StructType>>,
  tuple?: React.ComponentClass<HasTypeProp<Format.Types.TupleType>>,
  type?: React.ComponentClass<HasTypeProp<Format.Types.TypeType>>,
  ufixed?: React.ComponentClass<HasTypeProp<Format.Types.UfixedType>>,
  uint?: React.ComponentClass<HasTypeProp<Format.Types.UintType>>,
}
export interface ValueComponents {
  address?: React.ComponentClass<HasValueProp<Format.Values.AddressValue>>,
  array?: React.ComponentClass<HasValueProp<Format.Values.ArrayValue>>,
  bool?: React.ComponentClass<HasValueProp<Format.Values.BoolValue>>,
  bytes?: React.ComponentClass<HasValueProp<Format.Values.BytesValue>>,
  contract?: React.ComponentClass<HasValueProp<Format.Values.ContractValue>>,
  enum?: React.ComponentClass<HasValueProp<Format.Values.EnumValue>>,
  fixed?: React.ComponentClass<HasValueProp<Format.Values.FixedValue>>,
  function?: React.ComponentClass<HasValueProp<Format.Values.FunctionExternalValue | Format.Values.FunctionInternalValue>>,
  int?: React.ComponentClass<HasValueProp<Format.Values.IntValue>>,
  magic?: React.ComponentClass<HasValueProp<Format.Values.MagicValue>>,
  mapping?: React.ComponentClass<HasValueProp<Format.Values.MappingValue>>,
  string?: React.ComponentClass<HasValueProp<Format.Values.StringValue>>,
  struct?: React.ComponentClass<HasValueProp<Format.Values.StructValue>>,
  tuple?: React.ComponentClass<HasValueProp<Format.Values.TupleValue>>,
  type?: React.ComponentClass<HasValueProp<Format.Values.TypeValue>>,
  ufixed?: React.ComponentClass<HasValueProp<Format.Values.UfixedValue>>,
  uint?: React.ComponentClass<HasValueProp<Format.Values.UintValue>>,
}

export interface Components {
  types: TypeComponents;
  values: ValueComponents;
}

export const ComponentsContext = createContext<Components>({
  types: {
    address: GenericTypeComponent,
    array: GenericTypeComponent,
    bool: GenericTypeComponent,
    bytes: GenericTypeComponent,
    contract: GenericTypeComponent,
    enum: GenericTypeComponent,
    fixed: GenericTypeComponent,
    function: GenericTypeComponent,
    int: GenericTypeComponent,
    magic: GenericTypeComponent,
    mapping: GenericTypeComponent,
    string: GenericTypeComponent,
    struct: GenericTypeComponent,
    tuple: GenericTypeComponent,
    type: GenericTypeComponent,
    ufixed: GenericTypeComponent,
    uint: GenericTypeComponent,
  },
  values: {
    address: GenericValueComponent,
    array: GenericValueComponent,
    bool: GenericValueComponent,
    bytes: GenericValueComponent,
    contract: GenericValueComponent,
    enum: GenericValueComponent,
    fixed: GenericValueComponent,
    function: GenericValueComponent,
    int: GenericValueComponent,
    magic: GenericValueComponent,
    mapping: GenericValueComponent,
    string: GenericValueComponent,
    struct: GenericValueComponent,
    tuple: GenericValueComponent,
    type: GenericValueComponent,
    ufixed: GenericValueComponent,
    uint: UintValueComponent,
  }
});

export class Type extends React.PureComponent {
  render () {
    return (
      <ResultContext.Consumer>
        {({ type }) => (
          <ComponentsContext.Consumer>
            {(components: Components) => {
              const Component: any = components.types[type.typeClass];
              if (Component) {
                return <Component type={type} />
              }
            }}
          </ComponentsContext.Consumer>
        )}
      </ResultContext.Consumer>
    );
  }
}

export class Value extends React.PureComponent {
  render () {
    return (
      <ResultContext.Consumer>
        {({ type }) => (
          <ValueContext.Consumer>
            {(value) => (
              <ComponentsContext.Consumer>
                {(components: Components) => {
                  const Component: any = components.values[type.typeClass];
                  if (Component) {
                    return <Component type={type} value={value} />
                  }
                }}
              </ComponentsContext.Consumer>
            )}
          </ValueContext.Consumer>
        )}
      </ResultContext.Consumer>
    );
  }
}

export class ValueKind extends React.PureComponent<{
  children: React.ReactNode
}> {
  render () {
    return (
      <ValueContext.Consumer>
        {value => (
          value === null ? null : this.props.children
        )}
      </ValueContext.Consumer>
    );
  }
}

export class Result extends React.PureComponent<{
  children?: React.ReactNode,
  result: Format.Values.Result
}> {
  render () {
    const children = this.props.children || [
      <ValueKind key="value">
        <Value /> (<Type />)
      </ValueKind>,
    ];

    switch (this.props.result.kind) {
      case "value":
        return (
          <ResultContext.Provider value={this.props.result}>
            <ValueContext.Provider value={this.props.result.value}>
              {children}
            </ValueContext.Provider>
          </ResultContext.Provider>
        );
      case "error":
        return (
          <ResultContext.Provider value={this.props.result}>
            <ErrorContext.Provider value={this.props.result.error}>
              {children}
            </ErrorContext.Provider>
          </ResultContext.Provider>
        );
    }
  }
}
