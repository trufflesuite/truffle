import chalk from "chalk";
import { Spinner, SpinnerOptions } from "@truffle/spinners";

import * as Control from "./control";

export interface ConsoleReporterConstructorOptions {
  console: Console;
}

export class ConsoleReporter {
  private spinners: { [key: string]: Spinner };
  private console: Console;

  constructor(options: ConsoleReporterConstructorOptions) {
    this.spinners = {};
    this.console = options.console;
  }

  async report(events: AsyncIterable<Control.Event>) {
    for await (const event of events) {
      this[event.type].bind(this)(event);
    }
  }

  /*
   * Error events
   */

  private fail(event: Control.Events.Fail) {
    const { error } = event;

    const { key } = eventProperties(event);

    // get current text
    const { text, indent } = this.spinners[key];

    const errorMessage = error.message
      ? `Error: ${error.message}`
      : error.toString();

    const options: Partial<SpinnerOptions> = error
      ? {
          text: `${text}\n${" ".repeat(indent ?? 0)}${chalk.red(errorMessage)}`,
          textColor: "white"
        }
      : {
          textColor: "white"
        };

    this.spinners[key].fail(options);
  }

  private abort(event: Control.Events.Abort) {
    const { key } = eventProperties(event);

    this.spinners[key].fail({ textColor: "white" });
  }

  private stop(event: Control.Events.Stop) {
    const { key } = eventProperties(event);

    this.spinners[key].remove();
    delete this.spinners[key];
  }

  /*
   * Step events
   */

  private begin(event: Control.Events.Begin) {
    this.console.log();

    const { key, indent } = eventProperties(event);

    if (this.spinners[key]) {
      this.spinners[key].stop();
      this.spinners[key].remove();
    }

    this.spinners[key] = new Spinner(key, {
      text: "",
      indent: indent
    });
  }

  private succeed(event: Control.Events.Succeed) {
    const { message } = event;

    const { key } = eventProperties(event);

    const options: Partial<SpinnerOptions> = {
      text: message,
      textColor: "white"
    };

    this.spinners[key].succeed(options);
  }

  private step(event: Control.Events.Step) {
    const { key, indent } = eventProperties(event);

    const { message } = event;

    if (this.spinners[key]) {
      this.spinners[key].text = message;
      this.spinners[key].indent = indent;
    } else {
      this.spinners[key] = new Spinner(key, {
        text: message,
        indent
      });
    }
  }

  /*
   * Value resolution events
   */
  private declare(event: Control.Events.Declare) {
    const { key, indent } = eventProperties(event);

    const { message } = event;

    if (this.spinners[key]) {
      this.spinners[key].stop();
      this.spinners[key].remove();
    }

    this.spinners[key] = new Spinner(key, {
      text: message,
      textColor: "cyan",
      indent
    });
  }

  private resolve(event: Control.Events.Resolve) {
    const { payload } = event;

    const { key } = eventProperties(event);

    const { text } = this.spinners[key];

    if (text !== undefined) {
      const [name] = text.split(":");

      const options = payload ? { text: `${name}: ${payload}` } : { text };

      this.spinners[key].stop({
        ...options,
        status: "stopped"
      });
    }
  }

  private update(event: Control.Events.Update) {
    const { payload, message } = event;

    const { key } = eventProperties(event);

    const { text } = this.spinners[key];

    if (!payload && !message) return;

    if (text !== undefined) {
      const [name] = text.split(":");

      // Update the value resolution with a payload or the step with message
      this.spinners[key].text = message ? message : `${name}: ${payload}`;
    }
  }
}

const eventProperties = (event: Control.Event) => ({
  key: Control.Scopes.toKey(event.scope),
  indent: event.scope.length * 2
});
