import type * as Preserve from "@truffle/preserve";
import { Buckets } from "@textile/hub";

export interface ConnectOptions {
  controls: Preserve.Controls;
  key: string;
  secret: string;
  bucketName: string;
}

export interface ConnectResult {
  buckets: Buckets;
  bucketKey: string;
}

export async function* connect(
  options: ConnectOptions
): Preserve.Process<ConnectResult> {
  const { key, secret, bucketName, controls } = options;
  const { step } = controls;

  const task = yield* step({
    message: `Connecting to Textile Bucket with name ${bucketName}...`
  });

  try {
    const buckets = await Buckets.withKeyInfo({ key, secret });

    const createOrGetResult = await buckets.getOrCreate(bucketName);
    const bucketKey = createOrGetResult.root.key;

    yield* task.succeed({
      result: bucketKey,
      message: `Connected to Textile bucket with key ${bucketKey}`
    });

    return { buckets, bucketKey };
  } catch (error) {
    yield* task.fail({ error });
  }
}
