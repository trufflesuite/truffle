pragma solidity >= 0.4.15 < 0.6.0;

library AssertAddress {

    // Constant: ADDRESS_NULL
    // The null address: 0
    address constant ADDRESS_NULL = 0x0000000000000000000000000000000000000000;

    /*
        Event: TestEvent

        Fired when an assertion is made.

        Params:
            result (bool) - Whether or not the assertion holds.
            message (string) - A message to display if the assertion does not hold.
    */
    event TestEvent(bool indexed result, string message);

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
    function equal(address a, address b, string memory message) public returns (bool result) {
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
    function notEqual(address a, address b, string memory message) public returns (bool result) {
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
    function isZero(address addr, string memory message) public returns (bool result) {
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
    function isNotZero(address addr, string memory message) public returns (bool result) {
        result = (addr != ADDRESS_NULL);
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
    function _report(bool result, string memory message) internal {
        if(result)
            emit TestEvent(true, "");
        else
            emit TestEvent(false, message);
    }
}
