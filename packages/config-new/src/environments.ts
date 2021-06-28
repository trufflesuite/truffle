import * as t from "io-ts";

export type Environments<Environment> = {
  [environmentName: string]: Environment;
};

export const environments = <Environment>(options: {
  environment: t.Type<Environment>;
}): t.Type<Environments<Environment>> => {
  const { environment } = options;

  const environmentName = t.string;

  const codec = t.record(environmentName, environment);

  return new t.Type(
    `Environments<${environment.name}>`,
    codec.is,
    codec.validate,
    codec.encode
  );
};

export type Config<Environment> = {
  environments?: Environments<Environment>
};

export const config = <Environment>(options: {
  environment: t.Type<Environment>;
}): t.Type<Config<Environment>> => {
  const environmentsCodec = environments(options);

  const codec = t.partial({ environments: environmentsCodec });

  return new t.Type(
    `Config<${environmentsCodec.name}>`,
    codec.is,
    codec.validate,
    codec.encode
  );
};
