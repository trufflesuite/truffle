pragma solidity >=0.4.21 <0.6.0;

contract ComplexStorage {
    uint public storeduint1 = 15;
    uint public constant constuint = 16;
    uint128 public investmentsLimit = 17055;
    uint32 public investmentsDeadlineTimeStamp = uint32(now);

    bytes16 public string1 = "test1";
    bytes32 public string2 = "test1236";
    string public string3 = "lets string something";

    mapping (address => uint) uints1;
    mapping (address => DeviceData) structs1;

    uint[] public uintarray;
    DeviceData[] public deviceDataArray;
    DeviceData public singleDD;

    struct DeviceData {
        string deviceBrand;
        string deviceYear;
        string batteryWearLevel;
    }

    constructor() public {
        address address1 = 0xbCcc714d56bc0da0fd33d96d2a87b680dD6D0DF6;
        address address2 = 0xaee905FdD3ED851e48d22059575b9F4245A82B04;

        uints1[address1] = 88;
        uints1[address2] = 99;

        structs1[address1] = DeviceData("deviceBrand", "deviceYear", "wearLevel");
        structs1[address2] = DeviceData("deviceBrand2", "deviceYear2", "wearLevel2");
        singleDD = DeviceData("deviceBrand3", "deviceYear3", "wearLevel3");

        uintarray.push(8000);
        uintarray.push(9000);

        deviceDataArray.push(structs1[address1]);
        deviceDataArray.push(structs1[address2]);
    }
}
