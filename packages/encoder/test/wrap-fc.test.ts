import { assert } from "chai";

import * as Encoder from "..";
import * as Codec from "@truffle/codec";

import Big from "big.js";
import BigNumber from "bignumber.js";
import {
  BigNumber as EthersBigNumber,
  FixedNumber
} from "@ethersproject/bignumber";

import * as fc from "fast-check";
import { testProp } from "jest-fast-check";
import Web3Utils from "web3-utils";
import utf8 from "utf8";

//warning: copypasted from @truffle/abi-utils
const Bytes = () => fc.nat(31).map(k => 32 - k);
const Bits = () => Bytes().map(k => 8 * k);
const DecimalPlaces = () => fc.nat(79).map(k => ((k + 17) % 80) + 1);
const Precision = () => fc.record({ bits: Bits(), places: DecimalPlaces() });

const addBoxes = (inputs: any[]) => {
  let boxed: any[] = [];
  for (const input of inputs) {
    switch (typeof input) {
      case "number":
        boxed.push(new Number(input));
        break;
      case "string":
        boxed.push(new String(input));
        break;
      case "boolean":
        boxed.push(new Boolean(input));
        break;
    }
    boxed.push(input);
  }
  return boxed;
};

const UintInfo = () =>
  Bits().chain((bits: number) => fc.record({
    bits: fc.constant(bits),
    value: fc.bigUintN(bits)
  })).chain(({ bits, value }: { bits: number, value: bigint }) => fc.record({
    type: fc.constant({ typeClass: "uint" as const, bits }),
    value: fc.constant(value),
    input: UintInput(value, bits)
  }));

const UintInput = (value: bigint, bits: number) => {
  let representations: any[] = [
    value, //bigint,
    Codec.Conversion.toBN(value), //BN,
    new Big(value.toString()), //Big,
    new BigNumber(value.toString()), //BigNumber (MikeMcl)
    EthersBigNumber.from("0x" + value.toString(16)), //BigNumber (ethers)
    FixedNumber.from(value.toString(), `ufixed${bits}x0`), //FixedNumber
    value.toString(), //string (decimal)
    "0x" + value.toString(16), //string (hex)
    "0o" + value.toString(8), //string (octal)
    "0b" + value.toString(2), //string (binary)
    Codec.Conversion.toBytes(value) //Uint8Array
  ];
  try {
    const asNumber = Number(value);
    if (Number.isSafeInteger(asNumber)) {
      representations.push(asNumber); //number
    }
  } catch {
    //just don't add it
  }
  return fc.oneof(...addBoxes(representations).map(fc.constant));
};

const IntInfo = () =>
  Bits().chain((bits: number) => fc.record({
    bits: fc.constant(bits),
    value: fc.bigIntN(bits)
  })).chain(({ bits, value }: { bits: number, value: bigint }) => fc.record({
    type: fc.constant({ typeClass: "int" as const, bits }),
    value: fc.constant(value),
    input: IntInput(value, bits)
  }));

const IntInput = (value: bigint, bits: number) => {
  let representations: any[] = [
    value, //bigint,
    Codec.Conversion.toBN(value), //BN,
    new Big(value.toString()), //Big,
    new BigNumber(value.toString()), //BigNumber (MikeMcl)
    FixedNumber.from(value.toString(), `fixed${bits}x0`), //FixedNumber
    value.toString() //string (decimal)
  ];
  if (value >= BigInt(0)) {
    representations.push(Codec.Conversion.toBytes(value)); //Uint8Array
    representations.push("0x" + value.toString(16)); //string (hex)
    representations.push("0o" + value.toString(8)); //string (octal)
    representations.push("0b" + value.toString(2)); //string (binary)
    representations.push(EthersBigNumber.from("0x" + value.toString(16))); //BigNumber (ethers)
  } else {
    representations.push("-0x" + value.toString(16).slice(1)); //string (neg hex)
    representations.push("-0o" + value.toString(8).slice(1)); //string (neg octal)
    representations.push("-0b" + value.toString(2).slice(1)); //string (neg binary)
    representations.push(EthersBigNumber.from("-0x" + value.toString(16).slice(1))); //BigNumber (ethers)
  }
  try {
    const asNumber = Number(value);
    if (Number.isSafeInteger(asNumber)) {
      representations.push(asNumber); //number
    }
  } catch {
    //just don't add it
  }
  return fc.oneof(...addBoxes(representations).map(fc.constant));
};

