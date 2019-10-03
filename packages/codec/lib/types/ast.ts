import { Mutability, ContractKind } from "./common";

export interface TypeDescriptions {
  typeIdentifier: string;
  typeString?: string;
}

export interface AstNode {
  constant?: boolean;
  id: number;
  name: string;
  canonicalName?: string;
  linearizedBaseContracts?: number[];
  members?: AstNode[];
  nodes?: AstNode[];
  nodeType: string;
  scope?: number;
  src: string;
  stateVariable?: boolean;
  storageLocation?: string;
  typeDescriptions: TypeDescriptions;
  typeName?: AstNode;
  expression?: {
    referencedDeclaration?: any;
  };
  value?: null | any;
  visibility?: string; //not using Visibility type above,
  //that's intended for functions but this could be other
  //things
  stateMutability?: Mutability;
  referencedDeclaration?: any;
  parameters?: {
    parameters: AstNode[];
  };
  returnParameters?: {
    parameters: AstNode[];
  };
  parameterTypes?: {
    parameters: AstNode[];
  };
  returnParameterTypes?: {
    parameters: AstNode[];
  };
  keyType?: AstNode;
  valueType?: AstNode;
  indexed?: boolean;
  anonymous?: boolean;
  contractKind?: ContractKind;
  isConstructor?: boolean;
  [k: string]: any;
}

export interface AstNodes {
  [nodeId: number]: AstNode;
};

//the debugger uses this
export interface Scopes {
  [nodeId: string]: {
    id: number;
    sourceId: string;
    parentId: number | null;
    pointer: string;
    variables?: {
      name: string;
      id: number;
    }[];
    definition?: AstNode;
  }
}
