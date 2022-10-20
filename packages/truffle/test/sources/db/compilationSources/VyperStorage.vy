stored_data: uint256

@public
def set(new_value : uint256):
    self.stored_data = new_value

@public
@constant
def get() -> uint256:
    return self.stored_data
