//SPDX-License-Identifier: MIT
pragma solidity >= 0.4.15 < 0.7.0;

library AssertString {

    // Constant: STRING_NULL
    // The null string: ""
    string constant STRING_NULL = "";
    
    /*
        Event: TestEvent

        Fired when an assertion is made.

        Params:
            result (bool) - Whether or not the assertion holds.
            message (string) - A message to display if the assertion does not hold.
    */
    event TestEvent(bool indexed result, string message);

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
    function equal(string memory a, string memory b, string memory message) public returns (bool result) {
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
    function notEqual(string memory a, string memory b, string memory message) public returns (bool result) {
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
    function isEmpty(string memory str, string memory message) public returns (bool result) {
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
    function isNotEmpty(string memory str, string memory message) public returns (bool result) {
        result = !_stringsEqual(str, STRING_NULL);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(str, "Tested"), message));
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
        Function: _stringsEqual

        Compares two strings. Taken from the StringUtils contract in the Ethereum Dapp-bin
        (https://github.com/ethereum/dapp-bin/blob/master/library/stringUtils.sol).

        Params:
            a (string) - The first string.
            b (string) - The second string.

        Returns:
             result (bool) - 'true' if the strings are equal, otherwise 'false'.
    */
    function _stringsEqual(string memory a, string memory b) internal pure returns (bool result) {
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
        Function: _appendTagged(string)

        Append a tagged value to a string.

        Params:
            tagged (string) - The tagged value.
            str (string) - The string.

        Returns:
            result (string) - "str (tagged)"
    */
    function _appendTagged(string memory tagged, string memory str) internal pure returns (string memory) {

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
