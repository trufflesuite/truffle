import Spinnies, { SpinnerOptions, StopAllStatus } from "spinnies";

const spinnies = new Spinnies();

export class Spinner {
  name: string;

  constructor(name: string, options: SpinnerOptions);
  constructor(name: string, text: string);
  constructor(name: string, optionsOrText: SpinnerOptions | string) {
    this.name = name;

    const options =
      typeof optionsOrText === "string"
        ? { text: optionsOrText }
        : optionsOrText;

    if (options.text === undefined) {
      throw new Error("Spinner text cannot be undefined");
    }

    spinnies.add(this.name, options);
  }

  /**
   * Stops all spinners
   * @param status the terminal state of the spinners that have been stopped (one of "stopped", "succeed", or "fail").
   */
  static stopAll(status?: StopAllStatus) {
    spinnies.stopAll(status);
  }

  /**
   * @returns false if all spinners have succeeded, failed or have been stopped
   */
  static hasActiveSpinners(): boolean {
    return spinnies.hasActiveSpinners();
  }

  /**
   * Removes this spinner from display. After this method is called, other modifications to this spinner object have no effect.
   */
  remove() {
    if (!spinnies.pick(this.name)) {
      return;
    }
    spinnies.remove(this.name);
  }

  /**
   * Stops the spinner without a failed or succeeded status
   */
  stop(options?: SpinnerOptions) {
    const currentOptions = spinnies.pick(this.name);
    if (!currentOptions) {
      return;
    }

    spinnies.update(this.name, {
      ...currentOptions,
      ...options,
      status: "stopped"
    });
  }

  /**
   * Stops the spinner and sets its status to succeeded.
   */
  succeed(text?: string) {
    const options = spinnies.pick(this.name);

    if (!options) {
      return;
    }

    spinnies.succeed(this.name, {
      ...options,
      text
    });
  }

  /**
   * Stops the spinner and sets its status to fail.
   */
  fail(text?: string) {
    const options = spinnies.pick(this.name);

    if (!options) {
      return;
    }

    spinnies.fail(this.name, {
      ...options,
      text
    });
  }

  /**
   * @returns string the spinner prefix used on success
   */
  public static get succeedPrefix(): string {
    return spinnies.options.succeedPrefix as string;
  }

  /**
   * Updates the spinner success decoration. Updates apply to all spinning
   * spinners, and do not apply to spinners that have already stopped.
   */
  public static set succeedPrefix(value: string) {
    spinnies.options.succeedPrefix = value;
  }

  /**
   * @returns string the spinner prefix used on failure
   */
  public static get failPrefix(): string {
    return spinnies.options.failPrefix as string;
  }

  /**
   * Updates the spinner fail decoration. Updates apply to all spinning
   * spinners, and do not apply to spinners that have already stopped.
   */
  public static set failPrefix(value: string) {
    spinnies.options.failPrefix = value;
  }

  /**
   * @returns string the text currently displayed by this spinner, without the
   * spinner decoration
   */
  public get text(): string | undefined {
    return spinnies.pick(this.name)?.text;
  }

  /**
   * Updates the text displayed by this spinner
   */
  public set text(value: string | undefined) {
    this._mutateOptions("text", value);
  }

  /**
   * @returns string the `chalk` color of this spinner's text
   */
  public get color(): string | undefined {
    return spinnies.pick(this.name)?.color;
  }

  /**
   * updates the `chalk` color of this spinner's text
   */
  public set color(value: string | undefined) {
    this._mutateOptions("color", value);
  }

  /**
   * @returns string the `chalk` color of this spinner decoration
   */
  public get spinnerColor(): string | undefined {
    return spinnies.pick(this.name)?.spinnerColor;
  }

  /**
   * updates the `chalk` color of this spinner's decoration
   */
  public set spinnerColor(value: string | undefined) {
    this._mutateOptions("spinnerColor", value);
  }

  /**
   * @returns string the `chalk` color of this spinner text on success (note: on
   * success, the spinner decoration is always green)
   */
  public get succeedColor(): string | undefined {
    return spinnies.pick(this.name)?.succeedColor;
  }

  /**
   * Updates the `chalk` color of this spinner's text on success
   */
  public set succeedColor(value: string | undefined) {
    this._mutateOptions("succeedColor", value);
  }

  /**
   * @returns string the `chalk` color of this spinner text on failure (note: on
   * failure, the spinner decoration is always red)
   */
  public get failColor(): string | undefined {
    return spinnies.pick(this.name)?.failColor;
  }

  /**
   * Updates the `chalk` color of this spinner's text on failure
   */
  public set failColor(value: string | undefined) {
    this._mutateOptions("failColor", value);
  }

  /**
   * @returns boolean `true` when the spinner is active and spinning, otherwise
   * `false`
   */
  public get isSpinning(): boolean {
    const options = spinnies.pick(this.name);
    if (!options) {
      return false;
    }

    return options.status === "spinning";
  }

  private _mutateOptions<T>(key: string, value: T) {
    const options = spinnies.pick(this.name) as { [index: string]: T };

    if (!options) {
      return;
    }

    options[key] = value;

    spinnies.update(this.name, options as SpinnerOptions);
  }
}
