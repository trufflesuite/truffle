export type Schema = {
  properties?: {};
  environment?: {};
  environmentName?: string;
};

export type Properties<S extends Schema> = "properties" extends keyof S
  ? S["properties"]
  : {};

export type Environment<S extends Schema> = "environment" extends keyof S
  ? S["environment"]
  : {};

export type EnvironmentName<
  S extends Schema
> = "environmentName" extends keyof S ? string & S["environmentName"] : string;
