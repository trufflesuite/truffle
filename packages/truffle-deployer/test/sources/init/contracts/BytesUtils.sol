pragma solidity >0.4.23;

library BytesUtils {
    /*
    * @dev Returns the keccak-256 hash of a byte range.
    * @param self The byte string to hash.
    * @param offset The position to start hashing at.
    * @param len The number of bytes to hash.
    * @return The hash of the byte range.
    */
    function keccak(bytes memory self, uint offset, uint len) internal pure returns (bytes32 ret) {
        require(offset + len <= self.length);
        assembly {
            ret := keccak256(add(add(self, 32), offset), len)
        }
    }


    /*
    * @dev Returns a positive number if `other` comes lexicographically after
    *      `self`, a negative number if it comes before, or zero if the
    *      contents of the two bytes are equal.
    * @param self The first bytes to compare.
    * @param other The second bytes to compare.
    * @return The result of the comparison.
    */
    function compare(bytes memory self, bytes memory other) internal pure returns (int) {
        return compare(self, 0, self.length, other, 0, other.length);
    }

    /*
    * @dev Returns a positive number if `other` comes lexicographically after
    *      `self`, a negative number if it comes before, or zero if the
    *      contents of the two bytes are equal. Comparison is done per-rune,
    *      on unicode codepoints.
    * @param self The first bytes to compare.
    * @param offset The offset of self.
    * @param len    The length of self.
    * @param other The second bytes to compare.
    * @param otheroffset The offset of the other string.
    * @param otherlen    The length of the other string.
    * @return The result of the comparison.
    */
    function compare(bytes memory self, uint offset, uint len, bytes memory other, uint otheroffset, uint otherlen) internal pure returns (int) {
        uint shortest = len;
        if (otherlen < len)
        shortest = otherlen;

        uint selfptr;
        uint otherptr;

        assembly {
            selfptr := add(self, add(offset, 32))
            otherptr := add(other, add(otheroffset, 32))
        }
        for (uint idx = 0; idx < shortest; idx += 32) {
            uint a;
            uint b;
            assembly {
                a := mload(selfptr)
                b := mload(otherptr)
            }
            if (a != b) {
                // Mask out irrelevant bytes and check again
                uint mask;
                if (shortest > 32) {
                    mask = uint256(- 1); // aka 0xffffff....
                } else {
                    mask = ~(2 ** (8 * (32 - shortest + idx)) - 1);
                }
                uint diff = (a & mask) - (b & mask);
                if (diff != 0)
                return int(diff);
            }
            selfptr += 32;
            otherptr += 32;
        }

        return int(len) - int(otherlen);
    }

    /*
    * @dev Returns true if the two byte ranges are equal.
    * @param self The first byte range to compare.
    * @param offset The offset into the first byte range.
    * @param other The second byte range to compare.
    * @param otherOffset The offset into the second byte range.
    * @param len The number of bytes to compare
    * @return True if the byte ranges are equal, false otherwise.
    */
    function equals(bytes memory self, uint offset, bytes memory other, uint otherOffset, uint len) internal pure returns (bool) {
        return keccak(self, offset, len) == keccak(other, otherOffset, len);
    }

    /*
    * @dev Returns true if the two byte ranges are equal with offsets.
    * @param self The first byte range to compare.
    * @param offset The offset into the first byte range.
    * @param other The second byte range to compare.
    * @param otherOffset The offset into the second byte range.
    * @return True if the byte ranges are equal, false otherwise.
    */
    function equals(bytes memory self, uint offset, bytes memory other, uint otherOffset) internal pure returns (bool) {
        return keccak(self, offset, self.length - offset) == keccak(other, otherOffset, other.length - otherOffset);
    }

    /*
    * @dev Compares a range of 'self' to all of 'other' and returns True iff
    *      they are equal.
    * @param self The first byte range to compare.
    * @param offset The offset into the first byte range.
    * @param other The second byte range to compare.
    * @return True if the byte ranges are equal, false otherwise.
    */
    function equals(bytes memory self, uint offset, bytes memory other) internal pure returns (bool) {
        return self.length >= offset + other.length && equals(self, offset, other, 0, other.length);
    }

    /*
    * @dev Returns true if the two byte ranges are equal.
    * @param self The first byte range to compare.
    * @param other The second byte range to compare.
    * @return True if the byte ranges are equal, false otherwise.
    */
    function equals(bytes memory self, bytes memory other) internal pure returns(bool) {
        return self.length == other.length && equals(self, 0, other, 0, self.length);
    }

    /*
    * @dev Returns the 8-bit number at the specified index of self.
    * @param self The byte string.
    * @param idx The index into the bytes
    * @return The specified 8 bits of the string, interpreted as an integer.
    */
    function readUint8(bytes memory self, uint idx) internal pure returns (uint8 ret) {
        return uint8(self[idx]);
    }

    /*
    * @dev Returns the 16-bit number at the specified index of self.
    * @param self The byte string.
    * @param idx The index into the bytes
    * @return The specified 16 bits of the string, interpreted as an integer.
    */
    function readUint16(bytes memory self, uint idx) internal pure returns (uint16 ret) {
        require(idx + 2 <= self.length);
        assembly {
            ret := and(mload(add(add(self, 2), idx)), 0xFFFF)
        }
    }

    /*
    * @dev Returns the 32-bit number at the specified index of self.
    * @param self The byte string.
    * @param idx The index into the bytes
    * @return The specified 32 bits of the string, interpreted as an integer.
    */
    function readUint32(bytes memory self, uint idx) internal pure returns (uint32 ret) {
        require(idx + 4 <= self.length);
        assembly {
            ret := and(mload(add(add(self, 4), idx)), 0xFFFFFFFF)
        }
    }

    /*
    * @dev Returns the 32 byte value at the specified index of self.
    * @param self The byte string.
    * @param idx The index into the bytes
    * @return The specified 32 bytes of the string.
    */
    function readBytes32(bytes memory self, uint idx) internal pure returns (bytes32 ret) {
        require(idx + 32 <= self.length);
        assembly {
            ret := mload(add(add(self, 32), idx))
        }
    }

    /*
    * @dev Returns the 32 byte value at the specified index of self.
    * @param self The byte string.
    * @param idx The index into the bytes
    * @return The specified 32 bytes of the string.
    */
    function readBytes20(bytes memory self, uint idx) internal pure returns (bytes20 ret) {
        require(idx + 20 <= self.length);
        assembly {
            ret := and(mload(add(add(self, 32), idx)), 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000000)
        }
    }

    /*
    * @dev Returns the n byte value at the specified index of self.
    * @param self The byte string.
    * @param idx The index into the bytes.
    * @param len The number of bytes.
    * @return The specified 32 bytes of the string.
    */
    function readBytesN(bytes memory self, uint idx, uint len) internal pure returns (bytes32 ret) {
        require(len <= 32);
        require(idx + len <= self.length);
        assembly {
            let mask := not(sub(exp(256, sub(32, len)), 1))
            ret := and(mload(add(add(self, 32), idx)),  mask)
        }
    }

    function memcpy(uint dest, uint src, uint len) private pure {
        // Copy word-length chunks while possible
        for (; len >= 32; len -= 32) {
            assembly {
                mstore(dest, mload(src))
            }
            dest += 32;
            src += 32;
        }

        // Copy remaining bytes
        uint mask = 256 ** (32 - len) - 1;
        assembly {
            let srcpart := and(mload(src), not(mask))
            let destpart := and(mload(dest), mask)
            mstore(dest, or(destpart, srcpart))
        }
    }

    /*
    * @dev Copies a substring into a new byte string.
    * @param self The byte string to copy from.
    * @param offset The offset to start copying at.
    * @param len The number of bytes to copy.
    */
    function substring(bytes memory self, uint offset, uint len) internal pure returns(bytes memory) {
        require(offset + len <= self.length);

        bytes memory ret = new bytes(len);
        uint dest;
        uint src;

        assembly {
            dest := add(ret, 32)
            src := add(add(self, 32), offset)
        }
        memcpy(dest, src, len);

        return ret;
    }

    // Maps characters from 0x30 to 0x7A to their base32 values.
    // 0xFF represents invalid characters in that range.
    bytes constant base32HexTable = hex'00010203040506070809FFFFFFFFFFFFFF0A0B0C0D0E0F101112131415161718191A1B1C1D1E1FFFFFFFFFFFFFFFFFFFFF0A0B0C0D0E0F101112131415161718191A1B1C1D1E1F';

    /**
     * @dev Decodes unpadded base32 data of up to one word in length.
     * @param self The data to decode.
     * @param off Offset into the string to start at.
     * @param len Number of characters to decode.
     * @return The decoded data, left aligned.
     */
    function base32HexDecodeWord(bytes memory self, uint off, uint len) internal pure returns(bytes32) {
        require(len <= 52);

        uint ret = 0;
        uint8 decoded;
        for(uint i = 0; i < len; i++) {
            bytes1 char = self[off + i];
            require(char >= 0x30 && char <= 0x7A);
            decoded = uint8(base32HexTable[uint(uint8(char)) - 0x30]);
            require(decoded <= 0x20);
            if(i == len - 1) {
                break;
            }
            ret = (ret << 5) | decoded;
        }

        uint bitlen = len * 5;
        if(len % 8 == 0) {
            // Multiple of 8 characters, no padding
            ret = (ret << 5) | decoded;
        } else if(len % 8 == 2) {
            // Two extra characters - 1 byte
            ret = (ret << 3) | (decoded >> 2);
            bitlen -= 2;
        } else if(len % 8 == 4) {
            // Four extra characters - 2 bytes
            ret = (ret << 1) | (decoded >> 4);
            bitlen -= 4;
        } else if(len % 8 == 5) {
            // Five extra characters - 3 bytes
            ret = (ret << 4) | (decoded >> 1);
            bitlen -= 1;
        } else if(len % 8 == 7) {
            // Seven extra characters - 4 bytes
            ret = (ret << 2) | (decoded >> 3);
            bitlen -= 3;
        } else {
            revert();
        }

        return bytes32(ret << (256 - bitlen));
    }
}
