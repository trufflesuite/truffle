// File: all-code/hive/dai-test/auctiondaitest.sol

pragma solidity ^0.8.7;

interface Hive {
    function auctionMint(uint id, address to, uint rewardRate) external;
}

interface IERC20 {
	function totalSupply() external view returns (uint256);

	function balanceOf(address account) external view returns (uint256);

	function transfer(address recipient, uint256 amount) external returns (bool);

	function allowance(address owner, address spender) external view returns (uint256);

	function approve(address spender, uint256 amount) external returns (bool);

	function transferFrom(
		address sender,
		address recipient,
		uint256 amount
	) external returns (bool);

	event Transfer(address indexed from, address indexed to, uint256 value);
	event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract Auction {
    // static
    address public owner;
    uint public bidIncrement;
    uint public startDate;
    uint public endDate;

    IERC20 public daiToken;

    Hive nftAddress;

    // event LogBid(address bidder, uint bid, address highestBidder, uint highestBid, uint highestBindingBid);
    // event LogWithdrawal(address withdrawer, address withdrawalAccount, uint amount);
    // event LogCanceled();

    constructor (address _owner, uint _bidIncrement, uint _startDate, uint _endDate, address _hive, address _dai) {
        owner = _owner;
        bidIncrement = _bidIncrement;
        startDate = _startDate;
        endDate = _endDate;
        nftAddress = Hive(_hive);
        daiToken = IERC20(_dai);
    }


    struct AuctionData {
        uint id;
        uint highestBid;
        address highestBidder;
        bool isWithdrawn;
        bool isCanceled;
    }

    mapping(uint => AuctionData) public HighestBidDetails;

    modifier shouldBeAuctionID(uint id) {
        require(id >= 1 && id <= 20, "Invalid ID");
        _;
    }

    uint minPrice = 150000000000000000;
    uint auctionInterval = 15 minutes;

    mapping(uint => AuctionData[]) public bidStack;

    function getActiveID() public view returns(uint) {
        uint timeDifference = block.timestamp - startDate;
        uint id = timeDifference /auctionInterval;
        return id + 1;
    }

    modifier shouldBeActiveID(uint id) {
        require(id == getActiveID(), "Not an active ID");
        _;
    }

    function placeBid(uint id, uint amount)
        public
        onlyAfterStart
        onlyBeforeEnd
        shouldBeAuctionID(id)
        shouldBeActiveID(id)
        returns (bool success)
    {
        require(daiToken.balanceOf(msg.sender) >= amount, "Insufficient balance to place bid");
        
        AuctionData memory data;

        
        require(amount >= minPrice, "Amount is lower than base price");
        if(HighestBidDetails[id].highestBid > 0 && !HighestBidDetails[id].isCanceled) {
            require(amount == (HighestBidDetails[id].highestBid + bidIncrement), "New Bid should be 12k greater than the highest bid");
        }

        data.highestBid = amount;
        data.highestBidder = msg.sender;
        data.id = id;

        HighestBidDetails[id] = data;
        bidStack[id].push(data);

        //emit LogBid(msg.sender, newBid, highestBidder, highestBid, highestBindingBid);
        return true;
    }

    modifier onlyEnded(uint id) {
        require(id < getActiveID(), "Auction not ended for the given ID");
        _;
    }

    function getHighestBidderDetails(uint id) internal view returns(AuctionData memory, uint index) {
        uint stackLenght = bidStack[id].length;

        for(uint i = stackLenght - 1; i >= 0; i--) {
            if(!bidStack[id][i].isCanceled) {
                uint amount = bidStack[id][i].highestBid;
                address bidder = bidStack[id][i].highestBidder;
                if(daiToken.balanceOf(bidder) >= amount) {
                    return (bidStack[id][i], index);
                }
            }
        }

        return (AuctionData({id: id, highestBid: 0, highestBidder: address(0), isWithdrawn: false, isCanceled: false}), stackLenght + 1);
    }

    function claimNFT(uint id)
        shouldBeAuctionID(id)
        onlyEnded(id)
        public
        returns (bool success)
    {
        require(!HighestBidDetails[id].isWithdrawn, "Already withdrawn");

        (AuctionData memory data, uint index) = getHighestBidderDetails(id);
        require(data.highestBid > 0, "None of the Bid has enough wallet balance");

        address withdrawalAccount = data.highestBidder;
        uint withdrawalAmount = data.highestBid;
        data.isWithdrawn = true;

        uint rewardRate = withdrawalAmount / (12000 * (10 ** 18));
        require(rewardRate > 0, "Error in reward rate");

        daiToken.transferFrom(withdrawalAccount, address(this), withdrawalAmount);
        nftAddress.auctionMint(id, withdrawalAccount, rewardRate);
        HighestBidDetails[id] = data;
        bidStack[id][index] = data;

        //emit LogWithdrawal(msg.sender, withdrawalAccount, withdrawalAmount);

        return true;
    }

    function cancelBid(uint id, uint index) public shouldBeAuctionID(id)  {
        require(id == getActiveID(), "Auction eneded for the ID");
        require(!bidStack[id][index].isCanceled, "Bid already canceled");
        
        bidStack[id][index].isCanceled = true;
        if(bidStack[id][index].highestBid == HighestBidDetails[id].highestBid) {
            if(index - 1 >= 0) {
                HighestBidDetails[id] = bidStack[id][index - 1];
            } else {
                HighestBidDetails[id] = AuctionData({
                    id: id,
                    highestBid: 0,
                    highestBidder: address(0),
                    isWithdrawn: false,
                    isCanceled: false
                });
            }
        }
    }

    function getBidStack(uint id) public view returns(AuctionData[] memory) {
        return bidStack[id];
    }

    function setAuctionInterval(uint _interval) public onlyOwner {
        auctionInterval = _interval;
    }

    function setStartDate(uint _date) public onlyOwner {
        startDate = _date;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyAfterStart {
        require(block.timestamp > startDate, "Auction not started yet!");
        _;
    }

    modifier onlyBeforeEnd {
        require(block.timestamp < endDate, "Auction ended!");
        _;
    }


    function changeNFTinterface(address _addr) public onlyOwner {
        nftAddress = Hive(_addr);
    }


        //////////////////////////////////.........Auction.........////////////////////////////////////////
    // uint public premiumMaxCap = 20; //20
    // uint public totalPremiumMinted = 0;

    // function auctionMint(uint id, address to) public onlyOwner {
    //     require(_totalSupply[id] == 0, "this id is already owned by someone");
	// 	_totalSupply[id] = 1;

    //     nextTimePeriodToPayFee[id] = block.timestamp;
    //     lastClaimedTimestamp[id] = block.timestamp;
	// 	mintedHives = mintedHives + 1;
	// 	_mint(to, id, 1, "0x");
    // }
    // reclaim accidentally sent tokens
	function withdrawTokens(IERC20 token) public onlyOwner {
		require(address(token) != address(0));
		uint256 balance = token.balanceOf(address(this));
		token.transfer(msg.sender, balance);
	}
}
