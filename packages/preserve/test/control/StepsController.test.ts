import { asyncToArray } from "iter-tools";
import { StepsController } from "../../lib/control";

describe("StepsController", () => {
  describe("fail()", () => {
    it("should propagate to all child tasks", async () => {
      const runTasks = async function* () {
        const task = new StepsController({ scope: ["test"] });
        yield* task.begin();
        const subtask = yield* task.step({ identifier: "a" });
        yield* task.step({ identifier: "b" });
        yield* subtask.step({ identifier: "a/a" });
        yield* task.fail();
      };

      const events = await asyncToArray(runTasks());

      const expectedEvents = [
        { type: "begin", scope: ["test"] },
        { type: "step", message: "a", scope: ["test", "a"] },
        { type: "step", message: "b", scope: ["test", "b"] },
        { type: "step", message: "a/a", scope: ["test", "a", "a/a"] },
        { type: "stop", scope: ["test", "a", "a/a"] },
        { type: "stop", scope: ["test", "a"] },
        { type: "stop", scope: ["test", "b"] },
        { type: "fail", scope: ["test"] }
      ];

      expect(events).toEqual(expectedEvents);
    });

    it("should propagate to parent task", async () => {
      const runTasks = async function* () {
        const task = new StepsController({ scope: ["test"] });
        yield* task.begin();
        const subtask = yield* task.step({ identifier: "a" });
        yield* subtask.fail();
      };

      const events = await asyncToArray(runTasks());

      const expectedEvents = [
        { type: "begin", scope: ["test"] },
        { type: "step", message: "a", scope: ["test", "a"] },
        { type: "fail", scope: ["test", "a"] },
        { type: "abort", scope: ["test"] }
      ];

      expect(events).toEqual(expectedEvents);
    });

    it("should propagate to sibling tasks", async () => {
      const runTasks = async function* () {
        const task = new StepsController({ scope: ["test"] });
        yield* task.begin();
        const subtask = yield* task.step({ identifier: "a" });
        yield* task.step({ identifier: "b" });
        yield* subtask.fail();
      };

      const events = await asyncToArray(runTasks());

      const expectedEvents = [
        { type: "begin", scope: ["test"] },
        { type: "step", message: "a", scope: ["test", "a"] },
        { type: "step", message: "b", scope: ["test", "b"] },
        { type: "fail", scope: ["test", "a"] },
        { type: "stop", scope: ["test", "b"] },
        { type: "abort", scope: ["test"] }
      ];

      expect(events).toEqual(expectedEvents);
    });
  });
});