const StringInfo = () => fc.fullUnicodeString().chain((value: string) => fc.record({
  type: fc.constant({ typeClass: "string" as const }),
  value: fc.constant(value),
  input: StringInput(value)
}));

const StringInput = (value: string) => {
  let representations: any[] = [value]; //string
  return fc.oneof(...addBoxes(representations).map(fc.constant));
};

const BytesStaticInfo = () =>
  Bytes().chain((bytes: number) => fc.record({
    bytes: fc.constant(bytes),
    value: fc.uint8Array({ maxLength: bytes })
  })).chain(({ bytes, value }: { bytes: number, value: Uint8Array }) => fc.record({
    type: fc.constant({ typeClass: "bytes" as const, kind: "static" as const, length: bytes }),
    value: fc.constant(value),
    input: BytesInput(value)
  }));

const BytesDynamicInfo = () =>
  fc.uint8Array().chain((value: Uint8Array) => fc.record({
    type: fc.constant({ typeClass: "bytes" as const, kind: "dynamic" as const }),
    value: fc.constant(value),
    input: BytesInput(value)
  }));

const BytesInput = (value: Uint8Array) => {
  let representations: any[] = [
    value, //Uint8Array,
    Codec.Conversion.toHexString(value), //string (lowercase)
    "0X" + Codec.Conversion.toHexString(value).toUpperCase().slice(2), //string (uppercase)
  ];
  //I wanted to do mixed-case but uh that turned out to be harder than expected
  try {
    let badlyEncodedString = String.fromCharCode.apply(undefined, value);
    let correctlyEncodedString = utf8.decode(badlyEncodedString);
    representations.push({
      encoding: "utf8",
      text: correctlyEncodedString
    });
  } catch {
    //just don't add it
  }
  return fc.oneof(...addBoxes(representations).map(fc.constant));
};

const AddressInfo = () =>
  fc.hexaString({ minLength: 40, maxLength: 40 }).chain((value: string) => fc.record({
    type: fc.constant({ typeClass: "address" as const, kind: "general" as const }),
    value: fc.constant(value),
    input: AddressInput(value)
  }));

const AddressInput = (value: string) => {
  let representations: any[] = [
    value, //lowercase, no prefix
    value.toUpperCase(), //uppercase, no prefix
    "0x" + value, //lowercase w/prefix
    "0X" + value.toUpperCase(), //uppercase w/prefix
    Web3Utils.toChecksumAddress("0x" + value), //checksum case w/prefix
    Web3Utils.toChecksumAddress("0x" + value).slice(2), //checksum case w/o prefix
    { address: "0x" + value } //object
  ];
  return fc.oneof(...addBoxes(representations).map(fc.constant));
};

const UfixedInfo = () =>
  Precision().chain(({ bits, places }: { bits: number, places: number }) => fc.record({
    bits: fc.constant(bits),
    places: fc.constant(places),
    value: fc.bigUintN(bits).map(value => Codec.Conversion.shiftBigDown(new Big(value.toString()), places))
  })).chain(({ bits, places, value }: { bits: number, places: number, value: Big }) => fc.record({
    type: fc.constant({ typeClass: "ufixed" as const, bits, places }),
    value: fc.constant(value),
    input: FixedInput(value, bits, places, false)
  }));

const FixedInfo = () =>
  Precision().chain(({ bits, places }: { bits: number, places: number }) => fc.record({
    bits: fc.constant(bits),
    places: fc.constant(places),
    value: fc.bigIntN(bits).map(value => Codec.Conversion.shiftBigDown(new Big(value.toString()), places))
  })).chain(({ bits, places, value }: { bits: number, places: number, value: Big }) => fc.record({
    type: fc.constant({ typeClass: "fixed" as const, bits, places }),
    value: fc.constant(value),
    input: FixedInput(value, bits, places, true)
  }));

const FixedInput = (value: Big, bits: number, places: number, signed: boolean) => {
  let prefix = signed ? "" : "u";
  let representations: any[] = [
    value, //Big
    new BigNumber(value.toFixed()), //BigNumber (MikeMcl)
    FixedNumber.from(value.toFixed(), `${prefix}fixed${bits}x${places}`), //FixedNumber
    value.toFixed() //string (decimal)
  ];
  if (Codec.Conversion.countDecimalPlaces(value) === 0) {
    //it's an integer
    representations.push(Codec.Conversion.toBN(value)); //BN
    representations.push(EthersBigNumber.from(value.toFixed())); //BigNumber (ethers)
    representations.push(BigInt(value.toFixed())); //bigint
  }
  let rawValue = Codec.Conversion.shiftBigUp(value, places);
  if (Number.isSafeInteger(rawValue.toNumber())) {
    representations.push(value.toNumber()); //number
  }
  return fc.oneof(...addBoxes(representations).map(fc.constant));
};

