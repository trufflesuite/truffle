export interface AstTypeDescriptions {
  typeIdentifier: string;
  typeString?: string;
}

export interface AstDefinition {
  constant?: boolean;
  id: number;
  name: string;
  linearizedBaseContracts?: number[];
  members?: AstDefinition[];
  nodes?: any[]; //sorry
  nodeType: string;
  scope?: number;
  src: string;
  stateVariable?: boolean;
  storageLocation?: string;
  typeDescriptions: AstTypeDescriptions;
  typeName?: AstDefinition;
  expression?: {
    referencedDeclaration?: any;
  };
  value?: null | any;
  visibility?: string;
  stateMutability?: string;
  referencedDeclaration?: any;
  parameterTypes?: {
    parameters: AstDefinition[];
  };
  returnParameterTypes?: {
    parameters: AstDefinition[];
  };
  keyType?: AstDefinition;
  valueType?: AstDefinition;
  indexed?: boolean;
  [k: string]: any;
}

export interface AstReferences {
  [nodeId: number]: AstDefinition;
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
    definition?: AstDefinition;
  }
}
