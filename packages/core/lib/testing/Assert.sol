// This file taken from here: https://raw.githubusercontent.com/smartcontractproduction/sol-unit/master/contracts/src/Assertions.sol
// It was renamed to Assert.sol by Tim Coulter. Refactored for solidity 0.5.0 by Cruz Molina.

pragma solidity >= 0.4.15 < 0.6.0;

import "truffle/AssertString.sol";
import "truffle/AssertBytes32.sol";
import "truffle/AssertAddress.sol";
import "truffle/AssertBool.sol";
import "truffle/AssertUint.sol";
import "truffle/AssertInt.sol";
import "truffle/AssertUintArray.sol";
import "truffle/AssertIntArray.sol";
import "truffle/AssertAddressArray.sol";
// import "truffle/AssertAddressPayableArray.sol";
// ^would require an oldAssert.sol (0.4.0) & a newAssert.sol (0.5.0)
import "truffle/AssertBytes32Array.sol";
import "truffle/AssertBalance.sol";
import "truffle/AssertGeneral.sol";

/*
    File: Assertions.slb

    Author: Andreas Olofsson (androlo1980@gmail.com)

    Library: Assertions

    Assertions for unit testing contracts. Tests are run with the
    <solUnit at https://github.com/smartcontractproduction/sol-unit>
    unit-testing framework.

    (start code)
    contract ModAdder {

        function addMod(uint a, uint b, uint modulus) constant returns (uint sum) {
            if (modulus == 0)
                throw;
            return addmod(a, b, modulus);
        }

    }

    contract SomeTest {
        using Assertions for uint;

        function testAdd() {
            var adder = new ModAdder();
            adder.addMod(50, 66, 30).equal(26, "addition returned the wrong sum");
        }
    }
    (end)

    It is also possible to extend <Test>, to have all bindings (using) properly set up.

    (start code)

    contract SomeTest is Test {

        function testAdd() {
            var adder = new ModAdder();
            adder.addMod(50, 66, 30).equal(26, "addition returned the wrong sum");
        }
    }
    (end)
*/

