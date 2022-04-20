import { assert } from "chai";
import delay from "delay";
import {
  tracked,
  waitForOutstandingPromises,
  getOutstandingPromises
} from "../lib";

describe("promise-tracker", () => {
  describe("tracking", () => {
    it("tracks outstanding promises for a tracked class", async () => {
      const target = new TrackedObject();

      const p = target.trackedMethod();

      let promises = getOutstandingPromises({ target });
      assert.lengthOf(promises, 1);
      assert.strictEqual(promises[0], p);

      await p;
    });

    it("cleans up terminated promises", async () => {
      const target = new TrackedObject();

      await target.trackedMethod();

      let promises = getOutstandingPromises({ target });

      assert.lengthOf(promises, 0);
    });

    it("doesn't track untracked async methods", async () => {
      const target = new TrackedObject();

      const p = target.untrackedMethod();

      let promises = getOutstandingPromises({ target });
      assert.lengthOf(promises, 0);

      await p;
    });
  });

  describe("waitForOutstandingPromises", () => {
    it("waits on a single promise from a single instance", async () => {
      const target = new TrackedObject();

      target.trackedMethod();

      assert.strictEqual(target.executedTrackedMethodCount, 0);
      await waitForOutstandingPromises();
      assert.strictEqual(target.executedTrackedMethodCount, 1);
    });

    it("waits on multiple promises from a single instance", async () => {
      const target = new TrackedObject();

      target.trackedMethod();
      target.trackedMethod();

      assert.strictEqual(target.executedTrackedMethodCount, 0);
      await waitForOutstandingPromises();
      assert.strictEqual(target.executedTrackedMethodCount, 2);
    });

    it("waits on promises for a specific instance", async () => {
      const target1 = new TrackedObject();
      const target2 = new TrackedObject();

      target1.trackedMethod();
      const p = target2.trackedMethod(50);

      assert.strictEqual(target1.executedTrackedMethodCount, 0);
      assert.strictEqual(target2.executedTrackedMethodCount, 0);
      await waitForOutstandingPromises({ target: target1 });
      assert.strictEqual(target1.executedTrackedMethodCount, 1);
      assert.strictEqual(target2.executedTrackedMethodCount, 0);
      await p;
      assert.strictEqual(target2.executedTrackedMethodCount, 1);
    });

    it("waits for all promises, even when some throw", async () => {
      const target = new TrackedObject();

      // delay for longer to ensure this finishes after the one that throws
      target.trackedMethod(50);

      // throws after 25ms
      target.throwingTrackedMethod();

      assert.strictEqual(target.executedTrackedMethodCount, 0);
      assert.strictEqual(target.executedThrowingTrackedMethodCount, 0);
      await waitForOutstandingPromises();
      assert.strictEqual(target.executedTrackedMethodCount, 1);
      assert.strictEqual(target.executedThrowingTrackedMethodCount, 1);
    });

    it("allows caller to pass in custom catch handler logic", async () => {
      const target = new TrackedObject();

      let throwCount = 0;

      // throws after 25ms
      target.throwingTrackedMethod();
      target.throwingTrackedMethod();

      assert.strictEqual(throwCount, 0);
      await waitForOutstandingPromises({ catchHandler: () => throwCount++ });
      assert.strictEqual(throwCount, 2);
    });
  });
});

class TrackedObject {
  executedTrackedMethodCount: number = 0;
  executedThrowingTrackedMethodCount: number = 0;

  @tracked
  async trackedMethod(duration: number = 25): Promise<void> {
    await delay(duration);
    this.executedTrackedMethodCount++;
  }

  @tracked
  async throwingTrackedMethod(): Promise<void> {
    await delay(25);
    this.executedThrowingTrackedMethodCount++;
    throw new Error("expected");
  }

  async untrackedMethod(): Promise<void> {
    await delay(25);
  }
}
