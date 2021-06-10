export interface Config {
  integerType: "BN" | "string";
  decimalType: "Big" | "string";
}

export interface DefaultConfig extends Config {
  integerType: "BN";
  decimalType: "Big";
}

export interface SerialConfig extends Config {
  integerType: "string";
  decimalType: "string";
}
