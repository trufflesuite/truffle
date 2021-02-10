from . import Branch
from . import LeafC
from . import Abi
from vyper.interfaces import ERC20

root: uint256

@external
def addToRoot(a: uint256, b: uint256) -> uint256:
    return a + b
