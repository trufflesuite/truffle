declare module "error-cause" {
  const errorTypes: [
    "Error",
    "EvalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError"
  ];
  export = errorTypes;
}
