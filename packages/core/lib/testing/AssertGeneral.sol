//SPDX-License-Identifier: MIT
pragma solidity >= 0.4.15 < 0.7.0;

library AssertGeneral {

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
    function fail(string memory message) public returns (bool result) {
        _report(false, message);
        return false;
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
