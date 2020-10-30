pragma solidity >0.4.15;

import "./Dependency.sol";
import "./path/to/AnotherDep.sol";
import "../../../path/to/AnotherDep.sol";
import "ethpmpackage/Contract.sol";
import { Something as MyGarbage } from "./somePath.sol";
import"./someImportWithNoSpace.sol";
import {
    Something as RelativeMultilineImport
} from "../../someRelativeMultilineImport.sol";
import {
    Something as AbsoluteMultilineImport
} from "someAbsoluteMultilineImport.sol";


contract MyContract {

}

library SomeLibrary {

}

interface SomeInterface {

}
