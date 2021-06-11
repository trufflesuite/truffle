/**
 * Object type O that includes non-nullable keys K
 */
export type Has<O extends {}, K extends string> = O &
  Required<NonNullable<Pick<O, K & keyof O>>>;

/**
 * Object type O that includes exactly one non-nullable value among keys K
 */
export type HasOne<O extends {}, K extends string> = O &
  {
    [N in K]: Has<O, N>;
  }[K];

/**
 * Asserts at runtime that `options` contains `key`
 */
export function has<O extends {}, K extends string>(
  options: O,
  key: K
): asserts options is Has<O, K> {
  // @ts-ignore to get around the fact that we know nothing about O
  if (options[key] == null) {
    throw new Error(`Expected parameter '${key}' not passed to function.`);
  }
}

/**
 * Asserts at runtime that `options` contains all `expectedKeys`
 */
export function options<O extends {}, K extends string>(
  options: O,
  expectedKeys: K[]
): asserts options is Has<O, K> {
  for (const key of expectedKeys) {
    has(options, key);
  }
}

/**
 * Asserts at runtime that `options` contains at least one of `expectedKeys`
 *
 * Post-condition: this narrows type of `options` to include _exactly one_ of
 * `expectedKeys`, even though at runtime this accepts more than one key.
 */
export function one<O extends {}, K extends string>(
  options: O,
  expectedKeys: K[]
): asserts options is HasOne<O, K> {
  const found = expectedKeys.some(key => {
    try {
      has(options, key);

      return true;
    } catch (error) {
      if (
        !error.message.includes(
          `Expected parameter '${key}' not passed to function.`
        )
      ) {
        throw error;
      }

      return false;
    }
  });

  // If this doesn't work in all cases, perhaps we should
  // create an expect.onlyOne() function.
  if (!found) {
    throw new Error(
      `Expected one of the following parameters, but found none: ${expectedKeys.join(
        ", "
      )}`
    );
  }
}
