declare module "spinnies" {
  namespace Spinnies {
    type StopAllStatus = "succeed" | "fail" | "stopped";
    type SpinnerStatus = StopAllStatus | "spinning" | "non-spinnable";

    interface Spinner {
      interval: number;
      frames: string[];
    }

    interface SpinnerOptions {
      /**
       * Optional text to show in the spinner. If none is provided, the name field will be shown.
       */
      text?: string;

      /**
       *  Optional, indent the spinner with the given number of spaces.
       * */
      indent?: number;

      /**
       * Initial status of the spinner. Valid statuses are: succeed, fail, spinning, non-spinnable and stopped.
       */
      status?: SpinnerStatus;

      /**
       * Any valid chalk color.
       */
      color?: string;

      /**
       * Any valid chalk color.
       */
      succeedColor?: string;

      /**
       * Any valid chalk color.
       */
      failColor?: string;
    }

    interface Options {
      /**
       * Any valid chalk color. The default value is white.
       */
      color?: string;

      /**
       * Any valid chalk color. The default value is green.
       */
      succeedColor?: string;

      /**
       * Any valid chalk color. The default value is red.
       */
      failColor?: string;

      /**
       * Any valid chalk color. The default value is greenBright.
       */
      spinnerColor?: string;

      /**
       * The default value is ✓.
       */
      succeedPrefix?: string;

      /**
       * The default value is ✖.
       */
      failPrefix?: string;

      /**
       * Disable spins (will still print raw messages).
       */
      disableSpins?: boolean;

      /**
       * Spinner configuration
       */
      spinner?: Spinner;
    }
  }

  class Spinnies {
    static dots: Spinnies.Spinner;
    static dashes: Spinnies.Spinner;

    constructor(options?: Spinnies.Options);

    /**
     * Add a new spinner with the given name.
     */
    add: (
      name: string,
      options?: Spinnies.SpinnerOptions
    ) => Spinnies.SpinnerOptions;

    /**
     * Get spinner by name.
     */
    pick: (name: string) => Spinnies.SpinnerOptions;

    /**
     * Remove spinner with name.
     */
    remove: (name: string) => Spinnies.SpinnerOptions;

    /**
     * Updates the spinner with name name with the provided options.
     */
    update: (
      name: string,
      options?: Spinnies.SpinnerOptions
    ) => Spinnies.SpinnerOptions;

    /**
     * Sets the specified spinner status as succeed.
     */
    succeed: (
      name: string,
      options?: Spinnies.SpinnerOptions
    ) => Spinnies.SpinnerOptions;

    /**
     * Sets the specified spinner status as fail.
     */
    fail: (
      name: string,
      options?: Spinnies.SpinnerOptions
    ) => Spinnies.SpinnerOptions;

    /**
     * Stops the spinners and sets the non-succeeded and non-failed ones to the provided status.
     */
    stopAll: (
      status?: Spinnies.StopAllStatus
    ) => { [name: string]: Spinnies.SpinnerOptions };

    /**
     * @returns false if all spinners have succeeded, failed or have been stopped
     */
    hasActiveSpinners: () => boolean;
  }

  export = Spinnies;
}
