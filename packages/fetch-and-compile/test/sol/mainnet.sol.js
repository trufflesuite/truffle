const mainnetDataSol =
  "/**\n" +
  " *Submitted for verification at Etherscan.io on 20XX-XX-XX\n" +
  "*/\n" +
  "\n" +
  "pragma solidity =0.6.6;\r\n" +
  "\r\n" +
  "interface IUniswapV2Factory {\r\n" +
  "    event PairCreated(address indexed token0, address indexed token1, address pair, uint);\r\n" +
  "\r\n" +
  "    function feeTo() external view returns (address);\r\n" +
  "    function feeToSetter() external view returns (address);\r\n" +
  "\r\n" +
  "    function getPair(address tokenA, address tokenB) external view returns (address pair);\r\n" +
  "    function allPairs(uint) external view returns (address pair);\r\n" +
  "    function allPairsLength() external view returns (uint);\r\n" +
  "\r\n" +
  "    function createPair(address tokenA, address tokenB) external returns (address pair);\r\n" +
  "\r\n" +
  "    function setFeeTo(address) external;\r\n" +
  "    function setFeeToSetter(address) external;\r\n" +
  "}\r\n" +
  "\r\n" +
  "interface IUniswapV2Pair {\r\n" +
  "    event Approval(address indexed owner, address indexed spender, uint value);\r\n" +
  "    event Transfer(address indexed from, address indexed to, uint value);\r\n" +
  "\r\n" +
  "    function name() external pure returns (string memory);\r\n" +
  "    function symbol() external pure returns (string memory);\r\n" +
  "    function decimals() external pure returns (uint8);\r\n" +
  "    function totalSupply() external view returns (uint);\r\n" +
  "    function balanceOf(address owner) external view returns (uint);\r\n" +
  "    function allowance(address owner, address spender) external view returns (uint);\r\n" +
  "\r\n" +
  "    function approve(address spender, uint value) external returns (bool);\r\n" +
  "    function transfer(address to, uint value) external returns (bool);\r\n" +
  "    function transferFrom(address from, address to, uint value) external returns (bool);\r\n" +
  "\r\n" +
  "    function DOMAIN_SEPARATOR() external view returns (bytes32);\r\n" +
  "    function PERMIT_TYPEHASH() external pure returns (bytes32);\r\n" +
  "    function nonces(address owner) external view returns (uint);\r\n" +
  "\r\n" +
  "    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;\r\n" +
  "\r\n" +
  "    event Mint(address indexed sender, uint amount0, uint amount1);\r\n" +
  "    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);\r\n" +
  "    event Swap(\r\n" +
  "        address indexed sender,\r\n" +
  "        uint amount0In,\r\n" +
  "        uint amount1In,\r\n" +
  "        uint amount0Out,\r\n" +
  "        uint amount1Out,\r\n" +
  "        address indexed to\r\n" +
  "    );\r\n" +
  "    event Sync(uint112 reserve0, uint112 reserve1);\r\n" +
  "\r\n" +
  "    function MINIMUM_LIQUIDITY() external pure returns (uint);\r\n" +
  "    function factory() external view returns (address);\r\n" +
  "    function token0() external view returns (address);\r\n" +
  "    function token1() external view returns (address);\r\n" +
  "    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);\r\n" +
  "    function price0CumulativeLast() external view returns (uint);\r\n" +
  "    function price1CumulativeLast() external view returns (uint);\r\n" +
  "    function kLast() external view returns (uint);\r\n" +
  "\r\n" +
  "    function mint(address to) external returns (uint liquidity);\r\n" +
  "    function burn(address to) external returns (uint amount0, uint amount1);\r\n" +
  "    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;\r\n" +
  "    function skim(address to) external;\r\n" +
  "    function sync() external;\r\n" +
  "\r\n" +
  "    function initialize(address, address) external;\r\n" +
  "}\r\n" +
  "\r\n" +
  "interface IUniswapV2Router01 {\r\n" +
  "    function factory() external pure returns (address);\r\n" +
  "    function WETH() external pure returns (address);\r\n" +
  "\r\n" +
  "    function addLiquidity(\r\n" +
  "        address tokenA,\r\n" +
  "        address tokenB,\r\n" +
  "        uint amountADesired,\r\n" +
  "        uint amountBDesired,\r\n" +
  "        uint amountAMin,\r\n" +
  "        uint amountBMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external returns (uint amountA, uint amountB, uint liquidity);\r\n" +
  "    function addLiquidityETH(\r\n" +
  "        address token,\r\n" +
  "        uint amountTokenDesired,\r\n" +
  "        uint amountTokenMin,\r\n" +
  "        uint amountETHMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);\r\n" +
  "    function removeLiquidity(\r\n" +
  "        address tokenA,\r\n" +
  "        address tokenB,\r\n" +
  "        uint liquidity,\r\n" +
  "        uint amountAMin,\r\n" +
  "        uint amountBMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external returns (uint amountA, uint amountB);\r\n" +
  "    function removeLiquidityETH(\r\n" +
  "        address token,\r\n" +
  "        uint liquidity,\r\n" +
  "        uint amountTokenMin,\r\n" +
  "        uint amountETHMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external returns (uint amountToken, uint amountETH);\r\n" +
  "    function removeLiquidityWithPermit(\r\n" +
  "        address tokenA,\r\n" +
  "        address tokenB,\r\n" +
  "        uint liquidity,\r\n" +
  "        uint amountAMin,\r\n" +
  "        uint amountBMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline,\r\n" +
  "        bool approveMax, uint8 v, bytes32 r, bytes32 s\r\n" +
  "    ) external returns (uint amountA, uint amountB);\r\n" +
  "    function removeLiquidityETHWithPermit(\r\n" +
  "        address token,\r\n" +
  "        uint liquidity,\r\n" +
  "        uint amountTokenMin,\r\n" +
  "        uint amountETHMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline,\r\n" +
  "        bool approveMax, uint8 v, bytes32 r, bytes32 s\r\n" +
  "    ) external returns (uint amountToken, uint amountETH);\r\n" +
  "    function swapExactTokensForTokens(\r\n" +
  "        uint amountIn,\r\n" +
  "        uint amountOutMin,\r\n" +
  "        address[] calldata path,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external returns (uint[] memory amounts);\r\n" +
  "    function swapTokensForExactTokens(\r\n" +
  "        uint amountOut,\r\n" +
  "        uint amountInMax,\r\n" +
  "        address[] calldata path,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external returns (uint[] memory amounts);\r\n" +
  "    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)\r\n" +
  "        external\r\n" +
  "        payable\r\n" +
  "        returns (uint[] memory amounts);\r\n" +
  "    function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)\r\n" +
  "        external\r\n" +
  "        returns (uint[] memory amounts);\r\n" +
  "    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)\r\n" +
  "        external\r\n" +
  "        returns (uint[] memory amounts);\r\n" +
  "    function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)\r\n" +
  "        external\r\n" +
  "        payable\r\n" +
  "        returns (uint[] memory amounts);\r\n" +
  "\r\n" +
  "    function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB);\r\n" +
  "    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut);\r\n" +
  "    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure returns (uint amountIn);\r\n" +
  "    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);\r\n" +
  "    function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts);\r\n" +
  "}\r\n" +
  "\r\n" +
  "interface IUniswapV2Router02 is IUniswapV2Router01 {\r\n" +
  "    function removeLiquidityETHSupportingFeeOnTransferTokens(\r\n" +
  "        address token,\r\n" +
  "        uint liquidity,\r\n" +
  "        uint amountTokenMin,\r\n" +
  "        uint amountETHMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external returns (uint amountETH);\r\n" +
  "    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(\r\n" +
  "        address token,\r\n" +
  "        uint liquidity,\r\n" +
  "        uint amountTokenMin,\r\n" +
  "        uint amountETHMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline,\r\n" +
  "        bool approveMax, uint8 v, bytes32 r, bytes32 s\r\n" +
  "    ) external returns (uint amountETH);\r\n" +
  "\r\n" +
  "    function swapExactTokensForTokensSupportingFeeOnTransferTokens(\r\n" +
  "        uint amountIn,\r\n" +
  "        uint amountOutMin,\r\n" +
  "        address[] calldata path,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external;\r\n" +
  "    function swapExactETHForTokensSupportingFeeOnTransferTokens(\r\n" +
  "        uint amountOutMin,\r\n" +
  "        address[] calldata path,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external payable;\r\n" +
  "    function swapExactTokensForETHSupportingFeeOnTransferTokens(\r\n" +
  "        uint amountIn,\r\n" +
  "        uint amountOutMin,\r\n" +
  "        address[] calldata path,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external;\r\n" +
  "}\r\n" +
  "\r\n" +
  "interface IERC20 {\r\n" +
  "    event Approval(address indexed owner, address indexed spender, uint value);\r\n" +
  "    event Transfer(address indexed from, address indexed to, uint value);\r\n" +
  "\r\n" +
  "    function name() external view returns (string memory);\r\n" +
  "    function symbol() external view returns (string memory);\r\n" +
  "    function decimals() external view returns (uint8);\r\n" +
  "    function totalSupply() external view returns (uint);\r\n" +
  "    function balanceOf(address owner) external view returns (uint);\r\n" +
  "    function allowance(address owner, address spender) external view returns (uint);\r\n" +
  "\r\n" +
  "    function approve(address spender, uint value) external returns (bool);\r\n" +
  "    function transfer(address to, uint value) external returns (bool);\r\n" +
  "    function transferFrom(address from, address to, uint value) external returns (bool);\r\n" +
  "}\r\n" +
  "\r\n" +
  "interface IWETH {\r\n" +
  "    function deposit() external payable;\r\n" +
  "    function transfer(address to, uint value) external returns (bool);\r\n" +
  "    function withdraw(uint) external;\r\n" +
  "}\r\n" +
  "\r\n" +
  "contract UniswapV2Router02 is IUniswapV2Router02 {\r\n" +
  "    using SafeMath for uint;\r\n" +
  "\r\n" +
  "    address public immutable override factory;\r\n" +
  "    address public immutable override WETH;\r\n" +
  "\r\n" +
  "    modifier ensure(uint deadline) {\r\n" +
  "        require(deadline >= block.timestamp, 'UniswapV2Router: EXPIRED');\r\n" +
  "        _;\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    constructor(address _factory, address _WETH) public {\r\n" +
  "        factory = _factory;\r\n" +
  "        WETH = _WETH;\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    receive() external payable {\r\n" +
  "        assert(msg.sender == WETH); // only accept ETH via fallback from the WETH contract\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    // **** ADD LIQUIDITY ****\r\n" +
  "    function _addLiquidity(\r\n" +
  "        address tokenA,\r\n" +
  "        address tokenB,\r\n" +
  "        uint amountADesired,\r\n" +
  "        uint amountBDesired,\r\n" +
  "        uint amountAMin,\r\n" +
  "        uint amountBMin\r\n" +
  "    ) internal virtual returns (uint amountA, uint amountB) {\r\n" +
  "        // create the pair if it doesn't exist yet\r\n" +
  "        if (IUniswapV2Factory(factory).getPair(tokenA, tokenB) == address(0)) {\r\n" +
  "            IUniswapV2Factory(factory).createPair(tokenA, tokenB);\r\n" +
  "        }\r\n" +
  "        (uint reserveA, uint reserveB) = UniswapV2Library.getReserves(factory, tokenA, tokenB);\r\n" +
  "        if (reserveA == 0 && reserveB == 0) {\r\n" +
  "            (amountA, amountB) = (amountADesired, amountBDesired);\r\n" +
  "        } else {\r\n" +
  "            uint amountBOptimal = UniswapV2Library.quote(amountADesired, reserveA, reserveB);\r\n" +
  "            if (amountBOptimal <= amountBDesired) {\r\n" +
  "                require(amountBOptimal >= amountBMin, 'UniswapV2Router: INSUFFICIENT_B_AMOUNT');\r\n" +
  "                (amountA, amountB) = (amountADesired, amountBOptimal);\r\n" +
  "            } else {\r\n" +
  "                uint amountAOptimal = UniswapV2Library.quote(amountBDesired, reserveB, reserveA);\r\n" +
  "                assert(amountAOptimal <= amountADesired);\r\n" +
  "                require(amountAOptimal >= amountAMin, 'UniswapV2Router: INSUFFICIENT_A_AMOUNT');\r\n" +
  "                (amountA, amountB) = (amountAOptimal, amountBDesired);\r\n" +
  "            }\r\n" +
  "        }\r\n" +
  "    }\r\n" +
  "    function addLiquidity(\r\n" +
  "        address tokenA,\r\n" +
  "        address tokenB,\r\n" +
  "        uint amountADesired,\r\n" +
  "        uint amountBDesired,\r\n" +
  "        uint amountAMin,\r\n" +
  "        uint amountBMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external virtual override ensure(deadline) returns (uint amountA, uint amountB, uint liquidity) {\r\n" +
  "        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);\r\n" +
  "        address pair = UniswapV2Library.pairFor(factory, tokenA, tokenB);\r\n" +
  "        TransferHelper.safeTransferFrom(tokenA, msg.sender, pair, amountA);\r\n" +
  "        TransferHelper.safeTransferFrom(tokenB, msg.sender, pair, amountB);\r\n" +
  "        liquidity = IUniswapV2Pair(pair).mint(to);\r\n" +
  "    }\r\n" +
  "    function addLiquidityETH(\r\n" +
  "        address token,\r\n" +
  "        uint amountTokenDesired,\r\n" +
  "        uint amountTokenMin,\r\n" +
  "        uint amountETHMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external virtual override payable ensure(deadline) returns (uint amountToken, uint amountETH, uint liquidity) {\r\n" +
  "        (amountToken, amountETH) = _addLiquidity(\r\n" +
  "            token,\r\n" +
  "            WETH,\r\n" +
  "            amountTokenDesired,\r\n" +
  "            msg.value,\r\n" +
  "            amountTokenMin,\r\n" +
  "            amountETHMin\r\n" +
  "        );\r\n" +
  "        address pair = UniswapV2Library.pairFor(factory, token, WETH);\r\n" +
  "        TransferHelper.safeTransferFrom(token, msg.sender, pair, amountToken);\r\n" +
  "        IWETH(WETH).deposit{value: amountETH}();\r\n" +
  "        assert(IWETH(WETH).transfer(pair, amountETH));\r\n" +
  "        liquidity = IUniswapV2Pair(pair).mint(to);\r\n" +
  "        // refund dust eth, if any\r\n" +
  "        if (msg.value > amountETH) TransferHelper.safeTransferETH(msg.sender, msg.value - amountETH);\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    // **** REMOVE LIQUIDITY ****\r\n" +
  "    function removeLiquidity(\r\n" +
  "        address tokenA,\r\n" +
  "        address tokenB,\r\n" +
  "        uint liquidity,\r\n" +
  "        uint amountAMin,\r\n" +
  "        uint amountBMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) public virtual override ensure(deadline) returns (uint amountA, uint amountB) {\r\n" +
  "        address pair = UniswapV2Library.pairFor(factory, tokenA, tokenB);\r\n" +
  "        IUniswapV2Pair(pair).transferFrom(msg.sender, pair, liquidity); // send liquidity to pair\r\n" +
  "        (uint amount0, uint amount1) = IUniswapV2Pair(pair).burn(to);\r\n" +
  "        (address token0,) = UniswapV2Library.sortTokens(tokenA, tokenB);\r\n" +
  "        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);\r\n" +
  "        require(amountA >= amountAMin, 'UniswapV2Router: INSUFFICIENT_A_AMOUNT');\r\n" +
  "        require(amountB >= amountBMin, 'UniswapV2Router: INSUFFICIENT_B_AMOUNT');\r\n" +
  "    }\r\n" +
  "    function removeLiquidityETH(\r\n" +
  "        address token,\r\n" +
  "        uint liquidity,\r\n" +
  "        uint amountTokenMin,\r\n" +
  "        uint amountETHMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) public virtual override ensure(deadline) returns (uint amountToken, uint amountETH) {\r\n" +
  "        (amountToken, amountETH) = removeLiquidity(\r\n" +
  "            token,\r\n" +
  "            WETH,\r\n" +
  "            liquidity,\r\n" +
  "            amountTokenMin,\r\n" +
  "            amountETHMin,\r\n" +
  "            address(this),\r\n" +
  "            deadline\r\n" +
  "        );\r\n" +
  "        TransferHelper.safeTransfer(token, to, amountToken);\r\n" +
  "        IWETH(WETH).withdraw(amountETH);\r\n" +
  "        TransferHelper.safeTransferETH(to, amountETH);\r\n" +
  "    }\r\n" +
  "    function removeLiquidityWithPermit(\r\n" +
  "        address tokenA,\r\n" +
  "        address tokenB,\r\n" +
  "        uint liquidity,\r\n" +
  "        uint amountAMin,\r\n" +
  "        uint amountBMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline,\r\n" +
  "        bool approveMax, uint8 v, bytes32 r, bytes32 s\r\n" +
  "    ) external virtual override returns (uint amountA, uint amountB) {\r\n" +
  "        address pair = UniswapV2Library.pairFor(factory, tokenA, tokenB);\r\n" +
  "        uint value = approveMax ? uint(-1) : liquidity;\r\n" +
  "        IUniswapV2Pair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);\r\n" +
  "        (amountA, amountB) = removeLiquidity(tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline);\r\n" +
  "    }\r\n" +
  "    function removeLiquidityETHWithPermit(\r\n" +
  "        address token,\r\n" +
  "        uint liquidity,\r\n" +
  "        uint amountTokenMin,\r\n" +
  "        uint amountETHMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline,\r\n" +
  "        bool approveMax, uint8 v, bytes32 r, bytes32 s\r\n" +
  "    ) external virtual override returns (uint amountToken, uint amountETH) {\r\n" +
  "        address pair = UniswapV2Library.pairFor(factory, token, WETH);\r\n" +
  "        uint value = approveMax ? uint(-1) : liquidity;\r\n" +
  "        IUniswapV2Pair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);\r\n" +
  "        (amountToken, amountETH) = removeLiquidityETH(token, liquidity, amountTokenMin, amountETHMin, to, deadline);\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    // **** REMOVE LIQUIDITY (supporting fee-on-transfer tokens) ****\r\n" +
  "    function removeLiquidityETHSupportingFeeOnTransferTokens(\r\n" +
  "        address token,\r\n" +
  "        uint liquidity,\r\n" +
  "        uint amountTokenMin,\r\n" +
  "        uint amountETHMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) public virtual override ensure(deadline) returns (uint amountETH) {\r\n" +
  "        (, amountETH) = removeLiquidity(\r\n" +
  "            token,\r\n" +
  "            WETH,\r\n" +
  "            liquidity,\r\n" +
  "            amountTokenMin,\r\n" +
  "            amountETHMin,\r\n" +
  "            address(this),\r\n" +
  "            deadline\r\n" +
  "        );\r\n" +
  "        TransferHelper.safeTransfer(token, to, IERC20(token).balanceOf(address(this)));\r\n" +
  "        IWETH(WETH).withdraw(amountETH);\r\n" +
  "        TransferHelper.safeTransferETH(to, amountETH);\r\n" +
  "    }\r\n" +
  "    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(\r\n" +
  "        address token,\r\n" +
  "        uint liquidity,\r\n" +
  "        uint amountTokenMin,\r\n" +
  "        uint amountETHMin,\r\n" +
  "        address to,\r\n" +
  "        uint deadline,\r\n" +
  "        bool approveMax, uint8 v, bytes32 r, bytes32 s\r\n" +
  "    ) external virtual override returns (uint amountETH) {\r\n" +
  "        address pair = UniswapV2Library.pairFor(factory, token, WETH);\r\n" +
  "        uint value = approveMax ? uint(-1) : liquidity;\r\n" +
  "        IUniswapV2Pair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);\r\n" +
  "        amountETH = removeLiquidityETHSupportingFeeOnTransferTokens(\r\n" +
  "            token, liquidity, amountTokenMin, amountETHMin, to, deadline\r\n" +
  "        );\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    // **** SWAP ****\r\n" +
  "    // requires the initial amount to have already been sent to the first pair\r\n" +
  "    function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {\r\n" +
  "        for (uint i; i < path.length - 1; i++) {\r\n" +
  "            (address input, address output) = (path[i], path[i + 1]);\r\n" +
  "            (address token0,) = UniswapV2Library.sortTokens(input, output);\r\n" +
  "            uint amountOut = amounts[i + 1];\r\n" +
  "            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));\r\n" +
  "            address to = i < path.length - 2 ? UniswapV2Library.pairFor(factory, output, path[i + 2]) : _to;\r\n" +
  "            IUniswapV2Pair(UniswapV2Library.pairFor(factory, input, output)).swap(\r\n" +
  "                amount0Out, amount1Out, to, new bytes(0)\r\n" +
  "            );\r\n" +
  "        }\r\n" +
  "    }\r\n" +
  "    function swapExactTokensForTokens(\r\n" +
  "        uint amountIn,\r\n" +
  "        uint amountOutMin,\r\n" +
  "        address[] calldata path,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external virtual override ensure(deadline) returns (uint[] memory amounts) {\r\n" +
  "        amounts = UniswapV2Library.getAmountsOut(factory, amountIn, path);\r\n" +
  "        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');\r\n" +
  "        TransferHelper.safeTransferFrom(\r\n" +
  "            path[0], msg.sender, UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]\r\n" +
  "        );\r\n" +
  "        _swap(amounts, path, to);\r\n" +
  "    }\r\n" +
  "    function swapTokensForExactTokens(\r\n" +
  "        uint amountOut,\r\n" +
  "        uint amountInMax,\r\n" +
  "        address[] calldata path,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external virtual override ensure(deadline) returns (uint[] memory amounts) {\r\n" +
  "        amounts = UniswapV2Library.getAmountsIn(factory, amountOut, path);\r\n" +
  "        require(amounts[0] <= amountInMax, 'UniswapV2Router: EXCESSIVE_INPUT_AMOUNT');\r\n" +
  "        TransferHelper.safeTransferFrom(\r\n" +
  "            path[0], msg.sender, UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]\r\n" +
  "        );\r\n" +
  "        _swap(amounts, path, to);\r\n" +
  "    }\r\n" +
  "    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)\r\n" +
  "        external\r\n" +
  "        virtual\r\n" +
  "        override\r\n" +
  "        payable\r\n" +
  "        ensure(deadline)\r\n" +
  "        returns (uint[] memory amounts)\r\n" +
  "    {\r\n" +
  "        require(path[0] == WETH, 'UniswapV2Router: INVALID_PATH');\r\n" +
  "        amounts = UniswapV2Library.getAmountsOut(factory, msg.value, path);\r\n" +
  "        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');\r\n" +
  "        IWETH(WETH).deposit{value: amounts[0]}();\r\n" +
  "        assert(IWETH(WETH).transfer(UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]));\r\n" +
  "        _swap(amounts, path, to);\r\n" +
  "    }\r\n" +
  "    function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)\r\n" +
  "        external\r\n" +
  "        virtual\r\n" +
  "        override\r\n" +
  "        ensure(deadline)\r\n" +
  "        returns (uint[] memory amounts)\r\n" +
  "    {\r\n" +
  "        require(path[path.length - 1] == WETH, 'UniswapV2Router: INVALID_PATH');\r\n" +
  "        amounts = UniswapV2Library.getAmountsIn(factory, amountOut, path);\r\n" +
  "        require(amounts[0] <= amountInMax, 'UniswapV2Router: EXCESSIVE_INPUT_AMOUNT');\r\n" +
  "        TransferHelper.safeTransferFrom(\r\n" +
  "            path[0], msg.sender, UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]\r\n" +
  "        );\r\n" +
  "        _swap(amounts, path, address(this));\r\n" +
  "        IWETH(WETH).withdraw(amounts[amounts.length - 1]);\r\n" +
  "        TransferHelper.safeTransferETH(to, amounts[amounts.length - 1]);\r\n" +
  "    }\r\n" +
  "    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)\r\n" +
  "        external\r\n" +
  "        virtual\r\n" +
  "        override\r\n" +
  "        ensure(deadline)\r\n" +
  "        returns (uint[] memory amounts)\r\n" +
  "    {\r\n" +
  "        require(path[path.length - 1] == WETH, 'UniswapV2Router: INVALID_PATH');\r\n" +
  "        amounts = UniswapV2Library.getAmountsOut(factory, amountIn, path);\r\n" +
  "        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');\r\n" +
  "        TransferHelper.safeTransferFrom(\r\n" +
  "            path[0], msg.sender, UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]\r\n" +
  "        );\r\n" +
  "        _swap(amounts, path, address(this));\r\n" +
  "        IWETH(WETH).withdraw(amounts[amounts.length - 1]);\r\n" +
  "        TransferHelper.safeTransferETH(to, amounts[amounts.length - 1]);\r\n" +
  "    }\r\n" +
  "    function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)\r\n" +
  "        external\r\n" +
  "        virtual\r\n" +
  "        override\r\n" +
  "        payable\r\n" +
  "        ensure(deadline)\r\n" +
  "        returns (uint[] memory amounts)\r\n" +
  "    {\r\n" +
  "        require(path[0] == WETH, 'UniswapV2Router: INVALID_PATH');\r\n" +
  "        amounts = UniswapV2Library.getAmountsIn(factory, amountOut, path);\r\n" +
  "        require(amounts[0] <= msg.value, 'UniswapV2Router: EXCESSIVE_INPUT_AMOUNT');\r\n" +
  "        IWETH(WETH).deposit{value: amounts[0]}();\r\n" +
  "        assert(IWETH(WETH).transfer(UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]));\r\n" +
  "        _swap(amounts, path, to);\r\n" +
  "        // refund dust eth, if any\r\n" +
  "        if (msg.value > amounts[0]) TransferHelper.safeTransferETH(msg.sender, msg.value - amounts[0]);\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    // **** SWAP (supporting fee-on-transfer tokens) ****\r\n" +
  "    // requires the initial amount to have already been sent to the first pair\r\n" +
  "    function _swapSupportingFeeOnTransferTokens(address[] memory path, address _to) internal virtual {\r\n" +
  "        for (uint i; i < path.length - 1; i++) {\r\n" +
  "            (address input, address output) = (path[i], path[i + 1]);\r\n" +
  "            (address token0,) = UniswapV2Library.sortTokens(input, output);\r\n" +
  "            IUniswapV2Pair pair = IUniswapV2Pair(UniswapV2Library.pairFor(factory, input, output));\r\n" +
  "            uint amountInput;\r\n" +
  "            uint amountOutput;\r\n" +
  "            { // scope to avoid stack too deep errors\r\n" +
  "            (uint reserve0, uint reserve1,) = pair.getReserves();\r\n" +
  "            (uint reserveInput, uint reserveOutput) = input == token0 ? (reserve0, reserve1) : (reserve1, reserve0);\r\n" +
  "            amountInput = IERC20(input).balanceOf(address(pair)).sub(reserveInput);\r\n" +
  "            amountOutput = UniswapV2Library.getAmountOut(amountInput, reserveInput, reserveOutput);\r\n" +
  "            }\r\n" +
  "            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOutput) : (amountOutput, uint(0));\r\n" +
  "            address to = i < path.length - 2 ? UniswapV2Library.pairFor(factory, output, path[i + 2]) : _to;\r\n" +
  "            pair.swap(amount0Out, amount1Out, to, new bytes(0));\r\n" +
  "        }\r\n" +
  "    }\r\n" +
  "    function swapExactTokensForTokensSupportingFeeOnTransferTokens(\r\n" +
  "        uint amountIn,\r\n" +
  "        uint amountOutMin,\r\n" +
  "        address[] calldata path,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    ) external virtual override ensure(deadline) {\r\n" +
  "        TransferHelper.safeTransferFrom(\r\n" +
  "            path[0], msg.sender, UniswapV2Library.pairFor(factory, path[0], path[1]), amountIn\r\n" +
  "        );\r\n" +
  "        uint balanceBefore = IERC20(path[path.length - 1]).balanceOf(to);\r\n" +
  "        _swapSupportingFeeOnTransferTokens(path, to);\r\n" +
  "        require(\r\n" +
  "            IERC20(path[path.length - 1]).balanceOf(to).sub(balanceBefore) >= amountOutMin,\r\n" +
  "            'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT'\r\n" +
  "        );\r\n" +
  "    }\r\n" +
  "    function swapExactETHForTokensSupportingFeeOnTransferTokens(\r\n" +
  "        uint amountOutMin,\r\n" +
  "        address[] calldata path,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    )\r\n" +
  "        external\r\n" +
  "        virtual\r\n" +
  "        override\r\n" +
  "        payable\r\n" +
  "        ensure(deadline)\r\n" +
  "    {\r\n" +
  "        require(path[0] == WETH, 'UniswapV2Router: INVALID_PATH');\r\n" +
  "        uint amountIn = msg.value;\r\n" +
  "        IWETH(WETH).deposit{value: amountIn}();\r\n" +
  "        assert(IWETH(WETH).transfer(UniswapV2Library.pairFor(factory, path[0], path[1]), amountIn));\r\n" +
  "        uint balanceBefore = IERC20(path[path.length - 1]).balanceOf(to);\r\n" +
  "        _swapSupportingFeeOnTransferTokens(path, to);\r\n" +
  "        require(\r\n" +
  "            IERC20(path[path.length - 1]).balanceOf(to).sub(balanceBefore) >= amountOutMin,\r\n" +
  "            'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT'\r\n" +
  "        );\r\n" +
  "    }\r\n" +
  "    function swapExactTokensForETHSupportingFeeOnTransferTokens(\r\n" +
  "        uint amountIn,\r\n" +
  "        uint amountOutMin,\r\n" +
  "        address[] calldata path,\r\n" +
  "        address to,\r\n" +
  "        uint deadline\r\n" +
  "    )\r\n" +
  "        external\r\n" +
  "        virtual\r\n" +
  "        override\r\n" +
  "        ensure(deadline)\r\n" +
  "    {\r\n" +
  "        require(path[path.length - 1] == WETH, 'UniswapV2Router: INVALID_PATH');\r\n" +
  "        TransferHelper.safeTransferFrom(\r\n" +
  "            path[0], msg.sender, UniswapV2Library.pairFor(factory, path[0], path[1]), amountIn\r\n" +
  "        );\r\n" +
  "        _swapSupportingFeeOnTransferTokens(path, address(this));\r\n" +
  "        uint amountOut = IERC20(WETH).balanceOf(address(this));\r\n" +
  "        require(amountOut >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');\r\n" +
  "        IWETH(WETH).withdraw(amountOut);\r\n" +
  "        TransferHelper.safeTransferETH(to, amountOut);\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    // **** LIBRARY FUNCTIONS ****\r\n" +
  "    function quote(uint amountA, uint reserveA, uint reserveB) public pure virtual override returns (uint amountB) {\r\n" +
  "        return UniswapV2Library.quote(amountA, reserveA, reserveB);\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut)\r\n" +
  "        public\r\n" +
  "        pure\r\n" +
  "        virtual\r\n" +
  "        override\r\n" +
  "        returns (uint amountOut)\r\n" +
  "    {\r\n" +
  "        return UniswapV2Library.getAmountOut(amountIn, reserveIn, reserveOut);\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut)\r\n" +
  "        public\r\n" +
  "        pure\r\n" +
  "        virtual\r\n" +
  "        override\r\n" +
  "        returns (uint amountIn)\r\n" +
  "    {\r\n" +
  "        return UniswapV2Library.getAmountIn(amountOut, reserveIn, reserveOut);\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    function getAmountsOut(uint amountIn, address[] memory path)\r\n" +
  "        public\r\n" +
  "        view\r\n" +
  "        virtual\r\n" +
  "        override\r\n" +
  "        returns (uint[] memory amounts)\r\n" +
  "    {\r\n" +
  "        return UniswapV2Library.getAmountsOut(factory, amountIn, path);\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    function getAmountsIn(uint amountOut, address[] memory path)\r\n" +
  "        public\r\n" +
  "        view\r\n" +
  "        virtual\r\n" +
  "        override\r\n" +
  "        returns (uint[] memory amounts)\r\n" +
  "    {\r\n" +
  "        return UniswapV2Library.getAmountsIn(factory, amountOut, path);\r\n" +
  "    }\r\n" +
  "}\r\n" +
  "\r\n" +
  "// a library for performing overflow-safe math, courtesy of DappHub (https://github.com/dapphub/ds-math)\r\n" +
  "\r\n" +
  "library SafeMath {\r\n" +
  "    function add(uint x, uint y) internal pure returns (uint z) {\r\n" +
  "        require((z = x + y) >= x, 'ds-math-add-overflow');\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    function sub(uint x, uint y) internal pure returns (uint z) {\r\n" +
  "        require((z = x - y) <= x, 'ds-math-sub-underflow');\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    function mul(uint x, uint y) internal pure returns (uint z) {\r\n" +
  "        require(y == 0 || (z = x * y) / y == x, 'ds-math-mul-overflow');\r\n" +
  "    }\r\n" +
  "}\r\n" +
  "\r\n" +
  "library UniswapV2Library {\r\n" +
  "    using SafeMath for uint;\r\n" +
  "\r\n" +
  "    // returns sorted token addresses, used to handle return values from pairs sorted in this order\r\n" +
  "    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {\r\n" +
  "        require(tokenA != tokenB, 'UniswapV2Library: IDENTICAL_ADDRESSES');\r\n" +
  "        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);\r\n" +
  "        require(token0 != address(0), 'UniswapV2Library: ZERO_ADDRESS');\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    // calculates the CREATE2 address for a pair without making any external calls\r\n" +
  "    function pairFor(address factory, address tokenA, address tokenB) internal pure returns (address pair) {\r\n" +
  "        (address token0, address token1) = sortTokens(tokenA, tokenB);\r\n" +
  "        pair = address(uint(keccak256(abi.encodePacked(\r\n" +
  "                hex'ff',\r\n" +
  "                factory,\r\n" +
  "                keccak256(abi.encodePacked(token0, token1)),\r\n" +
  "                hex'96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f' // init code hash\r\n" +
  "            ))));\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    // fetches and sorts the reserves for a pair\r\n" +
  "    function getReserves(address factory, address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {\r\n" +
  "        (address token0,) = sortTokens(tokenA, tokenB);\r\n" +
  "        (uint reserve0, uint reserve1,) = IUniswapV2Pair(pairFor(factory, tokenA, tokenB)).getReserves();\r\n" +
  "        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    // given some amount of an asset and pair reserves, returns an equivalent amount of the other asset\r\n" +
  "    function quote(uint amountA, uint reserveA, uint reserveB) internal pure returns (uint amountB) {\r\n" +
  "        require(amountA > 0, 'UniswapV2Library: INSUFFICIENT_AMOUNT');\r\n" +
  "        require(reserveA > 0 && reserveB > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');\r\n" +
  "        amountB = amountA.mul(reserveB) / reserveA;\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset\r\n" +
  "    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint amountOut) {\r\n" +
  "        require(amountIn > 0, 'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');\r\n" +
  "        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');\r\n" +
  "        uint amountInWithFee = amountIn.mul(997);\r\n" +
  "        uint numerator = amountInWithFee.mul(reserveOut);\r\n" +
  "        uint denominator = reserveIn.mul(1000).add(amountInWithFee);\r\n" +
  "        amountOut = numerator / denominator;\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    // given an output amount of an asset and pair reserves, returns a required input amount of the other asset\r\n" +
  "    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) internal pure returns (uint amountIn) {\r\n" +
  "        require(amountOut > 0, 'UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT');\r\n" +
  "        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');\r\n" +
  "        uint numerator = reserveIn.mul(amountOut).mul(1000);\r\n" +
  "        uint denominator = reserveOut.sub(amountOut).mul(997);\r\n" +
  "        amountIn = (numerator / denominator).add(1);\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    // performs chained getAmountOut calculations on any number of pairs\r\n" +
  "    function getAmountsOut(address factory, uint amountIn, address[] memory path) internal view returns (uint[] memory amounts) {\r\n" +
  "        require(path.length >= 2, 'UniswapV2Library: INVALID_PATH');\r\n" +
  "        amounts = new uint[](path.length);\r\n" +
  "        amounts[0] = amountIn;\r\n" +
  "        for (uint i; i < path.length - 1; i++) {\r\n" +
  "            (uint reserveIn, uint reserveOut) = getReserves(factory, path[i], path[i + 1]);\r\n" +
  "            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);\r\n" +
  "        }\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    // performs chained getAmountIn calculations on any number of pairs\r\n" +
  "    function getAmountsIn(address factory, uint amountOut, address[] memory path) internal view returns (uint[] memory amounts) {\r\n" +
  "        require(path.length >= 2, 'UniswapV2Library: INVALID_PATH');\r\n" +
  "        amounts = new uint[](path.length);\r\n" +
  "        amounts[amounts.length - 1] = amountOut;\r\n" +
  "        for (uint i = path.length - 1; i > 0; i--) {\r\n" +
  "            (uint reserveIn, uint reserveOut) = getReserves(factory, path[i - 1], path[i]);\r\n" +
  "            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);\r\n" +
  "        }\r\n" +
  "    }\r\n" +
  "}\r\n" +
  "\r\n" +
  "// helper methods for interacting with ERC20 tokens and sending ETH that do not consistently return true/false\r\n" +
  "library TransferHelper {\r\n" +
  "    function safeApprove(address token, address to, uint value) internal {\r\n" +
  "        // bytes4(keccak256(bytes('approve(address,uint256)')));\r\n" +
  "        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x095ea7b3, to, value));\r\n" +
  "        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: APPROVE_FAILED');\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    function safeTransfer(address token, address to, uint value) internal {\r\n" +
  "        // bytes4(keccak256(bytes('transfer(address,uint256)')));\r\n" +
  "        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));\r\n" +
  "        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: TRANSFER_FAILED');\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    function safeTransferFrom(address token, address from, address to, uint value) internal {\r\n" +
  "        // bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));\r\n" +
  "        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));\r\n" +
  "        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: TRANSFER_FROM_FAILED');\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    function safeTransferETH(address to, uint value) internal {\r\n" +
  "        (bool success,) = to.call{value:value}(new bytes(0));\r\n" +
  "        require(success, 'TransferHelper: ETH_TRANSFER_FAILED');\r\n" +
  "    }\r\n" +
  "}";

module.exports = mainnetDataSol;
