import type { Schema, Properties, EnvironmentName, Environment } from "./spec";

export type ProjectConfig<S extends Schema> = Properties<S> &
  ("environment" extends keyof S
    ? EnvironmentsConfig<S>
    : "environmentName" extends keyof S
    ? EnvironmentsConfig<S>
    : {});

export type EnvironmentsConfig<S extends Schema> = {
  environments: {
    [N in EnvironmentName<S>]: EnvironmentConfig<S>;
  };
};

export type EnvironmentConfig<S extends Schema> = Environment<S>;
