
export interface AstTypeDescriptions {
  typeIdentifier: string;
  typeString?: string;
}

export interface AstDefinition {
  constant: boolean;
  id: number;
  name: string;
  nodeType: string;
  scope: number;
  src: string;
  stateVariable: boolean;
  storageLocation: string;
  typeDescriptions: AstTypeDescriptions;
  typeName: {
    id: number,
    name: string;
    nodeType: string;
    src: string;
    typeDescriptions: AstTypeDescriptions;
    keyType?: any;
    valueType?: any;
    referencedDeclaration?: any;
  };
  expression: {
    referencedDeclaration?: any;
  };
  value: null | any;
  visibility: string;
  referencedDeclaration?: any;
  [k: string]: any;
}