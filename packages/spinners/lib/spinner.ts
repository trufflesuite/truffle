import Spinnies, {
  SpinnerOptions,
  StopAllStatus,
  Color
} from "@trufflesuite/spinnies";

const spinnies = new Spinnies();

export class Spinner {
  name: string;

  constructor(name: string, options: Partial<SpinnerOptions>);
  constructor(name: string, text: string);
  constructor(name: string, optionsOrText: Partial<SpinnerOptions> | string) {
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
  stop(text?: string): void;
  stop(options?: Partial<SpinnerOptions>): void;
  stop(textOrOptions?: string | Partial<SpinnerOptions>): void {
    if (!spinnies.pick(this.name)) {
      return;
    }
    spinnies.stop(this.name, textOrOptions);
  }

  /**
   * Stops the spinner and sets its status to succeeded.
   */
  succeed(text?: string): void;
  succeed(options?: Partial<SpinnerOptions>): void;
  succeed(textOrOptions?: string | Partial<SpinnerOptions>): void {
    if (!spinnies.pick(this.name)) {
      return;
    }
    spinnies.succeed(this.name, textOrOptions);
  }

  /**
   * Stops the spinner and sets its status to fail.
   */
  fail(text?: string): void;
  fail(options?: Partial<SpinnerOptions>): void;
  fail(textOrOptions?: string | Partial<SpinnerOptions>): void {
    if (!spinnies.pick(this.name)) {
      return;
    }
    spinnies.fail(this.name, textOrOptions);
  }

  /**
   * Stops the spinner and sets its status to warn.
   */
  warn(text?: string): void;
  warn(options?: Partial<SpinnerOptions>): void;
  warn(textOrOptions?: string | Partial<SpinnerOptions>): void {
    if (!spinnies.pick(this.name)) {
      return;
    }
    spinnies.warn(this.name, textOrOptions);
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
   * @returns the indent level of this spinner, expressed as a number of spaces
   */
  public get indent(): number | undefined {
    return spinnies.pick(this.name)?.indent;
  }

  /**
   * Sets the indent level of this spinner, expressed as a number of spaces
   */
  public set indent(value: number | undefined) {
    this._mutateOptions("indent", value);
  }

  /**
   * @returns string the `chalk` color of this spinner's text
   */
  public get textColor(): Color | undefined {
    return spinnies.pick(this.name)?.textColor;
  }

  /**
   * updates the `chalk` color of this spinner's text
   */
  public set textColor(value: Color | undefined) {
    this._mutateOptions("textColor", value);
  }

  /**
   * @returns string the `chalk` color of this spinner decoration
   */
  public get prefixColor(): Color | undefined {
    return spinnies.pick(this.name)?.prefixColor;
  }

  /**
   * updates the `chalk` color of this spinner's decoration
   */
  public set prefixColor(value: Color | undefined) {
    this._mutateOptions("prefixColor", value);
  }

  /**
   * @returns string the prefix used when this spinner is stopped
   */
  public get stoppedPrefix(): string | undefined {
    return spinnies.pick(this.name)?.stoppedPrefix;
  }

  /**
   * updates the prefix used when this spinner is stopped
   */
  public set stoppedPrefix(value: string | undefined) {
    this._mutateOptions("stoppedPrefix", value);
  }

  /**
   * @returns string the prefix used on success
   */
  public get succeedPrefix(): string {
    return spinnies.pick(this.name)?.succeedPrefix;
  }

  /**
   * updates the prefix used on success
   */
  public set succeedPrefix(value: string) {
    this._mutateOptions("succeedPrefix", value);
  }

  /**
   * @returns string the prefix used on failure
   */
  public get failPrefix(): string {
    return spinnies.pick(this.name)?.failPrefix;
  }

  /**
   * updates the prefix used on failure
   */
  public set failPrefix(value: string) {
    this._mutateOptions("failPrefix", value);
  }

  /**
   * @returns string the prefix used on warn
   */
  public get warnPrefix(): string {
    return spinnies.pick(this.name)?.warnPrefix;
  }

  /**
   * updates the prefix used on warn
   */
  public set warnPrefix(value: string) {
    this._mutateOptions("warnPrefix", value);
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
    const options = spinnies.pick(this.name) as unknown as {
      [index: string]: T;
    };

    if (!options) {
      return;
    }

    options[key] = value;

    spinnies.update(this.name, options);
  }
}
