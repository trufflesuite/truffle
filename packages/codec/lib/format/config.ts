export interface FormatConfig {
  integerType: "BN" | "string";
  decimalType: "Big" | "string";
}

export interface DefaultFormatConfig extends FormatConfig {
  integerType: "BN";
  decimalType: "Big";
}

export interface SerialFormatConfig extends FormatConfig {
  integerType: "string";
  decimalType: "string";
}
