import assert from "assert";
import { mnemonicToSeedSync } from "bip39";

import {
  createAccountGeneratorFromSeedAndPath,
  uncompressedPublicKeyToAddress
} from "../src/";
describe("hdwallet", () => {
  it("generate accounts and keys", () => {
    const accounts = [
      {
        address: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
        key: "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"
      },
      {
        address: "0xf17f52151ebef6c7334fad080c5704d77216b732",
        key: "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f"
      },
      {
        address: "0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef",
        key: "0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1"
      },
      {
        address: "0x821aea9a577a9b44299b9c15c88cf3087f3b5544",
        key: "c88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c"
      },
      {
        address: "0x0d1d4e623d10f9fba5db95830f7d3839406c6af2",
        key: "388c684f0ba1ef5017716adb5d21a053ea8e90277d0868337519f97bede61418"
      },
      {
        address: "0x2932b7a2355d6fecc4b5c0b6bd44cc31df247a2e",
        key: "659cbb0e2411a44db63778987b1e22153c086a95eb6b18bdf89de078917abc63"
      },
      {
        address: "0x2191ef87e392377ec08e7c08eb105ef5448eced5",
        key: "82d052c865f5763aad42add438569276c00d3d88a2d062d36b2bae914d58b8c8"
      },
      {
        address: "0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5",
        key: "aa3680d5d48a8283413f7a108367c7299ca73f553735860a87b08f39395618b7"
      },
      {
        address: "0x6330a553fc93768f612722bb8c2ec78ac90b3bbc",
        key: "0f62d96d6675f32685bbdb8ac13cda7c23436f63efbb9d07700d8669ff12b7c4"
      },
      {
        address: "0x5aeda56215b167893e80b4fe645ba6d5bab767de",
        key: "8d5366123cb560bb606379f90a0bfd4769eecc0557f1b362dcae9012b548b1e5"
      }
    ];
    const mnemonic =
      "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
    const walletHdpath = "m/44'/60'/0'/0".split("/");

    const hdwallet = createAccountGeneratorFromSeedAndPath(
      Buffer.from(mnemonicToSeedSync(mnemonic)),
      walletHdpath
    );

    const generatedAccounts: Record<string, string>[] = [];
    for (let i = 0; i < 10; i++) {
      const wallet = hdwallet(i);
      const address = `0x${Buffer.from(
        uncompressedPublicKeyToAddress(wallet.publicKey)
      ).toString("hex")}`;
      const key = wallet.privateKey.toString("hex");
      generatedAccounts.push({ address, key });
    }

    assert.deepStrictEqual(generatedAccounts, accounts);
  });
});
