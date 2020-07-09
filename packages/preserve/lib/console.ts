import chalk from "chalk";
import Spinnies from "spinnies";

import * as Processes from "./processes";
import { preserve } from "./preserve";

interface ConsoleReporterConstructorOptions {
  console: Console;
}

export class ConsoleReporter {
  private spinners: Spinnies;
  private console: Console;

  constructor(options: ConsoleReporterConstructorOptions) {
    this.spinners = new Spinnies();
    this.console = options.console;
  }

  async report(events: AsyncIterable<Processes.Event>) {
    for await (const event of events) {
      const { type, scope } = event;
      const key = Processes.Scopes.toKey(scope);

      this[type].bind(this)(event);
    }
  }

  /*
   * Error events
   */

  private fail(event: Processes.Errors.Events.Fail) {
    const { error } = event;

    const { key } = eventProperties(event);

    // get current text
    const { text, indent } = this.spinners.pick(key);

    const options = error
      ? {
          text: `${text}\n${" ".repeat(indent)}${chalk.red(error.toString())}`
        }
      : {};

    this.spinners.fail(key, options);
  }

  private abort(event: Processes.Errors.Events.Abort) {
    const { key } = eventProperties(event);

    this.spinners.fail(key);
  }

  private stop(event: Processes.Errors.Events.Stop) {
    const { key } = eventProperties(event);

    this.spinners.remove(key);
  }

  /*
   * Step events
   */

  private begin(event: Processes.Steps.Events.Begin) {
    this.console.log();

    const { key, indent } = eventProperties(event);

    this.spinners.add(key, {
      succeedColor: "white",
      failColor: "white",
      indent: indent
    });
  }

  private log(event: Processes.Steps.Events.Log) {
    const { message } = event;

    const { key } = eventProperties(event);

    this.spinners.update(key, {
      text: `${message}`
    });
  }

  private succeed(event: Processes.Steps.Events.Succeed) {
    const { message } = event;

    const { key } = eventProperties(event);

    const options = message ? { text: message } : {};

    this.spinners.succeed(key, options);
  }

  private step(event: Processes.Steps.Events.Step) {
    const { key, indent } = eventProperties(event);

    const { message } = event;

    this.spinners.add(key, {
      text: message,
      indent,
      succeedColor: "white",
      failColor: "white"
    });
  }

  /*
   * Unknown events
   */

  private resolve(event: Processes.Unknowns.Events.Resolve) {
    const { payload } = event;

    const { key } = eventProperties(event);

    const { text } = this.spinners.pick(key);

    const options = payload ? { text: `${chalk.cyan(text)}: ${payload}` } : {};

    this.spinners.update(key, {
      ...options,
      status: "stopped"
    });
  }

  private declare(event: Processes.Unknowns.Events.Declare) {
    const { key, indent } = eventProperties(event);

    const { message } = event;

    this.spinners.add(key, {
      text: message,
      indent,
      succeedColor: "white",
      failColor: "white"
    });
  }
}

const eventProperties = (event: Processes.Event) => ({
  key: Processes.Scopes.toKey(event.scope),
  indent: event.scope.length * 2
});