const BoolInfo = () =>
  fc.boolean().chain((value: boolean) => fc.record({
    type: fc.constant({ typeClass: "bool" as const }),
    value: fc.constant(value),
    input: BoolInput(value)
  }));

const BoolInput = (value: boolean) => {
  let representations: any[] = [
    value, //boolean
    value ? 1 : 0, //number
    value ? "true" : "false" //string
  ];
  return fc.oneof(...addBoxes(representations).map(fc.constant));
};

describe("Wrapping of elementary values", () => {
  let encoder: Encoder.ProjectEncoder;

  beforeAll(async () => {
    //make a generic encoder that can do generic wrapping & that's it
    encoder = await Encoder.forProject({ projectInfo: { compilations: [] } });
  });

  testProp("Unsigned integers", [UintInfo()], async info => {
    const wrapped = <Codec.Format.Values.UintValue>(
      await encoder.wrapElementaryValue(info.type, info.input)
    );
    assert(
      wrapped.value.asBN.eq(Codec.Conversion.toBN(info.value)),
      `Wrapped BN ${wrapped.value.asBN} did not match original value ${info.value}`
    );
  });

  testProp("Signed integers", [IntInfo()], async info => {
    const wrapped = <Codec.Format.Values.IntValue>(
      await encoder.wrapElementaryValue(info.type, info.input)
    );
    assert(
      wrapped.value.asBN.eq(Codec.Conversion.toBN(info.value)),
      `Wrapped BN ${wrapped.value.asBN} did not match original value ${info.value}`
    );
  });

  testProp("Strings", [StringInfo()], async info => {
    const wrapped = <Codec.Format.Values.StringValue>(
      await encoder.wrapElementaryValue(info.type, info.input)
    );
    assert.strictEqual(wrapped.value.kind, "valid");
    assert.strictEqual((<Codec.Format.Values.StringValueInfoValid>wrapped.value).asString, info.value);
  });

  testProp("Bytes (static-length)", [BytesStaticInfo()], async info => {
    const wrapped = <Codec.Format.Values.BytesValue>(
      await encoder.wrapElementaryValue(info.type, info.input)
    );
    assert.strictEqual(wrapped.value.asHex, Codec.Conversion.toHexString(info.value).padEnd(2 + 2 * info.type.length, "0"));
  });

  testProp("Bytes (dynamic-length)", [BytesDynamicInfo()], async info => {
    const wrapped = <Codec.Format.Values.BytesValue>(
      await encoder.wrapElementaryValue(info.type, info.input)
    );
    assert.strictEqual(wrapped.value.asHex, Codec.Conversion.toHexString(info.value));
  });

  testProp("Addresses", [AddressInfo()], async info => {
    const wrapped = <Codec.Format.Values.AddressValue>(
      await encoder.wrapElementaryValue(info.type, info.input)
    );
    assert.strictEqual(wrapped.value.asAddress, Web3Utils.toChecksumAddress("0x" + info.value));
  });

  testProp("Unsigned decimals", [UfixedInfo()], async info => {
    const wrapped = <Codec.Format.Values.UfixedValue>(
      await encoder.wrapElementaryValue(info.type, info.input)
    );
    assert(
      wrapped.value.asBig.eq(info.value),
      `Wrapped Big ${wrapped.value.asBig.toFixed()} did not match original value ${info.value.toFixed()}`
    );
  });

  testProp("Signed decimals", [FixedInfo()], async info => {
    const wrapped = <Codec.Format.Values.FixedValue>(
      await encoder.wrapElementaryValue(info.type, info.input)
    );
    assert(
      wrapped.value.asBig.eq(info.value),
      `Wrapped Big ${wrapped.value.asBig.toFixed()} did not match original value ${info.value.toFixed()}`
    );
  });

  testProp("Booleans", [BoolInfo()], async info => {
    const wrapped = <Codec.Format.Values.BoolValue>(
      await encoder.wrapElementaryValue(info.type, info.input)
    );
    assert.strictEqual(wrapped.value.asBoolean, info.value);
  });
});
