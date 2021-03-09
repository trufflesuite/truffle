import { StepsController } from "./controllers";
import { Process, State, HasControls } from "./types";

export interface ControlOptions<R, O extends HasControls> {
  name?: string;
  method: (options: O) => Process<R>;
}

export async function* control<R, O extends HasControls>(
  controlOptions: ControlOptions<R, O>,
  methodOptions: Omit<O, "controls">
): Process<R> {
  const { name, method } = controlOptions;

  const scope = [name || ""];

  const controller = new StepsController({ scope });

  const controls = {
    log: controller.log,
    declare: controller.declare,
    step: controller.step
  };

  yield* controller.begin();

  try {
    const completeMethodOptions = { ...methodOptions, controls } as O;
    const result = yield* method(completeMethodOptions);

    yield* controller.succeed({ result });

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
