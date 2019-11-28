pragma solidity >= 0.4.15 < 0.6.0;

library AssertBalance {

    /*
        Event: TestEvent

        Fired when an assertion is made.

        Params:
            result (bool) - Whether or not the assertion holds.
            message (string) - A message to display if the assertion does not hold.
    */
    event TestEvent(bool indexed result, string message);

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
    function balanceEqual(address a, uint b, string memory message) public returns (bool result) {
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
    function balanceNotEqual(address a, uint b, string memory message) public returns (bool result) {
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
    function balanceIsZero(address a, string memory message) public returns (bool result) {
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
    function balanceIsNotZero(address a, string memory message) public returns (bool result) {
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
    function _report(bool result, string memory message) internal {
        if(result)
            emit TestEvent(true, "");
        else
            emit TestEvent(false, message);
    }

}
