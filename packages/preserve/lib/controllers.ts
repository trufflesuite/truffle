import {
  Process,
  Task,
  State,
  Step,
  Steps,
  Unknown,
  Unknowns
} from "./processes";

export interface ControlOptions<R, O extends HasControls> {
  name?: string;
  method: (options: O) => Process<R>;
}

export type ControlMethodName = "log" | "declare" | "step" | "succeed" | "fail";

export type Controls = Pick<Task, ControlMethodName>;

export interface HasControls {
  controls: Controls;
}

// export interface Controls {
//   log(options: Steps.Options.Log): Process<void, Steps.Events.Log>;
//   declare(
//     options: Unknowns.Options.Declare
//   ): Process<Unknown, Unknowns.Events.Declare>;
//   step(options: Steps.Options.Step): Process<Step, Steps.Events.Step>;
// }

export async function* control<R, O extends HasControls>(
  controlOptions: ControlOptions<R, O>,
  methodOptions: Omit<O, "controls">
): Process<R> {
  const { name, method } = controlOptions;

  const controller = new Steps.Controller({
    scope: [name || ""]
  });

  yield* controller.begin();

  const controls: Controls = {
    log: controller.log,
    step: controller.step,
    declare: controller.declare,
    succeed: controller.succeed,
    fail: controller.fail
  };

  try {
    const result: R = yield* method({
      ...methodOptions,
      controls
    } as O);

    yield* controller.succeed({ label: result });

    // check for error state (in case of cascaded failures)
    if (controller.state !== State.Done) {
      return;
    }

    return result;
  } catch (error) {
    yield* controller.fail({ error });

    return;
  }
}

export const run = async <R, O extends HasControls>(
  controlOptions: ControlOptions<R, O>,
  methodOptions: Omit<O, "controls">
): Promise<R> => {
  const generator = control(controlOptions, methodOptions);

  while (true) {
    const { done, value } = await generator.next();

    if (done) {
      return value as R;
    }
  }
};
