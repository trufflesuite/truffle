import { Recipe, PreserveOptions, Label } from "./recipes";
import { Process, Event, Step, Steps, Unknown, Unknowns } from "./processes";

export interface Controls {
  log(options: Steps.Options.Log): Process<void, Steps.Events.Log>;
  declare(
    options: Unknowns.Options.Declare
  ): Process<Unknown, Unknowns.Events.Declare>;
  step(options: Steps.Options.Step): Process<Step, Steps.Events.Step>;
}

export const run = async <L extends Label>(
  recipe: Recipe,
  preserveOptions: Omit<PreserveOptions, keyof Controls>
): Promise<L> => {
  const controller = new Steps.Controller({ scope: [recipe.name] });

  const controls = {
    log: controller.log.bind(controller),
    declare: controller.declare.bind(controller),
    step: controller.step.bind(controller)
  };

  const preserves = recipe.preserve({
    ...preserveOptions,
    ...controls
  });

  while (true) {
    const { done, value } = await preserves.next();

    if (done) {
      return value as L;
    }
  }
};
