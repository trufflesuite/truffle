import * as fc from "fast-check";
import faker from "faker";
import { camelCase } from "change-case";

// borrowed from https://runkit.com/dubzzz/faker-to-fast-check
export const fake = (
  template: string,
  transform = camelCase
): fc.Arbitrary<string> =>
  fc.integer()
    .noBias()
    .noShrink()
    .map(seed => {
      faker.seed(seed);
      return transform(faker.fake(template));
    });
