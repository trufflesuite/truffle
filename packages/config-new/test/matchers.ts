import * as t from "io-ts";
import { isRight } from "fp-ts/lib/Either";
import reporter from "io-ts-reporters";

expect.extend({
  toBeValid<T>(item: unknown, codec: t.Type<T>) {
    const result = codec.decode(item);
    const pass = isRight(result);

    return {
      pass,
      message: pass
        ? () => [
            this.utils.matcherHint("toBeValid", "received", "codec", this),
            "",
            `Expected ${
              this.utils.printExpected(codec)
            } not to successfully decode ${
              this.utils.printReceived(item)
            }`
          ].join("\n")
        : () => [
            this.utils.matcherHint("toBeValid", "received", "codec", this),
            "",
            "Errors:",
            ...reporter.report(result).map(error => ` - ${error}`),
            ""
          ].join("\n")
    };
  }
});
