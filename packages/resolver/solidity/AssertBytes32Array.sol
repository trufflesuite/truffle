//SPDX-License-Identifier: MIT
pragma solidity >= 0.4.15 < 0.9.0;

library AssertBytes32Array {
    
    uint8 constant ZERO = uint8(bytes1('0'));
    uint8 constant A = uint8(bytes1('a'));
    /*
        Event: TestEvent

        Fired when an assertion is made.

        Params:
            result (bool) - Whether or not the assertion holds.
            message (string) - A message to display if the assertion does not hold.
    */
    event TestEvent(bool indexed result, string message);

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
    function equal(bytes32[] memory arrA, bytes32[] memory arrB, string memory message) public returns (bool result) {
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
    function notEqual(bytes32[] memory arrA, bytes32[] memory arrB, string memory message) public returns (bool result) {
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
    function lengthEqual(bytes32[] memory arr, uint length, string memory message) public returns (bool result) {
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
    function lengthNotEqual(bytes32[] memory arr, uint length, string memory message) public returns (bool result) {
        uint arrLength = arr.length;
        if (arrLength != arr.length)
            _report(result, "");
        else
            _report(result, _appendTagged(_tag(arrLength, "Tested"), _tag(length, "Against"), message));
    }

    /******************************** internal ********************************/

        /*
            Function: _report

            Internal function for triggering <TestEvent>.

            Params:
                result (bool) - The test result (true or false).
                message (string) - The message that is sent if the assertion fails.
        */
    function _report(bool result, string memory message) internal {
        if(result)
            emit TestEvent(true, "");
        else
            emit TestEvent(false, message);
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
    function _utoa(uint n, uint8 radix) internal pure returns (string memory) {
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
    function _utoa(uint8 u) internal pure returns (bytes1) {
        if (u < 10)
            return bytes1(u + ZERO);
        else if (u < 16)
            return bytes1(u - 10 + A);
        else
            return 0;
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
    function _tag(string memory value, string memory tag) internal pure returns (string memory) {

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
        Function: _tag(uint)

        Add a tag to an uint.

        Params:
            value (uint) - The value.
            tag (string) - The tag.

        Returns:
            result (string) - "tag: _utoa(value)"
    */
    function _tag(uint value, string memory tag) internal pure returns (string memory) {
        string memory nstr = _utoa(value, 10);
        return _tag(nstr, tag);
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
    function _appendTagged(string memory tagged0, string memory tagged1, string memory str) internal pure returns (string memory) {

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