library Assert {

    // ************************************** general **************************************

    /*
        Function: fail()

        Mark the test as failed.

        Params:
            message (string) - A message associated with the failure.

        Returns:
            result (bool) - false.
    */
    function fail(string memory message) internal returns (bool result) {
        return AssertGeneral.fail(message);
    }

    // ************************************** strings **************************************

    /*
        Function: equal(string)

        Assert that two strings are equal.

        : _stringsEqual(A, B) == true

        Params:
            A (string) - The first string.
            B (string) - The second string.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function equal(string memory a, string memory b, string memory message) internal returns (bool result) {
        return AssertString.equal(a, b, message);
    }

    /*
        Function: notEqual(string)

        Assert that two strings are not equal.

        : _stringsEqual(A, B) == false

        Params:
            A (string) - The first string.
            B (string) - The second string.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function notEqual(string memory a, string memory b, string memory message) internal returns (bool result) {
        return AssertString.notEqual(a, b, message);
    }

    /*
        Function: isEmpty(string)

        Assert that a string is empty.

        : _stringsEqual(str, STRING_NULL) == true

        Params:
            str (string) - The string.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isEmpty(string memory str, string memory message) internal returns (bool result) {
        return AssertString.isEmpty(str, message);
    }

    /*
        Function: isNotEmpty(string)

        Assert that a string is not empty.

        : _stringsEqual(str, STRING_NULL) == false

        Params:
            str (string) - The string.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isNotEmpty(string memory str, string memory message) internal returns (bool result) {
        return AssertString.isNotEmpty(str, message);
    }

    // ************************************** bytes32 **************************************

    /*
        Function: equal(bytes32)

        Assert that two 'bytes32' are equal.

        : A == B

        Params:
            A (bytes32) - The first 'bytes32'.
            B (bytes32) - The second 'bytes32'.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function equal(bytes32 a, bytes32 b, string memory message) internal returns (bool result) {
        return AssertBytes32.equal(a, b, message);
    }

    /*
        Function: notEqual(bytes32)

        Assert that two 'bytes32' are not equal.

        : A != B

        Params:
            A (bytes32) - The first 'bytes32'.
            B (bytes32) - The second 'bytes32'.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function notEqual(bytes32 a, bytes32 b, string memory message) internal returns (bool result) {
        return AssertBytes32.notEqual(a, b, message);
    }

    /*
        Function: isZero(bytes32)

        Assert that a 'bytes32' is zero.

        : bts == BYTES32_NULL

        Params:
            bts (bytes32) - The 'bytes32'.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isZero(bytes32 bts, string memory message) internal returns (bool result) {
        return AssertBytes32.isZero(bts, message);
    }

    /*
        Function: isNotZero(bytes32)

        Assert that a 'bytes32' is not zero.

        : bts != BYTES32_NULL

        Params:
            bts (bytes32) - The 'bytes32'.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isNotZero(bytes32 bts, string memory message) internal returns (bool result) {
        return AssertBytes32.isNotZero(bts, message);
    }

    // ************************************** address **************************************

    /*
        Function: equal(address)

        Assert that two addresses are equal.

        : A == B

        Params:
            A (address) - The first address.
            B (address) - The second address.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function equal(address a, address b, string memory message) internal returns (bool result) {
        return AssertAddress.equal(a, b, message);
    }
    /*
        Function: notEqual(address)

        Assert that two addresses are not equal.

        : A != B

        Params:
            A (address) - The first address.
            B (address) - The second address.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function notEqual(address a, address b, string memory message) internal returns (bool result) {
        return AssertAddress.notEqual(a, b, message);
    }

    /*
        Function: isZero(address)

        Assert that an address is zero.

        : addr == ADDRESS_NULL

        Params:
            addr (address) - The address.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isZero(address addr, string memory message) internal returns (bool result) {
        return AssertAddress.isZero(addr, message);
    }

    /*
        Function: isNotZero(address)

        Assert that an address is not zero.

        : addr != ADDRESS_NULL

        Params:
            addr (address) - The address.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isNotZero(address addr, string memory message) internal returns (bool result) {
        return AssertAddress.isNotZero(addr, message);

    }

    // ************************************** bool **************************************

    /*
        Function: isTrue

        Assert that a boolean is 'true'.

        : b == true

        Params:
            b (bool) - The boolean.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isTrue(bool b, string memory message) internal returns (bool result) {
        return AssertBool.isTrue(b, message);
    }

    /*
        Function: isFalse

        Assert that a boolean is 'false'.

        : b == false

        Params:
            b (bool) - The boolean.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isFalse(bool b, string memory message) internal returns (bool result) {
        return AssertBool.isFalse(b, message);
    }

    /*
        Function: equal(bool)

        Assert that two booleans are equal.

        : A == B

        Params:
            A (bool) - The first boolean.
            B (bool) - The second boolean.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function equal(bool a, bool b, string memory message) internal returns (bool result) {
        return AssertBool.equal(a, b, message);
    }

    /*
        Function: notEqual(bool)

        Assert that two booleans are not equal.

        : A != B

        Params:
            A (bool) - The first boolean.
            B (bool) - The second boolean.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function notEqual(bool a, bool b, string memory message) internal returns (bool result) {
        return AssertBool.notEqual(a, b, message);
    }

    // ************************************** uint **************************************

    /*
        Function: equal(uint)

        Assert that two (256 bit) unsigned integers are equal.

        : A == B

        Params:
            A (uint) - The first uint.
            B (uint) - The second uint.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function equal(uint a, uint b, string memory message) internal returns (bool result) {
        return AssertUint.equal(a, b, message);
    }

    /*
        Function: notEqual(uint)

        Assert that two (256 bit) unsigned integers are not equal.

        : A != B

        Params:
            A (uint) - The first uint.
            B (uint) - The second uint.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function notEqual(uint a, uint b, string memory message) internal returns (bool result) {
        return AssertUint.notEqual(a, b, message);
    }

    /*
        Function: isAbove(uint)

        Assert that the uint 'A' is greater than the uint 'B'.

        : A > B

        Params:
            A (uint) - The first uint.
            B (uint) - The second uint.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isAbove(uint a, uint b, string memory message) internal returns (bool result) {
        return AssertUint.isAbove(a, b, message);
    }

    /*
        Function: isAtLeast(uint)

        Assert that the uint 'A' is greater than or equal to the uint 'B'.

        : A >= B

        Params:
            A (uint) - The first uint.
            B (uint) - The second uint.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isAtLeast(uint a, uint b, string memory message) internal returns (bool result) {
        return AssertUint.isAtLeast(a, b, message);
    }

    /*
        Function: isBelow(uint)

        Assert that the uint 'A' is lesser than the uint 'B'.

        : A < B

        Params:
            A (uint) - The first uint.
            B (uint) - The second uint.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isBelow(uint a, uint b, string memory message) internal returns (bool result) {
        return AssertUint.isBelow(a, b, message);
    }

    /*
        Function: isAtMost(uint)

        Assert that the uint 'A' is lesser than or equal to the uint 'B'.

        : A <= B

        Params:
            A (uint) - The first uint.
            B (uint) - The second uint.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isAtMost(uint a, uint b, string memory message) internal returns (bool result) {
        return AssertUint.isAtMost(a, b, message);
    }

    /*
        Function: isZero(uint)

        Assert that a (256 bit) unsigned integer is 0.

        : number == 0

        Params:
            number (uint) - The uint.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isZero(uint number, string memory message) internal returns (bool result) {
        return AssertUint.isZero(number, message);
    }

    /*
        Function: isNotZero(uint)

        Assert that a (256 bit) unsigned integer is not 0.

        : number != 0

        Params:
            number (uint) - The uint.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isNotZero(uint number, string memory message) internal returns (bool result) {
        return AssertUint.isNotZero(number, message);
    }

    // ************************************** int **************************************

    /*
        Function: equal(int)

        Assert that two (256 bit) signed integers are equal.

        : A == B

        Params:
            A (int) - The first int.
            B (int) - The second int.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function equal(int a, int b, string memory message) internal returns (bool result) {
        return AssertInt.equal(a, b, message);
    }

    /*
        Function: notEqual(int)

        Assert that two (256 bit) signed integers are not equal.

        : A != B

        Params:
            A (int) - The first int.
            B (int) - The second int.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function notEqual(int a, int b, string memory message) internal returns (bool result) {
        return AssertInt.notEqual(a, b, message);
    }

    /*
        Function: isAbove(int)

        Assert that the int 'A' is greater than the int 'B'.

        : A > B

        Params:
            A (int) - The first int.
            B (int) - The second int.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isAbove(int a, int b, string memory message) internal returns (bool result) {
        return AssertInt.isAbove(a, b, message);
    }

    /*
        Function: isAtLeast(int)

        Assert that the int 'A' is greater than or equal to the int 'B'.

        : A >= B

        Params:
            A (int) - The first int.
            B (int) - The second int.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isAtLeast(int a, int b, string memory message) internal returns (bool result) {
        return AssertInt.isAtLeast(a, b, message);
    }

    /*
        Function: isBelow(int)

        Assert that the int 'A' is lesser than the int 'B'.

        : A < B

        Params:
            A (int) - The first int.
            B (int) - The second int.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isBelow(int a, int b, string memory message) internal returns (bool result) {
        return AssertInt.isBelow(a, b, message);
    }

    /*
        Function: isAtMost(int)

        Assert that the int 'A' is lesser than or equal to the int 'B'.

        : A <= B

        Params:
            A (int) - The first int.
            B (int) - The second int.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isAtMost(int a, int b, string memory message) internal returns (bool result) {
        return AssertInt.isAtMost(a, b, message);
    }

    /*
        Function: isZero(int)

        Assert that a (256 bit) signed integer is 0.

        : number == 0

        Params:
            number (int) - The int.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isZero(int number, string memory message) internal returns (bool result) {
        return AssertInt.isZero(number, message);
    }

    /*
        Function: isNotZero(int)

        Assert that a (256 bit) signed integer is not 0.

        : number != 0

        Params:
            number (int) - The int.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function isNotZero(int number, string memory message) internal returns (bool result) {
        return AssertInt.isNotZero(number, message);
    }

    // ************************************** uint[] **************************************

    /*
        Function: equal(uint[])

        Assert that two 'uint[ ]' are equal.

        : arrA.length == arrB.length

        and, for all valid indices 'i'

        : arrA[i] == arrB[i]

        Params:
            A (uint[]) - The first array.
            B (uint[]) - The second array.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function equal(uint[] memory arrA, uint[] memory arrB, string memory message) internal returns (bool result) {
        return AssertUintArray.equal(arrA, arrB, message);
    }

    /*
        Function: notEqual(uint[])

        Assert that two 'uint[]' are not equal.

        : arrA.length != arrB.length

        or, for some valid index 'i'

        : arrA[i] != arrB[i]

        Params:
            A (uint[]) - The first string.
            B (uint[]) - The second string.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function notEqual(uint[] memory arrA, uint[] memory arrB, string memory message) internal returns (bool result) {
        return AssertUintArray.notEqual(arrA, arrB, message);
    }

    /*
        Function: lengthEqual(uint[])

        Assert that the length of a 'uint[]' is equal to a given value.

        : arr.length == length

        Params:
            arr (uint[]) - The array.
            length (uint) - The length.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function lengthEqual(uint[] memory arr, uint length, string memory message) internal returns (bool result) {
        return AssertUintArray.lengthEqual(arr, length, message);
    }

    /*
        Function: lengthNotEqual(uint[])

        Assert that the length of a 'uint[]' is not equal to a given value.

        : arr.length != length

        Params:
            arr (uint[]) - The array.
            length (uint) - The length.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function lengthNotEqual(uint[] memory arr, uint length, string memory message) internal returns (bool result) {
        return AssertUintArray.lengthNotEqual(arr, length, message);
    }

    // ************************************** int[] **************************************

    /*
        Function: equal(int[])

        Assert that two 'int[]' are equal.

        : arrA.length == arrB.length

        and, for all valid indices 'i'

        : arrA[i] == arrB[i]

        Params:
            A (int[]) - The first array.
            B (int[]) - The second array.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function equal(int[] memory arrA, int[] memory arrB, string memory message) internal returns (bool result) {
        return AssertIntArray.equal(arrA, arrB, message);
    }

    /*
        Function: notEqual(int[])

        Assert that two 'int[]' are not equal.

        : arrA.length != arrB.length

        or, for some valid index 'i'

        : arrA[i] != arrB[i]

        Params:
            A (int[]) - The first string.
            B (int[]) - The second string.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function notEqual(int[] memory arrA, int[] memory arrB, string memory message) internal returns (bool result) {
        return AssertIntArray.notEqual(arrA, arrB, message);
    }

    /*
        Function: lengthEqual(int[])

        Assert that the length of an 'int[]' is equal to a given value.

        : arr.length == length

        Params:
            arr (int[]) - The array.
            length (uint) - The length.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function lengthEqual(int[] memory arr, uint length, string memory message) internal returns (bool result) {
        return AssertIntArray.lengthEqual(arr, length, message);
    }

    /*
        Function: lengthNotEqual(int[])

        Assert that the length of an 'int[]' is not equal to a given value.

        : arr.length != length

        Params:
            arr (int[]) - The array.
            length (uint) - The length.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function lengthNotEqual(int[] memory arr, uint length, string memory message) internal returns (bool result) {
        return AssertIntArray.lengthNotEqual(arr, length, message);
    }

    // ************************************** address[] **************************************

    /*
        Function: equal(address[])

        Assert that two 'address[]' are equal.

        : arrA.length == arrB.length

        and, for all valid indices 'i'

        : arrA[i] == arrB[i]

        Params:
            A (address[]) - The first array.
            B (address[]) - The second array.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function equal(address[] memory arrA, address[] memory arrB, string memory message) internal returns (bool result) {
        return AssertAddressArray.equal(arrA, arrB, message);
    }

    /*
        Function: notEqual(address[])

        Assert that two 'address[]' are not equal.

        : arrA.length != arrB.length

        or, for some valid index 'i'

        : arrA[i] != arrB[i]

        Params:
            A (address[]) - The first string.
            B (address[]) - The second string.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function notEqual(address[] memory arrA, address[] memory arrB, string memory message) internal returns (bool result) {
        return AssertAddressArray.notEqual(arrA, arrB, message);
    }

    /*
        Function: lengthEqual(address[])

        Assert that the length of an 'address[]' is equal to a given value.

        : arr.length == length

        Params:
            arr (address[]) - The array.
            length (uint) - The length.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function lengthEqual(address[] memory arr, uint length, string memory message) internal returns (bool result) {
        return AssertAddressArray.lengthEqual(arr, length, message);
    }

    /*
        Function: lengthNotEqual(address[])

        Assert that the length of an 'address[]' is not equal to a given value.

        : arr.length != length

        Params:
            arr (address[]) - The array.
            length (uint) - The length.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function lengthNotEqual(address[] memory arr, uint length, string memory message) internal returns (bool result) {
        return AssertAddressArray.lengthNotEqual(arr, length, message);
    }

    // ************************************** address payable[] **************************************

    /*
        Function: equal(address payable[])

        Assert that two 'address payable[]' are equal.

        : arrA.length == arrB.length

        and, for all valid indices 'i'

        : arrA[i] == arrB[i]

        Params:
            A (address payable[]) - The first array.
            B (address payable[]) - The second array.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
//    function equal(address payable[] memory arrA, address payable[] memory arrB, string memory message) internal returns (bool result) {
//        return AssertAddressPayableArray.equal(arrA, arrB, message);
//    }

    /*
        Function: notEqual(address payable[])

        Assert that two 'address payable[]' are not equal.

        : arrA.length != arrB.length

        or, for some valid index 'i'

        : arrA[i] != arrB[i]

        Params:
            A (address payable[]) - The first string.
            B (address payable[]) - The second string.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
//    function notEqual(address payable[] memory arrA, address payable[] memory arrB, string memory message) internal returns (bool result) {
//        return AssertAddressPayableArray.notEqual(arrA, arrB, message);
//    }

    /*
        Function: lengthEqual(address payable[])

        Assert that the length of an 'address payable[]' is equal to a given value.

        : arr.length == length

        Params:
            arr (address payable[]) - The array.
            length (uint) - The length.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
//    function lengthEqual(address payable[] memory arr, uint length, string memory message) internal returns (bool result) {
//        return AssertAddressPayableArray.lengthEqual(arr, length, message);
//    }

    /*
        Function: lengthNotEqual(address payable[])

        Assert that the length of an 'address payable[]' is not equal to a given value.

        : arr.length != length

        Params:
            arr (address payable[]) - The array.
            length (uint) - The length.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
//    function lengthNotEqual(address payable[] memory arr, uint length, string memory message) internal returns (bool result) {
//        return AssertAddressPayableArray.lengthNotEqual(arr, length, message);
//    }

    // ************************************** bytes32[] **************************************

    /*
        Function: equal(bytes32[])

        Assert that two 'bytes32[]' are equal.

        : arrA.length == arrB.length

        and, for all valid indices 'i'

        : arrA[i] == arrB[i]

        Params:
            A (bytes32[]) - The first array.
            B (bytes32[]) - The second array.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function equal(bytes32[] memory arrA, bytes32[] memory arrB, string memory message) internal returns (bool result) {
        return AssertBytes32Array.equal(arrA, arrB, message);
    }

    /*
        Function: notEqual(bytes32[])

        Assert that two 'bytes32[]' are not equal.

        : arrA.length != arrB.length

        or, for some valid index 'i'

        : arrA[i] != arrB[i]

        Params:
            A (bytes32[]) - The first string.
            B (bytes32[]) - The second string.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function notEqual(bytes32[] memory arrA, bytes32[] memory arrB, string memory message) internal returns (bool result) {
        return AssertBytes32Array.notEqual(arrA, arrB, message);
    }

    /*
        Function: lengthEqual(bytes32[])

        Assert that the length of an 'bytes32[]' is equal to a given value.

        : arr.length == length

        Params:
            arr (bytes32[]) - The array.
            length (uint) - The length.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function lengthEqual(bytes32[] memory arr, uint length, string memory message) internal returns (bool result) {
        return AssertBytes32Array.lengthEqual(arr, length, message);
    }

    /*
        Function: lengthNotEqual(bytes32[])

        Assert that the length of an 'bytes32[]' is not equal to a given value.

        : arr.length != length

        Params:
            arr (bytes32[]) - The array.
            length (uint) - The length.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function lengthNotEqual(bytes32[] memory arr, uint length, string memory message) internal returns (bool result) {
        return AssertBytes32Array.lengthNotEqual(arr, length, message);
    }

    // ************************************** balances **************************************

    /*
        Function: balanceEqual

        Assert that the balance of an account 'A' is equal to a given number 'b'.

        : A.balance = b

        Params:
            A (address) - The first address.
            b (uint) - The balance.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function balanceEqual(address a, uint b, string memory message) internal returns (bool result) {
        return AssertBalance.balanceEqual(a, b, message);
    }

    /*
        Function: balanceNotEqual

        Assert that the balance of an account 'A' is not equal to a given number 'b'.

        : A.balance != b

        Params:
            A (address) - The first address.
            b (uint) - The balance.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function balanceNotEqual(address a, uint b, string memory message) internal returns (bool result) {
        return AssertBalance.balanceNotEqual(a, b, message);
    }

    /*
        Function: balanceIsZero

        Assert that the balance of an account 'A' is zero.

        : A.balance == 0

        Params:
            A (address) - The first address.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function balanceIsZero(address a, string memory message) internal returns (bool result) {
        return AssertBalance.balanceIsZero(a, message);
    }

    /*
        Function: balanceIsNotZero

        Assert that the balance of an account 'A' is not zero.

        : A.balance != 0

        Params:
            A (address) - The first address.
            message (string) - A message that is sent if the assertion fails.

        Returns:
            result (bool) - The result.
    */
    function balanceIsNotZero(address a, string memory message) internal returns (bool result) {
        return AssertBalance.balanceIsNotZero(a, message);
    }
}
