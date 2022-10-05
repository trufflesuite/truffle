import { keccak256 } from "ethereum-cryptography/keccak";
import { createHmac } from "crypto";
import secp256k1 from "secp256k1";

export type HDKey = {
  privateKey: Buffer;
  publicKey: Uint8Array;
  chainCode: Uint8Array;
};

const HARDENED_OFFSET = 0x80000000 as const;
const MASTER_SECRET = Buffer.from("Bitcoin seed", "utf8");

export function createAccountGeneratorFromSeedAndPath(
  seedBuffer: Uint8Array,
  hdPath: string[]
) {
  const parent = createAccountFromSeed(seedBuffer);
  const path = deriveFromPath(hdPath, parent);
  return (index: number) => {
    return deriveFromIndex(index, path);
  };
}

export const uncompressedPublicKeyToAddress = (
  uncompressedPublicKey: Uint8Array
) => {
  const address = Buffer.from(
    secp256k1.publicKeyConvert(uncompressedPublicKey, false)
  );
  // first byte is discarded
  const hash = keccak256(address.slice(1));
  return hash.slice(-20); // address is the last 20
};

function createAccountFromSeed(seedBuffer: Uint8Array): HDKey {
  const I = createHmac("sha512", MASTER_SECRET).update(seedBuffer).digest();
  const privateKey = I.slice(0, 32);
  const chainCode = I.slice(32);
  const publicKey = makePublicKey(privateKey);

  return {
    privateKey,
    chainCode,
    publicKey
  };
}

function deriveFromPath(fullPath: string[], child: HDKey): HDKey {
  fullPath.forEach(function (c, i) {
    if (i === 0) {
      if (!/^[mM]{1}/.test(c)) {
        throw new Error('Path must start with "m" or "M"');
      }
      return;
    }

    const hardened = c.length > 1 && c[c.length - 1] === "'";
    let childIndex = parseInt(c, 10);
    if (childIndex >= HARDENED_OFFSET) throw new Error("Invalid index");
    if (hardened) childIndex += HARDENED_OFFSET;

    child = deriveChild(
      childIndex,
      hardened,
      child.privateKey,
      child.publicKey,
      child.chainCode
    );
  });
  return child;
}

function deriveFromIndex(index: number, child: HDKey) {
  if (index >= HARDENED_OFFSET) throw new Error("Invalid index");

  return deriveChild(
    index,
    false,
    child.privateKey,
    child.publicKey,
    child.chainCode
  );
}

function makePublicKey(privateKey: Uint8Array) {
  return secp256k1.publicKeyCreate(privateKey);
}

/**
 * A buffer of size 4 that can be reused as long as all changes are consumed
 * within the same event loop.
 */
const SHARED_BUFFER_4 = Buffer.allocUnsafe(4);

function deriveChild(
  index: number,
  isHardened: boolean,
  privateKey: Buffer,
  publicKey: Uint8Array,
  chainCode: Uint8Array
): {
  privateKey: Buffer;
  publicKey: Uint8Array;
  chainCode: Uint8Array;
} {
  const indexBuffer = SHARED_BUFFER_4;
  indexBuffer.writeUInt32BE(index, 0);

  let data: Buffer;
  const privateKeyLength = privateKey.length;

  if (isHardened) {
    // Hardened child

    // privateKeyLength + 1 (BUFFER_ZERO.length) + 4 (indexBuffer.length)
    const dataLength = privateKeyLength + 1 + 4;
    data = Buffer.concat(
      [Buffer.allocUnsafe(1).fill(0), privateKey, indexBuffer],
      dataLength
    );
  } else {
    // Normal child
    data = Buffer.concat([publicKey, indexBuffer], publicKey.length + 4);
  }

  const I = createHmac("sha512", chainCode).update(data).digest();
  const IL = I.slice(0, 32);

  try {
    const privK = Buffer.allocUnsafe(privateKeyLength);
    privateKey.copy(privK, 0, 0, privateKeyLength);
    const newPrivK = secp256k1.privateKeyTweakAdd(privK, IL);
    return {
      privateKey: Buffer.from(newPrivK),
      publicKey: makePublicKey(newPrivK),
      chainCode: I.slice(32)
    };
  } catch {
    return deriveChild(index + 1, isHardened, privateKey, publicKey, chainCode);
  }
}
