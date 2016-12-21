
import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Example.sol";

contract TestExample {

  Example example = Example(DeployedAddresses.Example());

  function testExampleWasDeployed() {
    Assert.isNotZero(example, "Example should have been successfully deployed.");
  }
}
