/**
 *Submitted for verification at polygonscan.com on 2021-11-04
*/

// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;
// import "hardhat/console.sol";

/*
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return msg.data;
    }
}

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor () {
        address msgSender = _msgSender();
        _owner = msgSender;
        emit OwnershipTransferred(address(0), msgSender);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}


interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}


/**
 * @dev Interface for the optional metadata functions from the ERC20 standard.
 *
 * _Available since v4.1._
 */
interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
}


/**
 * @dev Implementation of the {IERC20} interface.
 *
 * This implementation is agnostic to the way tokens are created. This means
 * that a supply mechanism has to be added in a derived contract using {_mint}.
 * For a generic mechanism see {ERC20PresetMinterPauser}.
 *
 * TIP: For a detailed writeup see our guide
 * https://forum.zeppelin.solutions/t/how-to-implement-erc20-supply-mechanisms/226[How
 * to implement supply mechanisms].
 *
 * We have followed general OpenZeppelin guidelines: functions revert instead
 * of returning `false` on failure. This behavior is nonetheless conventional
 * and does not conflict with the expectations of ERC20 applications.
 *
 * Additionally, an {Approval} event is emitted on calls to {transferFrom}.
 * This allows applications to reconstruct the allowance for all accounts just
 * by listening to said events. Other implementations of the EIP may not emit
 * these events, as it isn't required by the specification.
 *
 * Finally, the non-standard {decreaseAllowance} and {increaseAllowance}
 * functions have been added to mitigate the well-known issues around setting
 * allowances. See {IERC20-approve}.
 */
contract ERC20 is Context, IERC20, IERC20Metadata {
    mapping (address => uint256) private _balances;

    mapping (address => mapping (address => uint256)) private _allowances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;

    /**
     * @dev Sets the values for {name} and {symbol}.
     *
     * The default value of {decimals} is 18. To select a different value for
     * {decimals} you should overload it.
     *
     * All two of these values are immutable: they can only be set once during
     * construction.
     */
    constructor (string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5,05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the value {ERC20} uses, unless this function is
     * overridden;
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * Requirements:
     *
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for ``sender``'s tokens of at least
     * `amount`.
     */
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
    }

        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
    _approve(_msgSender(), spender, currentAllowance - subtractedValue);
    }

        return true;
    }

    /**
     * @dev Moves tokens `amount` from `sender` to `recipient`.
     *
     * This is internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(sender, recipient, amount);

        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
    _balances[sender] = senderBalance - amount;
    }
        _balances[recipient] += amount;

        emit Transfer(sender, recipient, amount);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
    _balances[account] = accountBalance - amount;
    }
        _totalSupply -= amount;

        emit Transfer(account, address(0), amount);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev Hook that is called before any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * will be to transferred to `to`.
     * - when `from` is zero, `amount` tokens will be minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual { }
}


/**
 * @dev Collection of functions related to the address type
 */
