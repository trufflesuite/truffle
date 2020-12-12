import Imported as Test

@external
def vyper_action(e: address):
    Test(e).test()
