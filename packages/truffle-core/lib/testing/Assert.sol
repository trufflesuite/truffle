// This file taken from here: https://raw.githubusercontent.com/smartcontractproduction/sol-unit/master/contracts/src/Assertions.sol
// It was renamed to Assert.sol by Tim Coulter.

pragma solidity ^0.4.17;

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

    // Constant: ADDRESS_NULL
    // The null address: 0
    address constant ADDRESS_NULL = 0x0000000000000000000000000000000000000000;
    // Constant: BYTES32_NULL
    // The null bytes32: 0
    bytes32 constant BYTES32_NULL = 0x0;
    // Constant: STRING_NULL
    // The null string: ""
    string constant STRING_NULL = "";

    uint8 constant ZERO = uint8(byte('0'));
    uint8 constant A = uint8(byte('a'));

    byte constant MINUS = byte('-');

    /*
        Event: TestEvent

        Fired when an assertion is made.

        Params:
            result (bool) - Whether or not the assertion holds.
            message (string) - A message to display if the assertion does not hold.
    */
    event TestEvent(bool indexed result, string message);

    // ************************************** general **************************************

    /*
        Function: fail()

        Mark the test as failed.

        Params:
            message (string) - A message associated with the failure.

        Returns:
            result (bool) - false.
    */
    function fail(string message) public returns (bool result) {
        _report(false, message);
        return false;
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
    function equal(string a, string b, string message) public returns (bool result) {
        result = _stringsEqual(a, b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function notEqual(string a, string b, string message) public returns (bool result) {
        result = !_stringsEqual(a, b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function isEmpty(string str, string message) public returns (bool result) {
        result = _stringsEqual(str, STRING_NULL);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(str, "Tested"), message));
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
    function isNotEmpty(string str, string message) public returns (bool result) {
        result = !_stringsEqual(str, STRING_NULL);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(str, "Tested"), message));
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
    function equal(bytes32 a, bytes32 b, string message) public returns (bool result) {
        result = (a == b);
        _report(result, message);
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
    function notEqual(bytes32 a, bytes32 b, string message) public returns (bool result) {
        result = (a != b);
        _report(result, message);
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
    function isZero(bytes32 bts, string message) public returns (bool result) {
        result = (bts == BYTES32_NULL);
        _report(result, message);
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
    function isNotZero(bytes32 bts, string message) public returns (bool result) {
        result = (bts != BYTES32_NULL);
        _report(result, message);
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
    function equal(address a, address b, string message) public returns (bool result) {
        result = (a == b);
        _report(result, message);
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
    function notEqual(address a, address b, string message) public returns (bool result) {
        result = (a != b);
         _report(result, message);
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
    function isZero(address addr, string message) public returns (bool result) {
        result = (addr == ADDRESS_NULL);
        _report(result, message);
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
    function isNotZero(address addr, string message) public returns (bool result) {
        result = (addr != ADDRESS_NULL);
        _report(result, message);
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
    function isTrue(bool b, string message) public returns (bool result) {
        result = b;
        _report(result, message);
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
    function isFalse(bool b, string message) public returns (bool result) {
        result = !b;
        _report(result, message);
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
    function equal(bool a, bool b, string message) public returns (bool result) {
        result = (a == b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function notEqual(bool a, bool b, string message) public returns (bool result) {
        result = (a != b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function equal(uint a, uint b, string message) public returns (bool result) {
        result = (a == b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function notEqual(uint a, uint b, string message) public returns (bool result) {
        result = (a != b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function isAbove(uint a, uint b, string message) public returns (bool result) {
        result = (a > b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function isAtLeast(uint a, uint b, string message) public returns (bool result) {
        result = (a >= b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function isBelow(uint a, uint b, string message) public returns (bool result) {
        result = (a < b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function isAtMost(uint a, uint b, string message) public returns (bool result) {
        result = (a <= b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function isZero(uint number, string message) public returns (bool result) {
        result = (number == 0);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(number, "Tested"), message));
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
    function isNotZero(uint number, string message) public returns (bool result) {
        result = (number != 0);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(number, "Tested"), message));
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
    function equal(int a, int b, string message) public returns (bool result) {
        result = (a == b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function notEqual(int a, int b, string message) public returns (bool result) {
        result = (a != b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function isAbove(int a, int b, string message) public returns (bool result) {
        result = (a > b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function isAtLeast(int a, int b, string message) public returns (bool result) {
        result = (a >= b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function isBelow(int a, int b, string message) public returns (bool result) {
        result = (a < b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function isAtMost(int a, int b, string message) public returns (bool result) {
        result = (a <= b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
    function isZero(int number, string message) public returns (bool result) {
        result = (number == 0);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(number, "Tested"), message));
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
    function isNotZero(int number, string message) public returns (bool result) {
        result = (number != 0);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(number, "Tested"), message));
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
    function equal(uint[] arrA, uint[] arrB, string message) public returns (bool result) {
        result = arrA.length == arrB.length;
        if (result) {
            for (uint i = 0; i < arrA.length; i++) {
                if (arrA[i] != arrB[i]) {
                    result = false;
                    break;
                }
            }
        }
        _report(result, message);
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
    function notEqual(uint[] arrA, uint[] arrB, string message) public returns (bool result) {
        result = arrA.length == arrB.length;
        if (result) {
            for (uint i = 0; i < arrA.length; i++) {
                if (arrA[i] != arrB[i]) {
                    result = false;
                    break;
                }
            }
        }
        result = !result;
        _report(result, message);
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
    function lengthEqual(uint[] arr, uint length, string message) public returns (bool result) {
        uint arrLength = arr.length;
        if (arrLength == length)
            _report(result, "");
        else
            _report(result, _appendTagged(_tag(arrLength, "Tested"), _tag(length, "Against"), message));
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
    function lengthNotEqual(uint[] arr, uint length, string message) public returns (bool result) {
        uint arrLength = arr.length;
        if (arrLength != arr.length)
            _report(result, "");
        else
            _report(result, _appendTagged(_tag(arrLength, "Tested"), _tag(length, "Against"), message));
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
    function equal(int[] arrA, int[] arrB, string message) public returns (bool result) {
        result = arrA.length == arrB.length;
        if (result) {
            for (uint i = 0; i < arrA.length; i++) {
                if (arrA[i] != arrB[i]) {
                    result = false;
                    break;
                }
            }
        }
        _report(result, message);
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
    function notEqual(int[] arrA, int[] arrB, string message) public returns (bool result) {
        result = arrA.length == arrB.length;
        if (result) {
            for (uint i = 0; i < arrA.length; i++) {
                if (arrA[i] != arrB[i]) {
                    result = false;
                    break;
                }
            }
        }
        result = !result;
        _report(result, message);
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
    function lengthEqual(int[] arr, uint length, string message) public returns (bool result) {
        uint arrLength = arr.length;
        if (arrLength == length)
            _report(result, "");
        else
            _report(result, _appendTagged(_tag(arrLength, "Tested"), _tag(length, "Against"), message));
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
    function lengthNotEqual(int[] arr, uint length, string message) public returns (bool result) {
        uint arrLength = arr.length;
        if (arrLength != arr.length)
            _report(result, "");
        else
            _report(result, _appendTagged(_tag(arrLength, "Tested"), _tag(length, "Against"), message));
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
    function equal(address[] arrA, address[] arrB, string message) public returns (bool result) {
        result = arrA.length == arrB.length;
        if (result) {
            for (uint i = 0; i < arrA.length; i++) {
                if (arrA[i] != arrB[i]) {
                    result = false;
                    break;
                }
            }
        }
        _report(result, message);
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
    function notEqual(address[] arrA, address[] arrB, string message) public returns (bool result) {
        result = arrA.length == arrB.length;
        if (result) {
            for (uint i = 0; i < arrA.length; i++) {
                if (arrA[i] != arrB[i]) {
                    result = false;
                    break;
                }
            }
        }
        result = !result;
        _report(result, message);
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
    function lengthEqual(address[] arr, uint length, string message) public returns (bool result) {
        uint arrLength = arr.length;
        if (arrLength == length)
            _report(result, "");
        else
            _report(result, _appendTagged(_tag(arrLength, "Tested"), _tag(length, "Against"), message));
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
    function lengthNotEqual(address[] arr, uint length, string message) public returns (bool result) {
        uint arrLength = arr.length;
        if (arrLength != arr.length)
            _report(result, "");
        else
            _report(result, _appendTagged(_tag(arrLength, "Tested"), _tag(length, "Against"), message));
    }

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
    function equal(bytes32[] arrA, bytes32[] arrB, string message) public returns (bool result) {
        result = arrA.length == arrB.length;
        if (result) {
            for (uint i = 0; i < arrA.length; i++) {
                if (arrA[i] != arrB[i]) {
                    result = false;
                    break;
                }
            }
        }
        _report(result, message);
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
    function notEqual(bytes32[] arrA, bytes32[] arrB, string message) public returns (bool result) {
        result = arrA.length == arrB.length;
        if (result) {
            for (uint i = 0; i < arrA.length; i++) {
                if (arrA[i] != arrB[i]) {
                    result = false;
                    break;
                }
            }
        }
        result = !result;
        _report(result, message);
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
    function lengthEqual(bytes32[] arr, uint length, string message) public returns (bool result) {
        uint arrLength = arr.length;
        if (arrLength == length)
            _report(result, "");
        else
            _report(result, _appendTagged(_tag(arrLength, "Tested"), _tag(length, "Against"), message));
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
    function lengthNotEqual(bytes32[] arr, uint length, string message) public returns (bool result) {
        uint arrLength = arr.length;
        if (arrLength != arr.length)
            _report(result, "");
        else
            _report(result, _appendTagged(_tag(arrLength, "Tested"), _tag(length, "Against"), message));
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
    function balanceEqual(address a, uint b, string message) public returns (bool result) {
        result = (a.balance == b);
        _report(result, message);
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
    function balanceNotEqual(address a, uint b, string message) public returns (bool result) {
        result = (a.balance != b);
        _report(result, message);
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
    function balanceIsZero(address a, string message) public returns (bool result) {
        result = (a.balance == 0);
        _report(result, message);
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
    function balanceIsNotZero(address a, string message) public returns (bool result) {
        result = (a.balance != 0);
        _report(result, message);
    }

    /******************************** internal ********************************/

        /*
            Function: _report

            Internal function for triggering <TestEvent>.

            Params:
                result (bool) - The test result (true or false).
                message (string) - The message that is sent if the assertion fails.
        */
    function _report(bool result, string message) internal {
        if(result)
            emit TestEvent(true, "");
        else
            emit TestEvent(false, message);
    }

    /*
        Function: _stringsEqual

        Compares two strings. Taken from the StringUtils contract in the Ethereum Dapp-bin
        (https://github.com/ethereum/dapp-bin/blob/master/library/stringUtils.sol).

        Params:
            a (string) - The first string.
            b (string) - The second string.

        Returns:
             result (bool) - 'true' if the strings are equal, otherwise 'false'.
    */
    function _stringsEqual(string a, string b) internal pure returns (bool result) {
        bytes memory ba = bytes(a);
        bytes memory bb = bytes(b);

        if (ba.length != bb.length)
            return false;
        for (uint i = 0; i < ba.length; i ++) {
            if (ba[i] != bb[i])
                return false;
        }
        return true;
    }

    /*
        Function: _itoa

        Convert a signed integer to a string. Negative numbers gets a '-' in front, e.g. "-54".

        Params:
            n (int) - The integer.
            radix (uint8) - A number between 2 and 16 (inclusive). Characters used are 0-9,a-f

        Returns:
            result (string) - The resulting string.
    */
    function _itoa(int n, uint8 radix) internal pure returns (string) {
        if (n == 0 || radix < 2 || radix > 16)
            return '0';
        bytes memory bts = new bytes(256);
        uint i;
        bool neg = false;
        if (n < 0) {
            n = -n;
            neg = true;
        }
        while (n > 0) {
            bts[i++] = _utoa(uint8(n % radix)); // Turn it to ascii.
            n /= radix;
        }
        // Reverse
        uint size = i;
        uint j = 0;
        bytes memory rev;
        if (neg) {
            size++;
            j = 1;
            rev = new bytes(size);
            rev[0] = MINUS;
        }
        else
            rev = new bytes(size);

        for (; j < size; j++)
            rev[j] = bts[size - j - 1];
        return string(rev);
    }

    /*
        Function: _utoa(uint)

        Convert an  unsigned integer to a string.

        Params:
            n (uint) - The unsigned integer.
            radix (uint8) - A number between 2 and 16 (inclusive). Characters used are 0-9,a-f

        Returns:
            result (string) - The resulting string.
    */
    function _utoa(uint n, uint8 radix) internal pure returns (string) {
        if (n == 0 || radix < 2 || radix > 16)
            return '0';
        bytes memory bts = new bytes(256);
        uint i;
        while (n > 0) {
            bts[i++] = _utoa(uint8(n % radix)); // Turn it to ascii.
            n /= radix;
        }
        // Reverse
        bytes memory rev = new bytes(i);
        for (uint j = 0; j < i; j++)
            rev[j] = bts[i - j - 1];
        return string(rev);
    }

    /*
        Function: _utoa(uint8)

        Convert an unsigned 8-bit integer to its ASCII byte representation. Numbers 0-9 are converted to '0'-'9',
        numbers 10-16 to 'a'-'f'. Numbers larger then 16 return the null byte.

        Params:
            u (uint8) - The unsigned 8-bit integer.

        Returns:
            result (string) - The ASCII byte.
    */
    function _utoa(uint8 u) internal pure returns (byte) {
        if (u < 10)
            return byte(u + ZERO);
        else if (u < 16)
            return byte(u - 10 + A);
        else
            return 0;
    }

    /*
        Function: _ltoa

        Convert an boolean to a string.

        Params:
            val (bool) - The boolean.

        Returns:
            result (string) - "true" if true, "false" if false.
    */
    function _ltoa(bool val) internal pure returns (string) {
        bytes memory b;
        if (val) {
            b = new bytes(4);
            b[0] = 't';
            b[1] = 'r';
            b[2] = 'u';
            b[3] = 'e';
            return string(b);
        }
        else {
            b = new bytes(5);
            b[0] = 'f';
            b[1] = 'a';
            b[2] = 'l';
            b[3] = 's';
            b[4] = 'e';
            return string(b);
        }
    }

    /*
    function htoa(address addr) constant returns (string) {
        bytes memory bts = new bytes(40);
        bytes20 addrBts = bytes20(addr);
        for (uint i = 0; i < 20; i++) {
            bts[2*i] = addrBts[i] % 16;
            bts[2*i + 1] = (addrBts[i] / 16) % 16;
        }
        return string(bts);
    }
    */

    /*
        Function: _tag(string)

        Add a tag to a string. The 'value' and 'tag' strings are returned on the form "tag: value".

        Params:
            value (string) - The value.
            tag (string) - The tag.

        Returns:
            result (string) - "tag: value"
    */
    function _tag(string value, string tag) internal pure returns (string) {

        bytes memory valueB = bytes(value);
        bytes memory tagB = bytes(tag);

        uint vl = valueB.length;
        uint tl = tagB.length;

        bytes memory newB = new bytes(vl + tl + 2);

        uint i;
        uint j;

        for (i = 0; i < tl; i++)
            newB[j++] = tagB[i];
        newB[j++] = ':';
        newB[j++] = ' ';
        for (i = 0; i < vl; i++)
            newB[j++] = valueB[i];

        return string(newB);
    }

    /*
        Function: _tag(int)

        Add a tag to an int.

        Params:
            value (int) - The value.
            tag (string) - The tag.

        Returns:
            result (string) - "tag: _itoa(value)"
    */
    function _tag(int value, string tag) internal pure returns (string) {
        string memory nstr = _itoa(value, 10);
        return _tag(nstr, tag);
    }

    /*
        Function: _tag(uint)

        Add a tag to an uint.

        Params:
            value (uint) - The value.
            tag (string) - The tag.

        Returns:
            result (string) - "tag: _utoa(value)"
    */
    function _tag(uint value, string tag) internal pure returns (string) {
        string memory nstr = _utoa(value, 10);
        return _tag(nstr, tag);
    }

    /*
        Function: _tag(bool)

        Add a tag to a boolean.

        Params:
            value (bool) - The value.
            tag (string) - The tag.

        Returns:
            result (string) - "tag: _ltoa(value)"
    */
    function _tag(bool value, string tag) internal pure returns (string) {
        string memory nstr = _ltoa(value);
        return _tag(nstr, tag);
    }

    /*
        Function: _appendTagged(string)

        Append a tagged value to a string.

        Params:
            tagged (string) - The tagged value.
            str (string) - The string.

        Returns:
            result (string) - "str (tagged)"
    */
    function _appendTagged(string tagged, string str) internal pure returns (string) {

        bytes memory taggedB = bytes(tagged);
        bytes memory strB = bytes(str);

        uint sl = strB.length;
        uint tl = taggedB.length;

        bytes memory newB = new bytes(sl + tl + 3);

        uint i;
        uint j;

        for (i = 0; i < sl; i++)
            newB[j++] = strB[i];
        newB[j++] = ' ';
        newB[j++] = '(';
        for (i = 0; i < tl; i++)
            newB[j++] = taggedB[i];
        newB[j++] = ')';

        return string(newB);
    }

    /*
        Function: _appendTagged(string, string)

        Append two tagged values to a string.

        Params:
            tagged0 (string) - The first tagged value.
            tagged1 (string) - The second tagged value.
            str (string) - The string.

        Returns:
            result (string) - "str (tagged0, tagged1)"
    */
    function _appendTagged(string tagged0, string tagged1, string str) internal pure returns (string) {

        bytes memory tagged0B = bytes(tagged0);
        bytes memory tagged1B = bytes(tagged1);
        bytes memory strB = bytes(str);

        uint sl = strB.length;
        uint t0l = tagged0B.length;
        uint t1l = tagged1B.length;

        bytes memory newB = new bytes(sl + t0l + t1l + 5);

        uint i;
        uint j;

        for (i = 0; i < sl; i++)
            newB[j++] = strB[i];
        newB[j++] = ' ';
        newB[j++] = '(';
        for (i = 0; i < t0l; i++)
            newB[j++] = tagged0B[i];
        newB[j++] = ',';
        newB[j++] = ' ';
        for (i = 0; i < t1l; i++)
            newB[j++] = tagged1B[i];
        newB[j++] = ')';

        return string(newB);
    }

}
