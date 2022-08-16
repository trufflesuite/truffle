export interface EnvironmentOptions {
  /**
   * Working directory from which to interact with Hardhat
   *
   * @default process.cwd()
   */
  workingDirectory?: string;
}

export const withDefaultEnvironmentOptions = ({
  workingDirectory = process.cwd()
}: EnvironmentOptions = {}): EnvironmentOptions => ({
  workingDirectory
});
