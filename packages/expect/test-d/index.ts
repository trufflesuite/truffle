import {
  expectAssignable,
  expectNotAssignable,
  expectType,
  expectNotType
} from "tsd";

import * as expect from "..";

interface Options {
  size?: string;
  design?: "original" | "neon";
  quantity?: number;
}

// expect.has
{
  const options: Options = { size: "medium", design: "original" };

  // assert we have size
  expect.has(options, "size");

  // check that we can assign asserted
  expectAssignable<{ size: string }>(options);

  // check that we can't assign not-asserted
  expectNotAssignable<{ size: string; design: "original" | "neon" }>(options);

  {
    const { size, design } = options;

    // check destructured properties
    expectType<string>(size);
    expectNotType<"original" | "neon">(design);
  }

  // add additional assertion now
  expect.has(options, "design");

  // check that assignment now holds
  expectAssignable<{ design: "original" | "neon" }>(options);

  {
    // and check destructuring again
    const { design } = options;
    expectType<"original" | "neon">(design);
  }
}

// expect.options
{
  const options: Options = { size: "medium", design: "original" };

  // assert two properties
  expect.options(options, ["size", "design"]);

  // check both properties
  expectAssignable<{ size: string; design: "original" | "neon" }>(options);

  // check that we can't assign other properties
  expectNotAssignable<{ quantity: number }>(options);

  {
    // check destructuring
    const { size, design, quantity } = options;
    expectType<string>(size);
    expectType<"original" | "neon">(design);
    expectNotType<number>(quantity);
  }
}

// expect.one
{
  const options: Options = { design: "original", quantity: 5 };
  expect.one(options, ["size", "quantity"]);

  expectAssignable<{ size: string } | { quantity: number }>(options);
  expectNotAssignable<{ size: string; quantity: number }>(options);

  {
    expect.has(options, "size");
    const { size, quantity } = options;

    expectType<string>(size);
    expectNotType<number>(quantity);
  }
}

// expect.one with more than one
{
  const options: Options = { size: "small", design: "neon", quantity: 5 };
  expect.one(options, ["size", "quantity"]);

  expectAssignable<{ size: string } | { quantity: number }>(options);
  expectNotAssignable<{ size: string; quantity: number }>(options);

  {
    expect.has(options, "size");
    const { size, quantity } = options;

    expectType<string>(size);
    expectNotType<number>(quantity);
  }
}
