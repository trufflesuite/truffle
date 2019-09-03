pragma solidity >= 0.4.15 < 0.6.0;

library AssertBool {

    /*
        Event: TestEvent

        Fired when an assertion is made.

        Params:
            result (bool) - Whether or not the assertion holds.
            message (string) - A message to display if the assertion does not hold.
    */
    event TestEvent(bool indexed result, string message);

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
    function isTrue(bool b, string memory message) public returns (bool result) {
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
    function isFalse(bool b, string memory message) public returns (bool result) {
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
    function equal(bool a, bool b, string memory message) public returns (bool result) {
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
    function notEqual(bool a, bool b, string memory message) public returns (bool result) {
        result = (a != b);
        if (result)
            _report(result, message);
        else
            _report(result, _appendTagged(_tag(a, "Tested"), _tag(b, "Against"), message));
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
        Function: _ltoa

        Convert an boolean to a string.

        Params:
            val (bool) - The boolean.

        Returns:
            result (string) - "true" if true, "false" if false.
    */
    function _ltoa(bool val) internal pure returns (string memory) {
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
        Function: _tag(bool)

        Add a tag to a boolean.

        Params:
            value (bool) - The value.
            tag (string) - The tag.

        Returns:
            result (string) - "tag: _ltoa(value)"
    */
    function _tag(bool value, string memory tag) internal pure returns (string memory) {
        string memory nstr = _ltoa(value);
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
