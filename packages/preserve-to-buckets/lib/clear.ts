import type * as Preserve from "@truffle/preserve";
import type { Buckets } from "@textile/hub";

export interface ClearOptions {
  controls: Preserve.Controls;
  buckets: Buckets;
  bucketKey: string;
}

export interface ConnectResult {
  buckets: Buckets;
  bucketKey: string;
}

export async function* clear(
  options: ClearOptions
): Preserve.Process<void> {
  const { buckets, bucketKey, controls } = options;

  const task = yield* controls.step({
    message: "Clearing existing bucket contents..."
  });

  const { item: { items } } = await buckets.listPath(bucketKey, ".");

  try {
    for (const item of items) {
      if (item.name === ".textileseed") continue;

      // We need to await this inside the for-loop because buckets cannot
      // handle parallel deletions
      await buckets.removePath(bucketKey, item.name);
    }

    yield* task.succeed();
  } catch (error) {
    yield* task.fail({ error });
  }
}