library Address {
    /**
     * @dev Returns true if `account` is a contract.
     *
     * [IMPORTANT]
     * ====
     * It is unsafe to assume that an address for which this function returns
     * false is an externally-owned account (EOA) and not a contract.
     *
     * Among others, `isContract` will return false for the following
     * types of addresses:
     *
     *  - an externally-owned account
     *  - a contract in construction
     *  - an address where a contract will be created
     *  - an address where a contract lived, but was destroyed
     * ====
     */
    function isContract(address account) internal view returns (bool) {
        // This method relies on extcodesize, which returns 0 for contracts in
        // construction, since the code is only stored at the end of the
        // constructor execution.

        uint256 size;
        // solhint-disable-next-line no-inline-assembly
        assembly { size := extcodesize(account) }
        return size > 0;
    }

    /**
     * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
     * `recipient`, forwarding all available gas and reverting on errors.
     *
     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
     * of certain opcodes, possibly making contracts go over the 2300 gas limit
     * imposed by `transfer`, making them unable to receive funds via
     * `transfer`. {sendValue} removes this limitation.
     *
     * https://diligence.consensys.net/posts/2019/09/stop-using-soliditys-transfer-now/[Learn more].
     *
     * IMPORTANT: because control is transferred to `recipient`, care must be
     * taken to not create reentrancy vulnerabilities. Consider using
     * {ReentrancyGuard} or the
     * https://solidity.readthedocs.io/en/v0.5.11/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
     */
    function sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Address: insufficient balance");

        // solhint-disable-next-line avoid-low-level-calls, avoid-call-value
        (bool success, ) = recipient.call{ value: amount }("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }

    /**
     * @dev Performs a Solidity function call using a low level `call`. A
     * plain`call` is an unsafe replacement for a function call: use this
     * function instead.
     *
     * If `target` reverts with a revert reason, it is bubbled up by this
     * function (like regular Solidity function calls).
     *
     * Returns the raw returned data. To convert to the expected return value,
     * use https://solidity.readthedocs.io/en/latest/units-and-global-variables.html?highlight=abi.decode#abi-encoding-and-decoding-functions[`abi.decode`].
     *
     * Requirements:
     *
     * - `target` must be a contract.
     * - calling `target` with `data` must not revert.
     *
     * _Available since v3.1._
     */
    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
      return functionCall(target, data, "Address: low-level call failed");
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`], but with
     * `errorMessage` as a fallback revert reason when `target` reverts.
     *
     * _Available since v3.1._
     */
    function functionCall(address target, bytes memory data, string memory errorMessage) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0, errorMessage);
    }

    /*
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but also transferring `value` wei to `target`.
     *
     * Requirements:
     *
     * - the calling contract must have an ETH balance of at least `value`.
     * - the called Solidity function must be `payable`.
     *
     * _Available since v3.1._
     */
     
    function functionCallWithValue(address target, bytes memory data, uint256 value) internal returns (bytes memory) {
        return functionCallWithValue(target, data, value, "Address: low-level call with value failed");
    }

    /**
     * @dev Same as {xref-Address-functionCallWithValue-address-bytes-uint256-}[`functionCallWithValue`], but
     * with `errorMessage` as a fallback revert reason when `target` reverts.
     *
     * _Available since v3.1._
     */
    function functionCallWithValue(address target, bytes memory data, uint256 value, string memory errorMessage) internal returns (bytes memory) {
        require(address(this).balance >= value, "Address: insufficient balance for call");
        require(isContract(target), "Address: call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = target.call{ value: value }(data);
        return _verifyCallResult(success, returndata, errorMessage);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a static call.
     *
     * _Available since v3.3._
     */
    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        return functionStaticCall(target, data, "Address: low-level static call failed");
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],
     * but performing a static call.
     *
     * _Available since v3.3._
     */
    function functionStaticCall(address target, bytes memory data, string memory errorMessage) internal view returns (bytes memory) {
        require(isContract(target), "Address: static call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = target.staticcall(data);
        return _verifyCallResult(success, returndata, errorMessage);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a delegate call.
     *
     * _Available since v3.4._
     */
    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionDelegateCall(target, data, "Address: low-level delegate call failed");
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],
     * but performing a delegate call.
     *
     * _Available since v3.4._
     */
    function functionDelegateCall(address target, bytes memory data, string memory errorMessage) internal returns (bytes memory) {
        require(isContract(target), "Address: delegate call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = target.delegatecall(data);
        return _verifyCallResult(success, returndata, errorMessage);
    }

    function _verifyCallResult(bool success, bytes memory returndata, string memory errorMessage) private pure returns(bytes memory) {
        if (success) {
            return returndata;
        } else {
            // Look for revert reason and bubble it up if present
            if (returndata.length > 0) {
                // The easiest way to bubble the revert reason is using memory via assembly

                // solhint-disable-next-line no-inline-assembly
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert(errorMessage);
            }
        }
    }
}


interface IGrowthVault {
    function strategy() external view returns (address);
    function deposit(uint256 _amount) external;
    function earn() external;
    function getCurrentStrategy() external view returns (
        address _liquidityRouter,
        address _lpToken,
        address _token1,
        address _token0,
        address _farm,
        uint256 _pid
    );
}


interface Ifarm {
    function DINO() external view returns (address);
    function deposit(uint256 _pid, uint256 _amount) external;
    function withdraw(uint256 _pid, uint256 _amount) external;
    function userInfo(uint256 _pid, address _user) external view returns (uint256, uint256);
    function pendingSushi(uint256 _pid, address _user) external view returns (uint256);
    function leaveStaking(uint256 _amount) external;
    function emergencyWithdraw(uint256 _pid) external;
    function poolInfo(uint256) external view returns(address lpToken, uint allocPoint, uint lastRewardBlock, uint accSpiritPerShare, uint16 depositFeeBP);
}

interface IfarmWOpid {
    struct Profit {
        uint usd;
        uint hunny;
        uint bnb;
    }

    struct APY {
        uint usd;
        uint hunny;
        uint bnb;
    }

    struct UserInfo {
        uint balance;
        uint principal;
        uint available;
        Profit profit;
        uint poolTVL;
        APY poolAPY;
    }

    function deposit(uint256 _amount) external;
    function withdraw(uint256 _amount) external;
    function userInfo(uint256 _pid, address _user) external view returns (uint256, uint256);
    function pendingSushi(address _user) external view returns (uint256);
    function emergencyWithdraw(uint256 _pid) external;
    function info(address account) external view returns (UserInfo memory);
}


interface IRouter {
    function factory() external view returns (address);
    function WETH() external view returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);
    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountToken, uint amountETH);
    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountA, uint amountB);
    function removeLiquidityETHWithPermit(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountToken, uint amountETH);
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);
    function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
        external
        returns (uint[] memory amounts);
    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        returns (uint[] memory amounts);
    function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);

    function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB);
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut);
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure returns (uint amountIn);
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts);
}


interface IPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112, uint112, uint32);
    function totalSupply() external view returns (uint256);
    function mint(address to) external returns (uint256);
}


/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     *
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;

        return c;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     *
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts with custom message on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return mod(a, b, "SafeMath: modulo by zero");
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts with custom message when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b != 0, errorMessage);
        return a % b;
    }
}


/**
 * @title SafeERC20
 * @dev Wrappers around ERC20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    using SafeMath for uint256;
    using Address for address;

    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    /**
     * @dev Deprecated. This function has issues similar to the ones found in
     * {IERC20-approve}, and its usage is discouraged.
     *
     * Whenever possible, use {safeIncreaseAllowance} and
     * {safeDecreaseAllowance} instead.
     */
    function safeApprove(IERC20 token, address spender, uint256 value) internal {
        // safeApprove should only be called when setting an initial allowance,
        // or when resetting it to zero. To increase and decrease it, use
        // 'safeIncreaseAllowance' and 'safeDecreaseAllowance'
        // solhint-disable-next-line max-line-length
        require((value == 0) || (token.allowance(address(this), spender) == 0),
            "SafeERC20: approve from non-zero to non-zero allowance"
        );
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, value));
    }

    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 newAllowance = token.allowance(address(this), spender).add(value);
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
    }

    function safeDecreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 newAllowance = token.allowance(address(this), spender).sub(value, "SafeERC20: decreased allowance below zero");
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves. We use {Address.functionCall} to perform this call, which verifies that
        // the target address contains contract code and also asserts for success in the low-level call.

        bytes memory returndata = address(token).functionCall(data, "SafeERC20: low-level call failed");
        if (returndata.length > 0) { // Return data is optional
            // solhint-disable-next-line max-line-length
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }
}

library TransferHelper {
    function safeTransferBNB(address to, uint256 value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, 'TransferHelper::safeTransferBNB: BNB transfer failed');
    }
}

interface IWBNB {
    function deposit() external payable;
    function transfer(address to, uint value) external returns (bool);
    function transferFrom(address from, address to, uint value) external returns (bool);
    function withdraw(uint) external;
}


/**
 * @dev Implementation of a vault to deposit funds for yield optimizing.
 * This is the contract that receives funds and that users interface with.
 * The yield optimizing strategy itself is implemented in a separate 'Strategy.sol' contract.
 */
contract GrowthVault is ERC20, Ownable {
    using SafeERC20 for IERC20;
    using Address for address;                
    
    struct StrategyInfo {
        address liquidityRouter;
        address lpToken;
        uint256 pid;
        uint256 totalLP;
        uint256 totalCapital;
        address farm;
        address token0;
        address token1;
    }

    // Info of each strategy for LP tokens.
    // nameID, strategy obj
    mapping(uint256 => StrategyInfo) private strategyInfo;
    mapping(address => uint256) private requestBlock;
    mapping(uint256 => bool) private nameExist;
    uint256[] private names;

    uint256 public constant withdrawFee = 15; // 15%
    uint256 public constant toleranceLevelPercent = 1; // 1% 
    uint256 public totalFeeUSDT;
    uint256 public REQUIRED_NUMBER_OF_BLOCKS = 4;
    address public government;
    address public YELtoken;
    address public yelLiquidityRouter;
    address public USDT;

    uint256 private pid;
    uint256 private nameID;
    uint256 private constant NONE_PID_VALUE = 999999;
    uint256 private constant differencePercent = 1; // 1%
    address private farm;
    address private token0;
    address private token1;
    address private WETH;
    address private liquidityRouter;
    uint256 public pendingFee; // in native tokens
    uint256 public pendingFeeInCakes;
    address private lpToken;

    // TODO: remove strategy
    // TODO: userСapital добавить при каждом вводе кошелька пользователя и вывести в WBNB

    event YELswapped(uint256 percent);
    event DepositToVault(uint256 amount);
    event WithdrawFromVault(uint256 amount);
    event Earn(uint256 amount);
    event PartialMigrate(uint256 amount);
    event Migrate(uint256 amount);
    event AutoCompound();

    modifier onlyOwnerOrGovernment() {
        require(
            owner() == _msgSender() || government == _msgSender(),
            "Ownable: caller is not the owner or government"
        );
        _;
    }

    modifier canWithdraw() {
        uint256 currentBlock = block.number;
        if(requestBlock[msg.sender] == 0) {
            requestBlock[msg.sender] = currentBlock;
        } else if(currentBlock - requestBlock[msg.sender] >= REQUIRED_NUMBER_OF_BLOCKS) {
            _;
        } else {
            revert("Difference of blocks is less then REQUIRED_NUMBER_OF_BLOCKS");
        }
    }

    /**
     * @dev Sets the value of {token} to the token that the vault will
     * hold as underlying value. It initializes the vault's own token.
     * This token is minted when someone does a deposit. It is burned in order
     * to withdraw the corresponding portion of the underlying assets.
     */
    constructor(
        string memory name__,
        string memory symbol__,
        address _lpToken,
        uint256 _pid,
        uint256 _nameID,
        address _farm,
        address _liquidityRouter,
        address _USDT,
        address _YELtoken,
        address _yelLiquidityRouter) ERC20(name__, symbol__) {
        require(_lpToken != address(0), "The address of lp token can not be a zero address");
        require(_farm != address(0), "The address of farm can not be a zero address");
        require(_liquidityRouter != address(0), "The address of liquidityRouter can not be a zero address");
        require(_YELtoken != address(0), "The address of YELtoken can not be a zero address");
        
        _setBaseAddresses(_farm, _liquidityRouter, _lpToken, _pid, _nameID);

        yelLiquidityRouter = _yelLiquidityRouter;
        YELtoken = _YELtoken;
        WETH = IRouter(_liquidityRouter).WETH();
        USDT = _USDT;
    }

    function getCurrentStrategy() public view returns (
        address _liquidityRouter,
        address _lpToken,
        address _token1,
        address _token0,
        address _farm,
        uint256 _pid) {
        _liquidityRouter = liquidityRouter;
        _lpToken = lpToken;
        _token1 = token1;
        _token0 = token0;
        _farm = farm;
        _pid = pid;
    }

    function getNamesOfStrategies() public view returns (uint256[] memory) {
        return names;
    }

    function getStrategyInfo(uint256 _nameID) public view returns (
        address _liquidityRouter,
        address _lpToken,
        address _token1,
        address _token0,
        address _farm,
        uint256 _pid) {

        StrategyInfo memory strategyObj = strategyInfo[_nameID];
        _liquidityRouter = strategyObj.liquidityRouter;
        _lpToken = strategyObj.lpToken;
        _token1 = strategyObj.token1;
        _token0 = strategyObj.token0;
        _farm = strategyObj.farm;
        _pid = strategyObj.pid;
    }

    function updateTotalCapital() public returns (uint256) {
        uint256 totalCapital = 0;
        uint256 _nameID;
        StrategyInfo storage strategyObj;
        uint256 totalLP;
        uint256 _token0Value;
        uint256 _token1Value;
        uint256[] memory amounts;
        address[] memory path = new address[](2);

        for (uint256 i; i < names.length; i++) {
            _nameID = names[i];
            strategyObj = strategyInfo[_nameID];
            if(strategyObj.pid < NONE_PID_VALUE) {
                totalLP = _getAmountLPFromStrategy(strategyObj.farm, strategyObj.pid);
            } else {
                totalLP = _getAmountLPFromStrategyWOpid(strategyObj.farm);
            }
            
            if(totalLP > 0) {
                (_token0Value, _token1Value) = _getTokenValues(strategyObj.lpToken, totalLP);

                // calculates how many nativeToken for tokens
                path[1] = WETH;
                if(strategyObj.token0 == WETH) {
                    path[0] = strategyObj.token1;
                    amounts = IRouter(strategyObj.liquidityRouter).getAmountsOut(_token1Value, path);
                    strategyObj.totalCapital = amounts[1];
                    totalCapital += strategyObj.totalCapital;
                } else if (strategyObj.token1 == WETH) {
                    path[0] = strategyObj.token0;
                    amounts = IRouter(strategyObj.liquidityRouter).getAmountsOut(_token0Value, path);
                    strategyObj.totalCapital = amounts[1];
                    totalCapital += strategyObj.totalCapital;
                } else {
                    path[0] = strategyObj.token0;
                    amounts = IRouter(strategyObj.liquidityRouter).getAmountsOut(_token0Value, path);
                    strategyObj.totalCapital = amounts[1];
                    totalCapital += strategyObj.totalCapital;

                    path[0] = strategyObj.token1;
                    amounts = IRouter(strategyObj.liquidityRouter).getAmountsOut(_token1Value, path);
                    strategyObj.totalCapital = amounts[1];
                    totalCapital += strategyObj.totalCapital;
                }
            }
        }
        return totalCapital;
    }

    function addStrategy(
        address _newStrategy,
        uint256 _pid,
        address _lpToken,
        address _liquidityRouter,
        uint256 _nameID) onlyOwner external {
        require(_newStrategy != address(0), "newStrategy can not be a zero address");
        require(_lpToken != address(0), "lpToken can not be a zero address");
        require(_liquidityRouter != address(0), "liquidityRouter can not be a zero address");

        _addStrategy(_newStrategy, _pid, _lpToken, _liquidityRouter, _nameID);
    }

    function addStrategyWOpid(
        address _newStrategy,
        address _lpToken,
        address _liquidityRouter,
        uint256 _nameID) onlyOwner external {
        require(_newStrategy != address(0), "newStrategy can not be a zero address");
        require(_lpToken != address(0), "lpToken can not be a zero address");
        require(_liquidityRouter != address(0), "liquidityRouter can not be a zero address");

        _addStrategy(_newStrategy, NONE_PID_VALUE, _lpToken, _liquidityRouter, _nameID);
    }

    function setGovernment(address _government) external onlyOwner {
        require(_government != address(0), "The address of government can not be a zero address");
        government = _government;
    }

    function withdrawTokensFee() onlyOwner public {
        require(
            _getBalanceOfToken(USDT) > 0,
            "GrowthVault: USDT balance should be more then 0"
        );
        IERC20(USDT).transfer(msg.sender, totalFeeUSDT);
        totalFeeUSDT = 0;
    }

    function earn() public {
        _earn(farm, pid, _getBalanceOfToken(lpToken));
    }

    function autoCompound() public {
        uint256 _nameID;
        uint256 _amount;
        address _cakeToken;
        address[] memory path = new address[](2);
        address[] memory path1 = new address[](3);
        StrategyInfo memory strategyObj;
        uint256[] memory amounts;
        uint256 rewardsFeeInWETH;
        uint256 rewardsFeeInCakes;
        uint256 rewardBalance;
        uint256 desired;
        for (uint256 i; i < names.length; i++) {
            _nameID = names[i];
            strategyObj = strategyInfo[_nameID];

            if(strategyObj.pid < NONE_PID_VALUE) {
                _amount = _getAmountLPFromStrategy(strategyObj.farm, strategyObj.pid);
            } else {
                _amount = _getAmountLPFromStrategyWOpid(strategyObj.farm);
            }
            if (_amount > 0) {
                _withdrawFromStrategy(_nameID, _amount);
                _cakeToken = _getCakeToken(strategyObj.farm);

                path[0] = _cakeToken;
                path[1] = WETH;

                rewardBalance = getAvalaibleCakes(_cakeToken);
                IERC20(_cakeToken).safeApprove(strategyObj.liquidityRouter, 0);
                IERC20(_cakeToken).safeApprove(strategyObj.liquidityRouter, type(uint256).max);

                rewardsFeeInCakes = _calculateAmountFee(rewardBalance) + pendingFeeInCakes;
                amounts = IRouter(strategyObj.liquidityRouter).getAmountsOut(rewardsFeeInCakes, path);
                if(amounts[1] > 100) {
                    IRouter(strategyObj.liquidityRouter).swapExactTokensForTokens(
                        rewardsFeeInCakes,
                        amounts[1] - (amounts[1]*toleranceLevelPercent)/100,
                        path,
                        address(this),
                        block.timestamp+1 minutes
                    );
                    pendingFeeInCakes = 0;
                } else {
                    pendingFeeInCakes += rewardsFeeInCakes;
                }

                path[0] = WETH;
                path[1] = USDT;
                rewardsFeeInWETH = _getBalanceOfToken(WETH);
                amounts = IRouter(strategyObj.liquidityRouter).getAmountsOut(rewardsFeeInWETH, path);
                if(amounts[1] > 100) {
                    IRouter(strategyObj.liquidityRouter).swapExactTokensForTokens(
                        rewardsFeeInWETH,
                        amounts[1] - (amounts[1]*toleranceLevelPercent)/100,
                        path,
                        address(this),
                        block.timestamp+1 minutes
                    );
                    pendingFee = 0;
                    totalFeeUSDT = _getBalanceOfToken(USDT);
                } else {
                    pendingFee += rewardsFeeInWETH;
                }
                
                rewardBalance = getAvalaibleCakes(_cakeToken);

                path1[0] = _cakeToken;
                path1[1] = WETH;
                path1[2] = _cakeToken;

                amounts = IRouter(strategyObj.liquidityRouter).getAmountsOut(rewardBalance, path1);
                if(amounts[1] > 100) {
                    IRouter(strategyObj.liquidityRouter).swapExactTokensForTokens(
                        rewardBalance,
                        amounts[1] - (amounts[1]*toleranceLevelPercent)/100,
                        path1,
                        address(this),
                        block.timestamp+1 minutes
                    );
                    amounts = IRouter(strategyObj.liquidityRouter).getAmountsOut(
                        _getBalanceOfToken(strategyObj.token0), path);
                    
                    if(amounts[1] <= _getBalanceOfToken(strategyObj.token1)) {
                        desired = amounts[1];
                    } else {
                        desired = _getBalanceOfToken(strategyObj.token1);
                    }
                    IERC20(strategyObj.token0).transfer(lpToken, _getBalanceOfToken(strategyObj.token0));
                    IERC20(strategyObj.token1).transfer(lpToken, desired);
                    IPair(lpToken).mint(address(this));
                }
                _earn(strategyObj.farm, strategyObj.pid, _getBalanceOfToken(strategyObj.lpToken));
                
                strategyObj.totalLP = _getAmountLPFromStrategy(strategyObj.farm, strategyObj.pid);
                
                // TODO: all other tokens to USDT ?
            }
        }
        updateTotalCapital();
        emit AutoCompound();
    }

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        autoCompound();
        _approveTokens(token0, token1, liquidityRouter);
        _addLiquidity(liquidityRouter, token0, token1);
        earn();

        // uint256 totalCapital = updateTotalCapital();
        // uint256 percent = (msg.value * 100 * 1000) / (totalCapital);
        // uint256 shares = percent * totalCapital / 1000;
        // _mint(msg.sender, shares);

        // // TODO: excessToUSDT(); ?
        // emit DepositToVault(msg.value);
    }

    function withdraw(uint256 _shares) canWithdraw public {
        uint256 totalCapital = updateTotalCapital();
        // TODO: percent = (_shares/totalShares)*100
        autoCompound();
        uint256 percent = (_shares * 100 * 100)/(totalCapital * 100);
        _burn(msg.sender, _shares);
        _getYELs(percent);
        uint256 _balance = _getBalanceOfToken(YELtoken);
        IERC20(YELtoken).transfer(msg.sender, _balance);

        emit WithdrawFromVault(_balance);
    }

    function migrate(address _contract) onlyOwnerOrGovernment public {
        require(_contract != address(0), "The _contract can not be a zero address");
        autoCompound();
        (address _newLpToken, address _newliquidityRouter,,,,) = IGrowthVault(_contract).getCurrentStrategy();

        _withdrawFromStrategies();

        for (uint256 i; i < names.length; i++) {
            _removeLiquidityAfterWithdraw(names[i]);
        }

        (address _token0, address _token1) = _getTokensFromLP(_newLpToken);
        _addLiquidity(_token0, _token1, _newliquidityRouter);
        IERC20(_newLpToken).transfer(_contract, _getBalanceOfToken(_newLpToken));
        IGrowthVault(_contract).earn();
    }

    function partialMigrate(
        uint256 _oldNameId,
        uint256 _amount,
        uint256 _newNameId) onlyOwnerOrGovernment public {
        autoCompound();
        require(nameExist[_oldNameId], "The _oldNameId value does not exist");
        require(nameExist[_newNameId], "The _newNameId value does not exist");
        require(_amount > 0, "The _amount value sould be more then ZERO");

        // take LP from old strategy
        _withdrawFromStrategy(_oldNameId, _amount);
        // swap LP and Cakes to native Token
        _removeLiquidityAfterWithdraw(_oldNameId);

        StrategyInfo memory strategyObj = strategyInfo[_newNameId];

        // get new LP for new strategy
        _addLiquidity(strategyObj.liquidityRouter, strategyObj.token0, strategyObj.token1);
        _earn(strategyObj.farm, strategyObj.pid, _getBalanceOfToken(strategyObj.lpToken));
        emit PartialMigrate(_amount);
    }

    function _getTokensFromLP(address _lpToken) internal view returns (address, address) {
        return (IPair(_lpToken).token0(), IPair(_lpToken).token1());
    }

    function _getBalanceOfToken(address _token) internal view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }

    function _getAmountLPFromStrategy(address _farm, uint256 _pid) public view returns (uint256 amount) {
        (amount,) = Ifarm(_farm).userInfo(_pid, address(this));
    }

    function _getAmountLPFromStrategyWOpid(address _farm) internal view returns (uint256 amount) {

        IfarmWOpid.UserInfo memory info = IfarmWOpid(_farm).info(address(this));
        return info.available;
    }

    function _withdrawFromStrategies() internal {
        uint256 _amount;
        StrategyInfo memory strategyObj;
        for (uint256 i; i < names.length; i++) {
            strategyObj = strategyInfo[names[i]];

            if(strategyObj.pid < NONE_PID_VALUE) {
                _amount = _getAmountLPFromStrategy(strategyObj.farm, strategyObj.pid);
            } else {
                _amount = _getAmountLPFromStrategyWOpid(strategyObj.farm);
            }
            _withdrawFromStrategy(names[i], _amount);
        }
    }

    function _withdrawFromStrategy(uint256 _nameID, uint256 _amount) internal {
        StrategyInfo memory strategyObj = strategyInfo[_nameID];
        if(strategyObj.pid < NONE_PID_VALUE) {
            Ifarm(strategyObj.farm).withdraw(strategyObj.pid, _amount);
        }
    }

    function _calculateAmountAfterFee(uint256 amount) internal pure returns(uint256) {
        /*
        As the contract takes fee percent from the amount,
        so amount needs to multiple by 100 and divide by 10000 to get correct percentage in solidity

        example: amount = 50 LP, percent = 2%
        fee calculates: 50 * 2 * 100 / 10000 or it is the same as 50 * 0.02
        fee result: 1 LP
        amount after fee calculates: amount - fee result
        amount after fee result: 50 - 1 = 49 LP
        */
        return amount - _calculateAmountFee(amount);
    }

    function _calculateAmountFee(uint256 amount) internal pure returns(uint256) {
        /*
        As the contract takes fee percent from the amount,
        so amount needs to multiple by 100 and divide by 10000 to get correct percentage in solidity

        example: amount = 50 LP, percent = 2%
        fee calculates: 50 * 2 * 100 / 10000 or it is the same as 50 * 0.02
        fee result: 1 LP
        */
        return (amount * withdrawFee) / 100;
    }

    function _removeLiquidity(
        uint256 _amount,
        address _liquidityRouter,
        address _token0,
        address _token1) internal {
        IRouter(_liquidityRouter).removeLiquidity(
            _token0, // tokenA
            _token1, // tokenB
            _amount, // liquidity
            0, // amountAmin
            0,
            address(this), // to 
            block.timestamp + 1 minutes // deadline
        );
        _swapTokensToNativeToken(_token0, _token1, _liquidityRouter);
    }

    function _addLiquidity(address _liquidityRouter, address _token0, address _token1) internal {
        address[] memory path = new address[](2);
        uint256[] memory amounts;
        uint256 _balance = address(this).balance;
        // (uint256 _reserve0, uint256 _reserve1,) = IPair(_lPtoken).getReserves();
        path[0] = WETH;
        uint256 desiredAmountToken;
        uint256 desiredAmountETH = _balance / 2; // FTM, MATIC, ETH, BNB
        // usdc ans spooky
        if(_token0 != WETH) {
            path[1] = _token0;
            amounts = IRouter(_liquidityRouter).getAmountsOut(_balance, path);
            desiredAmountToken = amounts[1] / 2;
            IRouter(_liquidityRouter).swapExactETHForTokens{value:desiredAmountETH}(
                desiredAmountToken - (desiredAmountToken*toleranceLevelPercent/100), // amountOutMin
                path,
                address(this),
                block.timestamp + 1 minutes // deadline
            );
        }

        if(_token1 != WETH) {
            path[1] = _token1;
            amounts = IRouter(_liquidityRouter).getAmountsOut(_balance, path);
            desiredAmountToken = amounts[1] / 2;
            IRouter(_liquidityRouter).swapExactETHForTokens{value:desiredAmountETH}(
                desiredAmountToken - (desiredAmountToken*toleranceLevelPercent/100), // amountOutMin
                path,
                address(this),
                block.timestamp + 1 minutes
            );
        }
        // _approveTokens(_token0, _token1, _liquidityRouter);
        if(_token1 != WETH && _token0 == WETH) {
            desiredAmountToken = _getBalanceOfToken(_token1);
            IRouter(_liquidityRouter).addLiquidityETH{value:desiredAmountETH}(
                _token1,
                desiredAmountToken,
                desiredAmountToken - (desiredAmountToken*toleranceLevelPercent/100),
                desiredAmountETH - (desiredAmountETH*toleranceLevelPercent)/100,
                address(this),
                block.timestamp + 1
            );
        } else if(_token1 == WETH && _token0 != WETH) {
            desiredAmountToken = _getBalanceOfToken(_token0);
            IRouter(_liquidityRouter).addLiquidityETH{value:desiredAmountETH}(
                _token0,
                desiredAmountToken,
                desiredAmountToken - (desiredAmountToken*toleranceLevelPercent*100/(10000)),
                desiredAmountETH - (desiredAmountETH*toleranceLevelPercent)/100,
                address(this),
                block.timestamp + 1
            );
        } else {
            path[0] = _token0;
            path[1] = _token1;

            uint256 desired0 = _getBalanceOfToken(_token0);
            uint256 balanceToken1 = _getBalanceOfToken(_token1);
            amounts = IRouter(_liquidityRouter).getAmountsOut(desired0, path);
            uint256 desired1;
            if(amounts[1] <= balanceToken1) {
                desired1 = amounts[1];
            } else {
                desired1 = balanceToken1;
            }
            IERC20(_token0).transfer(lpToken, desired0);
            IERC20(_token1).transfer(lpToken, desired1);
            IPair(lpToken).mint(address(this));
        }


        // ---------------
        // uint256 ratio;
        // uint256 dec0 = IERC20(_token0).decimals(); // 6
        // uint256 dec1 = IERC20(_token1).decimals(); // 18
        // uint256 decDiff = dec0 - dec1 ? dec0 >= dec1 : dec1 - dec0;
        // decDiff = 1 ? decDiff == 0 : decDiff;

        // if(_token0 == WETH) {
        //     ratio = _reserve0 * 10*12 / _reserve1; // div for future by
        // } else if (_token1 == WETH) { // ->>>>>
        //     // 4024674337009544375369059 * 10 ** 12 / 10994611588736
        //     /// FTM r / wUSDT r
        //     ratioFTMperUSDT = (_reserve1 / decDiff) * 10 ** 12 / _reserve0; // 0.36605880112
        //     // 366058801125
        // }

        // amountOfUSDT = msg.value / ratioFTMperUSDT; // TODO? 10 ** 12
        // // 2 * 10 ** 18 / 0.36605880112
        // desiredAmountFTM = 2 / 2; // FTM = 2 / 2
        // desiredAmountUSDT = amountOfUSDT / 2;
        // IRouter(_liquidityRouter).addLiquidityETH{value:desiredAmountFTM}(
        //     USDT,
        //     desiredAmountUSDT,
        //     desiredAmountUSDT * (desiredAmountUSDT * toleranceLevelPercent)/100,
        //     desiredAmountFTM * (desiredAmountFTM * toleranceLevelPercent)/100,
        //     address(this),
        //     block.timestamp + 1
        // );

    }

    function _addStrategy(
        address _newFarm,
        uint256 _pid,
        address _lpToken,
        address _liquidityRouter,
        uint256 _nameID) internal {
        StrategyInfo storage strategyObj = strategyInfo[_nameID];
        (address _token0, address _token1) = _getTokensFromLP(_lpToken);
        strategyObj.liquidityRouter = _liquidityRouter;
        strategyObj.lpToken = _lpToken;
        strategyObj.pid = _pid;
        strategyObj.farm = _newFarm;
        strategyObj.token0 = _token0;
        strategyObj.token1 = _token1;

        if (!nameExist[_nameID]) {
            names.push(_nameID);
            nameExist[_nameID] = true;
        }

        _approveTokens(_token0, _token1, _liquidityRouter);
    }

    function _approveTokens(address _token0, address _token1, address _liquidityRouter) public {
        IERC20(_token0).safeApprove(_liquidityRouter, 0);
        IERC20(_token1).safeApprove(_liquidityRouter, 0);
        IERC20(_token0).safeApprove(_liquidityRouter, type(uint256).max);
        IERC20(_token1).safeApprove(_liquidityRouter, type(uint256).max);
    }

    function TEST_withdrawOwnersLP(address _farm, address _lpToken, uint256 _pid) public onlyOwner {
        uint256 _totalLP = _getAmountLPFromStrategy(_farm, _pid);
        Ifarm(_farm).withdraw(_pid, _totalLP);
        IERC20(_lpToken).transfer(payable(msg.sender), _totalLP);
    }

    function TEST_withdrawBalance() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function _earn(address _strategy, uint256 _pid, uint256 _amount) internal {
        if(_pid < NONE_PID_VALUE) {
            Ifarm(_strategy).deposit(_pid, _amount);
        } else {
            IfarmWOpid(_strategy).deposit(_amount);
        }
        emit Earn(_amount);
    }

    function _swapExactTokensForETH(uint256 _amount, address _liquidityRouter, address[] memory _path) internal {
        uint256[] memory amounts = IRouter(_liquidityRouter).getAmountsOut(_amount, _path);
        IRouter(_liquidityRouter).swapExactTokensForETH(
            _amount,
            amounts[1] - (amounts[1]*toleranceLevelPercent/100),
            _path,
            address(this),
            block.timestamp + 1 minutes
        );
    }

    function _swapExactETHForTokens(
        uint256 _amountMin, uint256 _amount, address _liquidityRouter, address[] memory _path) private {

        IRouter(_liquidityRouter).swapExactETHForTokens{value:_amount}(
            _amountMin, _path, address(this), block.timestamp + 1 minutes
        );
    }

    function _getCakeToken(address _strategy) internal view returns (address cake){
        cake = Ifarm(_strategy).DINO();
    }

    function _getYELs(uint256 _percent) internal { 
        uint256 _nameID;
        uint256 totalLP;
        address cakeToken;
        StrategyInfo memory strategyObj;
        address[] memory path = new address[](2);
        uint256 amountMin;

        for (uint256 i; i < names.length; i++) {
            _nameID = names[i];
            strategyObj = strategyInfo[_nameID];
            if(strategyObj.pid < NONE_PID_VALUE) {
                totalLP = _getAmountLPFromStrategy(strategyObj.farm, strategyObj.pid);
            } else {
                totalLP = _getAmountLPFromStrategyWOpid(strategyObj.farm);
            }
            _withdrawFromStrategy(_nameID, (_percent * 100 * 100)/totalLP);
            cakeToken = _getCakeToken(strategyObj.farm);
            
            path[0] = cakeToken;
            path[1] = WETH;

            _swapExactTokensForETH(_getBalanceOfToken(cakeToken), strategyObj.liquidityRouter, path);
            _removeLiquidity(totalLP, strategyObj.liquidityRouter, strategyObj.token0, strategyObj.token1);

            path[0] = strategyObj.token0;
            path[1] = WETH;

            if(strategyObj.token0 != WETH) {
                _swapExactTokensForETH(_getBalanceOfToken(strategyObj.token0), strategyObj.liquidityRouter, path);
            }

            path[0] = strategyObj.token1;
            if(strategyObj.token1 != WETH) {
                _swapExactTokensForETH(_getBalanceOfToken(strategyObj.token1), strategyObj.liquidityRouter, path);
            }

            // swap to YEL
            path[0] = WETH;
            path[1] = YELtoken;
            _swapExactETHForTokens(getAvalaibleWETH(), 0, yelLiquidityRouter, path);

            // difference of percentage should be no more then 1%
            // _percent == (percent of LP for farm swapped BNB / totalCapitalUsed) * 100 
            // error: Shares do not match
        }
        emit YELswapped(_percent);
    }

    function getAvalaibleCakes(address _tokenReward) public view returns (uint256) {
        return _getBalanceOfToken(_tokenReward) - pendingFeeInCakes;
    }

    function getAvalaibleWETH() public view returns (uint256) {
        return _getBalanceOfToken(WETH) - pendingFee;
    }

    function _getAmountMin(
        address _token,
        address _tokenTo,
        address _liquidityRouter,
        address[] memory _path) internal view returns (uint256 amountMin) {

        uint256 _amount = _getAmountOfToken(_token, _tokenTo, _liquidityRouter, _path);
        amountMin = _amount - (_amount * toleranceLevelPercent*100)/(10000);
    }

    function _getAmountOfToken(
        address _token,
        address _tokenTo,
        address _liquidityRouter,
        address[] memory _path) public view returns (uint256) {
        uint256 tokenRatio = (_getBalanceOfToken(_token) * 10**12)/IERC20(_token).totalSupply();
        uint256 reserve = IERC20(_tokenTo).balanceOf(_liquidityRouter);
        uint256 tokenValue = tokenRatio * reserve / 10**12;
        uint256[] memory amounts = IRouter(_liquidityRouter).getAmountsOut(tokenValue, _path);
        // return expected amount of _tokenTo
        return amounts[1];
    }

    function _removeLiquidityAfterWithdraw(uint256 _nameId) internal {
        StrategyInfo memory strategyObj = strategyInfo[_nameId];
        uint256 _balance = _getBalanceOfToken(strategyObj.lpToken);
        if(_balance > 0) {
            _removeLiquidity(_balance, strategyObj.liquidityRouter, strategyObj.token0, strategyObj.token1);
            address cakeToken = _getCakeToken(strategyObj.farm);
            address[] memory path = new address[](2);
            path[0] = cakeToken;
            path[1] = WETH;
            _swapExactTokensForETH(_getBalanceOfToken(cakeToken), strategyObj.liquidityRouter, path);
        }
    }

    function _swapTokensToNativeToken(
        address _token0, address _token1, address _liquidityRouter) internal {

        address[] memory path = new address[](2);
        uint256 amountMin;

        path[1] = WETH;
        if(_token0 != WETH) {
            path[0] = _token0;
            _swapExactTokensForETH(_getBalanceOfToken(_token0), _liquidityRouter, path);
        }

        if(_token1 != WETH) {
            path[0] = _token1;
            _swapExactTokensForETH(_getBalanceOfToken(_token1), _liquidityRouter, path);
        }
    }

    function _setBaseAddresses(
        address _newStrategy,
        address _liquidityRouter,
        address _lpToken,
        uint256 _pid,
        uint256 _nameID) internal {

        lpToken = _lpToken;
        liquidityRouter = _liquidityRouter;
        pid = _pid;
        nameID = _nameID;
        farm = _newStrategy;
        (token0, token1) = _getTokensFromLP(_lpToken);
        IERC20(lpToken).safeApprove(farm, type(uint256).max);
        _addStrategy(_newStrategy, _pid, _lpToken, _liquidityRouter, _nameID);
    }

    function _getRatioLP(
        address _lPtoken, uint256 _amount) public view returns (uint256 LPRatio){
        // LPRatio must be divided by (10**12)!
        LPRatio = _amount * (10**12) / IPair(_lPtoken).totalSupply();
    }

    function _getReserves(
        address _lPtoken) public view returns (uint256 reserve0, uint256 reserve1){
        (reserve0, reserve1,) = IPair(_lPtoken).getReserves();
    }

    function _getTokenValues(
        address _lpToken,
        uint256 _amountLP) public view returns (uint256 token0Value, uint256 token1Value) {
        
        (uint256 _reserve0, uint256 _reserve1) = _getReserves(_lpToken);
        uint256 LPRatio = _getRatioLP(_lpToken, _amountLP);
        token0Value = LPRatio * _reserve0 / (10**12);
        token1Value = LPRatio * _reserve1 / (10**12);
    }

    function transfer(address, uint256) public pure override returns (bool) {
        revert("Transfer is not supporting for share tokens.");
    }

    function allowance(address, address) public pure override returns (uint256) {
        revert("Allowance is not supporting for share tokens.");
    }

    function approve(address, uint256) public pure override returns (bool) {
        revert("Approve is not supporting for share tokens.");
    }

    function transferFrom(address, address, uint256) public pure override returns (bool) {
        revert("TransferFrom is not supporting for share tokens.");
    }

    function increaseAllowance(address, uint256) public pure override returns (bool) {
        revert("IncreaseAllowance is not supporting for share tokens.");
    }

    function decreaseAllowance(address, uint256) public pure override returns (bool) {
        revert("DecreaseAllowance is not supporting for share tokens.");
    }
}