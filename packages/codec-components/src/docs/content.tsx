import React from "react";
import * as C from "../react";
import * as data from "./data";
import styles from "./styles.module.scss";

interface ContentEntry {
  type: "codec-interface" | "codec-type" | "common";
  name: string;
  content: React.ReactNode;
}

const entries: ContentEntry[] = [
  {
    type: "codec-interface",
    name: "AbiArgument",
    content: (
      <>
        <h3>With param name</h3>
        <C.AbiArgument data={data.abiArgument.withParamName} />
        <h3>Without param name</h3>
        <C.AbiArgument data={data.abiArgument.withoutParamName} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "AnonymousDecoding",
    content: (
      <>
        <p>To consider: Indexed params </p>
        <h3>One param</h3>
        <C.AnonymousDecoding data={data.anonymousDecoding.oneParam} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "BytecodeDecoding",
    content: (
      <>
        <p>To consider: Immutable state variables.</p>
        <h3>SimpleStorage runtime bytecode</h3>
        <C.BytecodeDecoding data={data.bytecodeDecoding.simpleStorage} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "ConstructorDecoding",
    content: (
      <>
        <h3>ZeroParam</h3>
        <C.ConstructorDecoding data={data.constructorDecoding.zeroParam} />
        <h3>SimpleStorage</h3>
        <C.ConstructorDecoding data={data.constructorDecoding.simpleStorage} />
        <h3>ManyParams</h3>
        <C.ConstructorDecoding data={data.constructorDecoding.manyParams} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "EmptyFailureDecoding",
    content: (
      <>
        <h3>revert</h3>
        <C.EmptyFailureDecoding data={data.emptyFailureDecoding.decoding} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "EventDecoding",
    content: (
      <>
        <p>Consider: Index params</p>
        <h3>No param</h3>
        <C.EventDecoding data={data.eventDecoding.noParam} />
        <h3>One param</h3>
        <C.EventDecoding data={data.eventDecoding.oneParam} />
        <h3>Multiple params</h3>
        <C.EventDecoding data={data.eventDecoding.multipleParams} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "FunctionDecoding",
    content: (
      <>
        <h3>ZeroParam.a</h3>
        <C.FunctionDecoding data={data.functionDecoding.zeroParamA} />
        <h3>SimpleStorage.write</h3>
        <C.FunctionDecoding data={data.functionDecoding.simpleStorageWrite} />
        <h3>ManyParams.doSomething</h3>
        <C.FunctionDecoding
          data={data.functionDecoding.manyParamsDoSomething}
        />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "MessageDecoding",
    content: (
      <>
        <p>Consider: Better display for unknown function name (no abi)</p>
        <h3>fallback</h3>
        <C.MessageDecoding data={data.messageDecoding.fallback} />
        <h3>receive</h3>
        <C.MessageDecoding data={data.messageDecoding.receive} />
        <h3>No abi</h3>
        <C.MessageDecoding data={data.messageDecoding.noAbi} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "RawReturnDecoding",
    content: (
      <>
        <h3>Some data</h3>
        <C.RawReturnDecoding data={data.rawReturnDecoding.someData} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "ReturnDecoding",
    content: (
      <>
        <h3>One value</h3>
        <C.ReturnDecoding data={data.returnDecoding.oneValue} />
        <h3>Multiple values</h3>
        <C.ReturnDecoding data={data.returnDecoding.multipleValues} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "RevertMessageDecoding",
    content: (
      <>
        <h3>Unauthorized</h3>
        <C.RevertMessageDecoding
          data={data.revertMessageDecoding.unauthorized}
        />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "SelfDestructDecoding",
    content: (
      <>
        <h3>selfdestruct</h3>
        <C.SelfDestructDecoding data={data.selfDestructDecoding.decoding} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "StateVariable",
    content: (
      <>
        <h3>string</h3>
        <C.StateVariable data={data.stateVariable.string} />
        <h3>uint8</h3>
        <C.StateVariable data={data.stateVariable.uint8} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "UnknownBytecodeDecoding",
    content: (
      <>
        <p>Consider: Somehow emphasize that this is a decoding</p>
        <h3>Some contract</h3>
        <C.UnknownBytecodeDecoding
          data={data.unknownBytecodeDecoding.someContract}
        />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "UnknownCallDecoding",
    content: (
      <>
        <p>Consider: Somehow emphasize that this is a decoding</p>
        <h3>0x2f048afa</h3>
        <C.UnknownCallDecoding data={data.unknownCallDecoding.decoding} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "UnknownCreationDecoding",
    content: (
      <>
        <p>Consider: Somehow emphasize that this is a decoding</p>
        <h3>Unknown</h3>
        <C.UnknownCreationDecoding
          data={data.unknownCreationDecoding.decoding}
        />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.ArrayValue",
    content: (
      <>
        <h3>address[]</h3>
        <C.ArrayValue data={data.arrayValue.address} />
        <h3>bool[]</h3>
        <C.ArrayValue data={data.arrayValue.bool} />
        <h3>bytes[] (dynamic)</h3>
        <C.ArrayValue data={data.arrayValue.bytesDynamic} />
        <h3>int[]</h3>
        <C.ArrayValue data={data.arrayValue.int} />
        <h3>string[]</h3>
        <C.ArrayValue data={data.arrayValue.string} />
        <h3>uint[]</h3>
        <C.ArrayValue data={data.arrayValue.uint} />
        <h3>string[][]</h3>
        <C.ArrayValue data={data.arrayValue.string2D} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.MappingValue",
    content: (
      <>
        <p>To consider: Format.Values.MappingValue["type"]</p>
        <h3>mapping(int32 {"=>"} address)</h3>
        <C.MappingValue data={data.mappingValue.int32ToAddress} />
        <h3>Nested</h3>
        <C.MappingValue data={data.mappingValue.nested} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.StructValue",
    content: (
      <>
        <h3>Local</h3>
        <C.StructValue data={data.structValue.local} />
        <h3>Global</h3>
        <C.StructValue data={data.structValue.global} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.TupleValue",
    content: (
      <>
        <h3>Empty</h3>
        <C.TupleValue data={data.tupleValue.empty} />
        <h3>Not empty</h3>
        <C.TupleValue data={data.tupleValue.notEmpty} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.KeyValuePair",
    content: (
      <>
        <h3>address {"=>"} uint</h3>
        <C.KeyValuePair data={data.keyValuePair.addressToUint} />
        <h3>address {"=>"} bool[]</h3>
        <C.KeyValuePair data={data.keyValuePair.addressToBoolArray} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.NameValuePair",
    content: (
      <>
        <h3>bytes32</h3>
        <C.NameValuePair data={data.nameValuePair.bytes32} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.OptionallyNamedValue",
    content: (
      <>
        <h3>With name</h3>
        <C.OptionallyNamedValue data={data.optionallyNamedValue.withName} />
        <h3>Without name</h3>
        <C.OptionallyNamedValue data={data.optionallyNamedValue.withoutName} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.AddressValue",
    content: (
      <>
        <p>To consider:</p>
        <ul>
          <li>Richer display: ENS, payable.</li>
        </ul>
        <h3>General</h3>
        <C.AddressValue data={data.addressValue.general} />
        <h3>Payable</h3>
        <C.AddressValue data={data.addressValue.payable} />
        <h3>Non-payable</h3>
        <C.AddressValue data={data.addressValue.nonPayable} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.BoolValue",
    content: (
      <>
        <h3>True</h3>
        <C.BoolValue data={data.boolValue.true} />
        <h3>False</h3>
        <C.BoolValue data={data.boolValue.false} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.BytesDynamicValue",
    content: (
      <>
        <p>To consider:</p>
        <ul>
          <li>Location (currently displayed in `title` on hover).</li>
          <li>Kind (dynamic).</li>
        </ul>
        <h3>Without location</h3>
        <C.BytesDynamicValue data={data.bytesDynamicValue.withoutLocation} />
        <h3>In storage</h3>
        <C.BytesDynamicValue data={data.bytesDynamicValue.inStorage} />
        <h3>In memory</h3>
        <C.BytesDynamicValue data={data.bytesDynamicValue.inMemory} />
        <h3>In calldata</h3>
        <C.BytesDynamicValue data={data.bytesDynamicValue.inCalldata} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.BytesStaticValue",
    content: (
      <>
        <p>To consider:</p>
        <ul>
          <li>Length</li>
          <li>Kind (static).</li>
        </ul>
        <h3>bytes8</h3>
        <C.BytesStaticValue data={data.bytesStaticValue.bytes8} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.FixedValue",
    content: (
      <>
        <h3>fixed128x18</h3>
        <C.FixedValue data={data.fixedValue.fixed128x18} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.IntValue",
    content: (
      <>
        <h3>int256</h3>
        <C.IntValue data={data.intValue.int256} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.StringValueInfoMalformed",
    content: (
      <>
        <p>
          It's the same color as bytes and `title` says "malformed" on hover.
        </p>
        <h3>0xfffff</h3>
        <C.StringValueInfoMalformed
          data={data.stringValueInfoMalformed.fffff}
        />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.StringValueInfoValid",
    content: (
      <>
        <h3>Some string</h3>
        <C.StringValueInfoValid data={data.stringValueInfoValid.someString} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.StringValue",
    content: (
      <>
        <h3>Valid</h3>
        <C.StringValue data={data.stringValue.valid} />
        <h3>Malformed</h3>
        <C.StringValue data={data.stringValue.malformed} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.UfixedValue",
    content: (
      <>
        <h3>ufixed128x18</h3>
        <C.UfixedValue data={data.ufixedValue.ufixed128x18} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Format.Values.UintValue",
    content: (
      <>
        <h3>uint8</h3>
        <C.UintValue data={data.uintValue.uint8} />
        <h3>uint256</h3>
        <C.UintValue data={data.uintValue.uint256} />
      </>
    )
  },
  {
    type: "codec-interface",
    name: "Options",
    content: (
      <>
        <h3>Empty</h3>
        <C.Options data={data.options.empty} />
        <h3>Not empty</h3>
        <C.Options data={data.options.notEmpty} />
      </>
    )
  },
  {
    type: "common",
    name: "AbiArguments",
    content: (
      <>
        <h3>Single</h3>
        <C.AbiArguments data={[data.abiArgument.withParamName]} />
        <h3>Multiple</h3>
        <C.AbiArguments
          data={[
            data.abiArgument.withParamName,
            data.abiArgument.withoutParamName
          ]}
        />
      </>
    )
  },
  {
    type: "common",
    name: "Code",
    content: (
      <>
        <h3>Some text</h3>
        <C.Code>foobar</C.Code>
      </>
    )
  },
  {
    type: "common",
    name: "Container",
    content: (
      <>
        <h3>No child</h3>
        <C.Container
          prefix={<mark style={{ backgroundColor: "cyan" }}>prefix</mark>}
          suffix={<mark style={{ backgroundColor: "magenta" }}>suffix</mark>}
          empty={true}
          children={undefined}
        />
        <h3>With child</h3>
        <C.Container
          prefix={<mark style={{ backgroundColor: "cyan" }}>prefix</mark>}
          suffix={<mark style={{ backgroundColor: "magenta" }}>suffix</mark>}
          empty={false}
        >
          <mark>child</mark>
        </C.Container>
        <h3>With children</h3>
        <C.Container
          prefix={<mark style={{ backgroundColor: "cyan" }}>prefix</mark>}
          suffix={<mark style={{ backgroundColor: "magenta" }}>suffix</mark>}
          empty={false}
        >
          <mark style={{ backgroundColor: "hsl(60,0%,60%)" }}>
            Lorem ipsum dolor sit amet.
          </mark>
          <mark style={{ backgroundColor: "hsl(60,50%,60%)" }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam
            blandit ante libero, at pellentesque dui cursus ac. Donec est enim.
          </mark>
          <mark style={{ backgroundColor: "hsl(60,100%,60%)" }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam sed.
          </mark>
        </C.Container>
        <h3>Nested</h3>
        <C.Container
          prefix={<mark style={{ backgroundColor: "cyan" }}>prefix</mark>}
          suffix={<mark style={{ backgroundColor: "magenta" }}>suffix</mark>}
          empty={false}
        >
          <mark style={{ backgroundColor: "hsl(60,0%,60%)" }}>hello</mark>
          <C.Container prefix="[" suffix="]" empty={false}>
            <mark style={{ backgroundColor: "hsl(60,16%,60%)" }}>abcd</mark>
            <mark style={{ backgroundColor: "hsl(60,32%,60%)" }}>
              the quick brown fox jumped over the lazy dog
            </mark>
            <C.Container prefix="{" suffix="}" empty={false}>
              <mark style={{ backgroundColor: "hsl(60,48%,60%)" }}>0x1234</mark>
              <mark style={{ backgroundColor: "hsl(60,64%,60%)" }}>
                0xbc1f71253612b66b5938e6cc90b161676ff66a905c76d8216a8c187fd42ded88941924d65b325914
              </mark>
              <mark style={{ backgroundColor: "hsl(60,80%,60%)" }}>
                0xf561eaff77c193335e68
              </mark>
            </C.Container>
            <mark style={{ backgroundColor: "hsl(60,96%,60%)" }}>foobar</mark>
          </C.Container>
        </C.Container>
      </>
    )
  }
];

export const content: (() => JSX.Element)[] = [];
export const links: (() => JSX.Element)[] = [];

entries.forEach(entry => {
  content.push(() => (
    <div className={styles["entry"]}>
      <h2 id={entry.name}>
        <a href={`#${entry.name}`} className={styles["link"]}>
          # {entry.name}
        </a>
        &nbsp;&nbsp;
        {(entry.type === "codec-interface" || entry.type === "codec-type") && (
          <a
            href={`https://trufflesuite.com/docs/truffle/codec/${
              entry.type === "codec-interface" ? "interfaces" : "modules"
            }/_truffle_codec.${entry.name}.html`}
            target="_blank"
            className={`${styles["link"]} ${styles["link-dim"]}`}
          >
            type &#11008;
          </a>
        )}
      </h2>
      {entry.content}
    </div>
  ));
  links.push(() => {
    const split = entry.name.split(".");
    return (
      <li>
        <a href={`#${entry.name}`} className={styles["link"]}>
          {split[split.length - 1]}
        </a>
      </li>
    );
  });
});
