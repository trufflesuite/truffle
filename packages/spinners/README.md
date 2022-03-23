# `@truffle/spinners`

This is used to manage multiple CLI spinners. It is essentially just a wrapper
around the [`spinnies`](https://github.com/jcarpanelli/spinnies) library that
keeps a single instance of the `spinnies` object in module-level scope.

## Usage

### Typical example

```ts
import { Spinner } from "@truffle/spinners";

const spinner = new Spinner("unique-spinner-name", "watch me spin!");

try {
  await someLongRunningTask();
  spinner.succeed("Phew! 😅");
} catch {
  spinner.fail("Whoops, got too dizzy and fell over! 😵");
}
```

### Hide on completion

```ts
import { Spinner } from "@truffle/spinners";

const spinner = new Spinner("unique-spinner-name", "Now you see me");

await someLongRunningTask();
spinner.remove();
```

### Text updates

```ts
import { Spinner } from "@truffle/spinners";

const spinner = new Spinner("unique-spinner-name", "Reticulating splines...");

try {
  await reticulateSplines();

  spinner.text = "Perturbing Matrices";
  Promise.all(matrices.map(perturb));

  spinner.text = "Charging Ozone Layer";
  await ozoneLayer.charge();

  spinner.succeed();
} catch {
  spinner.fail("Darn it!");
}
```
