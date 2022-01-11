const mainnetDataSol =
  "pragma solidity >=0.5.0;\r\n" +
  "\r\n" +
  "interface IUniswapV2Factory {\r\n" +
  "    event PairCreated(address indexed token0, address indexed token1, address pair, uint);\r\n" +
  "\r\n" +
  "    function feeTo() external view returns (address);\r\n" +
  "    function withdrawFeeTo() external view returns (address);\r\n" +
  "    function swapFee() external view returns (uint);\r\n" +
  "    function withdrawFee() external view returns (uint);\r\n" +
  "    \r\n" +
  "    function feeSetter() external view returns (address);\r\n" +
  "    function migrator() external view returns (address);\r\n" +
  "\r\n" +
  "    function getPair(address tokenA, address tokenB) external view returns (address pair);\r\n" +
  "    function allPairs(uint) external view returns (address pair);\r\n" +
  "    function allPairsLength() external view returns (uint);\r\n" +
  "\r\n" +
  "    function createPair(address tokenA, address tokenB) external returns (address pair);\r\n" +
  "\r\n" +
  "    function setFeeTo(address) external;\r\n" +
  "    function setWithdrawFeeTo(address) external;\r\n" +
  "    function setSwapFee(uint) external;\r\n" +
  "    function setFeeSetter(address) external;\r\n" +
  "    function setMigrator(address) external;\r\n" +
  "}\r\n" +
  "\r\n" +
  "// File: @openzeppelin/contracts/token/ERC20/IERC20.sol\r\n" +
  "\r\n" +
  "pragma solidity ^0.6.0;\r\n" +
  "\r\n" +
  "/**\r\n" +
  " * @dev Interface of the ERC20 standard as defined in the EIP.\r\n" +
  " */\r\n" +
  "interface IERC20 {\r\n" +
  "    /**\r\n" +
  "     * @dev Returns the amount of tokens in existence.\r\n" +
  "     */\r\n" +
  "    function totalSupply() external view returns (uint256);\r\n" +
  "\r\n" +
  "    /**\r\n" +
  "     * @dev Returns the amount of tokens owned by `account`.\r\n" +
  "     */\r\n" +
  "    function balanceOf(address account) external view returns (uint256);\r\n" +
  "\r\n" +
  "    /**\r\n" +
  "     * @dev Moves `amount` tokens from the caller's account to `recipient`.\r\n" +
  "     *\r\n" +
  "     * Returns a boolean value indicating whether the operation succeeded.\r\n" +
  "     *\r\n" +
  "     * Emits a {Transfer} event.\r\n" +
  "     */\r\n" +
  "    function transfer(address recipient, uint256 amount) external returns (bool);\r\n" +
  "\r\n" +
  "    /**\r\n" +
  "     * @dev Returns the remaining number of tokens that `spender` will be\r\n" +
  "     * allowed to spend on behalf of `owner` through {transferFrom}. This is\r\n" +
  "     * zero by default.\r\n" +
  "     *\r\n" +
  "     * This value changes when {approve} or {transferFrom} are called.\r\n" +
  "     */\r\n" +
  "    function allowance(address owner, address spender) external view returns (uint256);\r\n" +
  "\r\n" +
  "    /**\r\n" +
  "     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.\r\n" +
  "     *\r\n" +
  "     * Returns a boolean value indicating whether the operation succeeded.\r\n" +
  "     *\r\n" +
  "     * IMPORTANT: Beware that changing an allowance with this method brings the risk\r\n" +
  "     * that someone may use both the old and the new allowance by unfortunate\r\n" +
  "     * transaction ordering. One possible solution to mitigate this race\r\n" +
  "     * condition is to first reduce the spender's allowance to 0 and set the\r\n" +
  "     * desired value afterwards:\r\n" +
  "     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729\r\n" +
  "     *\r\n" +
  "     * Emits an {Approval} event.\r\n" +
  "     */\r\n" +
  "    function approve(address spender, uint256 amount) external returns (bool);\r\n" +
  "\r\n" +
  "    /**\r\n" +
  "     * @dev Moves `amount` tokens from `sender` to `recipient` using the\r\n" +
  "     * allowance mechanism. `amount` is then deducted from the caller's\r\n" +
  "     * allowance.\r\n" +
  "     *\r\n" +
  "     * Returns a boolean value indicating whether the operation succeeded.\r\n" +
  "     *\r\n" +
  "     * Emits a {Transfer} event.\r\n" +
  "     */\r\n" +
  "    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);\r\n" +
  "\r\n" +
  "    /**\r\n" +
  "     * @dev Emitted when `value` tokens are moved from one account (`from`) to\r\n" +
  "     * another (`to`).\r\n" +
  "     *\r\n" +
  "     * Note that `value` may be zero.\r\n" +
  "     */\r\n" +
  "    event Transfer(address indexed from, address indexed to, uint256 value);\r\n" +
  "\r\n" +
  "    /**\r\n" +
  "     * @dev Emitted when the allowance of a `spender` for an `owner` is set by\r\n" +
  "     * a call to {approve}. `value` is the new allowance.\r\n" +
  "     */\r\n" +
  "    event Approval(address indexed owner, address indexed spender, uint256 value);\r\n" +
  "}\r\n" +
  "\r\n" +
  "// File: @openzeppelin/contracts/math/SafeMath.sol\r\n" +
  "\r\n" +
  "// SPDX-License-Identifier: MIT\r\n" +
  "\r\n" +
  "pragma solidity ^0.6.0;\r\n" +
  "\r\n" +
  "/**\r\n" +
  " * @dev Wrappers over Solidity's arithmetic operations with added overflow\r\n" +
  " * checks.\r\n" +
  " *\r\n" +
  " * Arithmetic operations in Solidity wrap on overflow. This can easily result\r\n" +
  " * in bugs, because programmers usually assume that an overflow raises an\r\n" +
  " * error, which is the standard behavior in high level programming languages.\r\n" +
  " * `SafeMath` restores this intuition by reverting the transaction when an\r\n" +
  " * operation overflows.\r\n" +
  " *\r\n" +
  " * Using this library instead of the unchecked operations eliminates an entire\r\n" +
  " * class of bugs, so it's recommended to use it always.\r\n" +
  " */\r\n" +
  "library SafeMath {\r\n" +
  "    /**\r\n" +
  "     * @dev Returns the addition of two unsigned integers, reverting on\r\n" +
  "     * overflow.\r\n" +
  "     *\r\n" +
  "     * Counterpart to Solidity's `+` operator.\r\n" +
  "     *\r\n" +
  "     * Requirements:\r\n" +
  "     *\r\n" +
  "     * - Addition cannot overflow.\r\n" +
  "     */\r\n" +
  "    function add(uint256 a, uint256 b) internal pure returns (uint256) {\r\n" +
  "        uint256 c = a + b;\r\n" +
  '        require(c >= a, "SafeMath: addition overflow");\r\n' +
  "\r\n" +
  "        return c;\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    /**\r\n" +
  "     * @dev Returns the subtraction of two unsigned integers, reverting on\r\n" +
  "     * overflow (when the result is negative).\r\n" +
  "     *\r\n" +
  "     * Counterpart to Solidity's `-` operator.\r\n" +
  "     *\r\n" +
  "     * Requirements:\r\n" +
  "     *\r\n" +
  "     * - Subtraction cannot overflow.\r\n" +
  "     */\r\n" +
  "    function sub(uint256 a, uint256 b) internal pure returns (uint256) {\r\n" +
  '        return sub(a, b, "SafeMath: subtraction overflow");\r\n' +
  "    }\r\n" +
  "\r\n" +
  "    /**\r\n" +
  "     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on\r\n" +
  "     * overflow (when the result is negative).\r\n" +
  "     *\r\n" +
  "     * Counterpart to Solidity's `-` operator.\r\n" +
  "     *\r\n" +
  "     * Requirements:\r\n" +
  "     *\r\n" +
  "     * - Subtraction cannot overflow.\r\n" +
  "     */\r\n" +
  "    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {\r\n" +
  "        require(b <= a, errorMessage);\r\n" +
  "        uint256 c = a - b;\r\n" +
  "\r\n" +
  "        return c;\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    /**\r\n" +
  "     * @dev Returns the multiplication of two unsigned integers, reverting on\r\n" +
  "     * overflow.\r\n" +
  "     *\r\n" +
  "     * Counterpart to Solidity's `*` operator.\r\n" +
  "     *\r\n" +
  "     * Requirements:\r\n" +
  "     *\r\n" +
  "     * - Multiplication cannot overflow.\r\n" +
  "     */\r\n" +
  "    function mul(uint256 a, uint256 b) internal pure returns (uint256) {\r\n" +
  "        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the\r\n" +
  "        // benefit is lost if 'b' is also tested.\r\n" +
  "        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522\r\n" +
  "        if (a == 0) {\r\n" +
  "            return 0;\r\n" +
  "        }\r\n" +
  "\r\n" +
  "        uint256 c = a * b;\r\n" +
  '        require(c / a == b, "SafeMath: multiplication overflow");\r\n' +
  "\r\n" +
  "        return c;\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    /**\r\n" +
  "     * @dev Returns the integer division of two unsigned integers. Reverts on\r\n" +
  "     * division by zero. The result is rounded towards zero.\r\n" +
  "     *\r\n" +
  "     * Counterpart to Solidity's `/` operator. Note: this function uses a\r\n" +
  "     * `revert` opcode (which leaves remaining gas untouched) while Solidity\r\n" +
  "     * uses an invalid opcode to revert (consuming all remaining gas).\r\n" +
  "     *\r\n" +
  "     * Requirements:\r\n" +
  "     *\r\n" +
  "     * - The divisor cannot be zero.\r\n" +
  "     */\r\n" +
  "    function div(uint256 a, uint256 b) internal pure returns (uint256) {\r\n" +
  '        return div(a, b, "SafeMath: division by zero");\r\n' +
  "    }\r\n" +
  "\r\n" +
  "    /**\r\n" +
  "     * @dev Returns the integer division of two unsigned integers. Reverts with custom message on\r\n" +
  "     * division by zero. The result is rounded towards zero.\r\n" +
  "     *\r\n" +
  "     * Counterpart to Solidity's `/` operator. Note: this function uses a\r\n" +
  "     * `revert` opcode (which leaves remaining gas untouched) while Solidity\r\n" +
  "     * uses an invalid opcode to revert (consuming all remaining gas).\r\n" +
  "     *\r\n" +
  "     * Requirements:\r\n" +
  "     *\r\n" +
  "     * - The divisor cannot be zero.\r\n" +
  "     */\r\n" +
  "    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {\r\n" +
  "        require(b > 0, errorMessage);\r\n" +
  "        uint256 c = a / b;\r\n" +
  "        // assert(a == b * c + a % b); // There is no case in which this doesn't hold\r\n" +
  "\r\n" +
  "        return c;\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    /**\r\n" +
  "     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),\r\n" +
  "     * Reverts when dividing by zero.\r\n" +
  "     *\r\n" +
  "     * Counterpart to Solidity's `%` operator. This function uses a `revert`\r\n" +
  "     * opcode (which leaves remaining gas untouched) while Solidity uses an\r\n" +
  "     * invalid opcode to revert (consuming all remaining gas).\r\n" +
  "     *\r\n" +
  "     * Requirements:\r\n" +
  "     *\r\n" +
  "     * - The divisor cannot be zero.\r\n" +
  "     */\r\n" +
  "    function mod(uint256 a, uint256 b) internal pure returns (uint256) {\r\n" +
  '        return mod(a, b, "SafeMath: modulo by zero");\r\n' +
  "    }\r\n" +
  "\r\n" +
  "    /**\r\n" +
  "     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),\r\n" +
  "     * Reverts with custom message when dividing by zero.\r\n" +
  "     *\r\n" +
  "     * Counterpart to Solidity's `%` operator. This function uses a `revert`\r\n" +
  "     * opcode (which leaves remaining gas untouched) while Solidity uses an\r\n" +
  "     * invalid opcode to revert (consuming all remaining gas).\r\n" +
  "     *\r\n" +
  "     * Requirements:\r\n" +
  "     *\r\n" +
  "     * - The divisor cannot be zero.\r\n" +
  "     */\r\n" +
  "    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {\r\n" +
  "        require(b != 0, errorMessage);\r\n" +
  "        return a % b;\r\n" +
  "    }\r\n" +
  "}";

module.exports = mainnetDataSol;
