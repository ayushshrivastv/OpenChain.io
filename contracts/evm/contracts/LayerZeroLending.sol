// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol"; // Import Chainlink interface
import "@openzeppelin/contracts/access/Ownable.sol"; // Explicitly import Ownable
import "./SyntheticAsset.sol";

contract LayerZeroLending is OApp, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Protocol parameters
    uint256 public constant LIQUIDATION_THRESHOLD = 80e18; // 80%
    uint256 public constant MIN_HEALTH_FACTOR = 1e18; // 1.0
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_BORROW_RATE = 75e18; // 75%

    // LayerZero chain endpoints
    uint32 public constant SEPOLIA_EID = 40161;
    uint32 public constant SOLANA_EID = 40168;

    // Remove the immutable priceFeed, as it's now per-asset
    // ChainlinkPriceFeed public immutable priceFeed;

    // Supported chains and processed messages
    mapping(uint32 => bool) public supportedChains;
    mapping(bytes32 => bool) public processedMessages;

    // Asset configuration
    struct Asset {
        address token;
        address synthToken;
        uint256 decimals;
        uint256 ltv; // Loan-to-value ratio
        bool isActive;
        address priceFeed; // NEW: Chainlink price feed for this asset
    }
    mapping(address => Asset) public supportedAssets;
    address[] public assetsList;

    // User positions
    struct UserPosition {
        mapping(address => uint256) collateralBalance;
        mapping(address => uint256) borrowBalance;
        uint256 totalCollateralValue;
        uint256 totalBorrowValue;
        uint256 healthFactor;
    }
    mapping(address => UserPosition) internal userPositions;

    // Cross-chain message structure
    struct CrossChainMessage {
        address user;
        string action; // "borrow", "repay"
        address asset;
        uint256 amount;
        uint32 srcEid;
        uint32 dstEid;
        address receiver;
        uint256 nonce;
    }

    // Events
    event Deposit(address indexed user, address indexed asset, uint256 amount);
    event Borrow(address indexed user, address indexed asset, uint256 amount, uint32 destEid);
    event Repay(address indexed user, address indexed asset, uint256 amount);
    event LayerZeroMessageSent(bytes32 indexed guid, address indexed user, string action);
    event LayerZeroMessageReceived(bytes32 indexed guid, address indexed user, string action);

    // Errors
    error InsufficientCollateral();
    error AssetNotSupported();
    error HealthFactorTooLow();
    error InvalidAmount();
    error ChainNotSupported();
    error MessageAlreadyProcessed();

    modifier validAsset(address asset) {
        if (!supportedAssets[asset].isActive) revert AssetNotSupported();
        _;
    }

    modifier validChain(uint32 eid) {
        if (!supportedChains[eid]) revert ChainNotSupported();
        _;
    }

    constructor(
        address _endpoint,
        address _owner
    ) OApp(_endpoint, _owner) Ownable(_owner) { // Restoring Ownable constructor call
        // Setup supported chains
        supportedChains[SEPOLIA_EID] = true;
        supportedChains[SOLANA_EID] = true;
    }

    // ==================== DEPOSIT FUNCTIONS ====================

    function deposit(
        address asset,
        uint256 amount
    ) external payable nonReentrant whenNotPaused validAsset(asset) {
        if (asset == address(0)) {
            // Native ETH deposit
            require(msg.value == amount, "Incorrect ETH amount sent");
        } else {
            // ERC20 deposit
            require(msg.value == 0, "ETH sent with ERC20 deposit");
            if (amount == 0) revert InvalidAmount();
            IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        }

        userPositions[msg.sender].collateralBalance[asset] += amount;
        _updateUserPosition(msg.sender);

        emit Deposit(msg.sender, asset, amount);
    }

    // ==================== CROSS-CHAIN BORROW ====================

        function borrowCrossChain(
        address asset,
        uint256 amount,
        uint32 destEid,
        address receiver,
        bytes calldata _options
    ) external payable nonReentrant whenNotPaused validAsset(asset) validChain(destEid) {
        if (amount == 0) revert InvalidAmount();
        if (receiver == address(0)) receiver = msg.sender;

        // Check collateral and validate borrow
        _validateBorrow(msg.sender, asset, amount);

        // Send LayerZero message
        bytes32 guid = _sendCrossChainMessage(asset, amount, destEid, receiver, _options);

        emit Borrow(msg.sender, asset, amount, destEid);
        emit LayerZeroMessageSent(guid, msg.sender, "borrow");
    }

    function _validateBorrow(address user, address asset, uint256 amount) internal {
        uint256 collateralValue = _getUserCollateralValue(user);
        uint256 borrowValue = _getAssetValue(asset, amount);
        uint256 totalBorrowValue = userPositions[user].totalBorrowValue + borrowValue;

        if (totalBorrowValue * PRECISION > collateralValue * MAX_BORROW_RATE) {
            revert InsufficientCollateral();
        }

        // Update user position
        userPositions[user].borrowBalance[asset] += amount;
        userPositions[user].totalBorrowValue += borrowValue;
        _updateUserPosition(user);

        if (userPositions[user].healthFactor < MIN_HEALTH_FACTOR) {
            revert HealthFactorTooLow();
        }
    }

    function _sendCrossChainMessage(
        address asset,
        uint256 amount,
        uint32 destEid,
        address receiver,
        bytes calldata _options
    ) internal returns (bytes32) {
        CrossChainMessage memory message = CrossChainMessage({
            user: msg.sender,
            action: "borrow",
            asset: asset,
            amount: amount,
            srcEid: uint32(block.chainid),
            dstEid: destEid,
            receiver: receiver,
            nonce: block.timestamp
        });

        bytes memory payload = abi.encode(message);
        MessagingFee memory fee = _quote(destEid, payload, _options, false);

        MessagingReceipt memory receipt = _lzSend(
            destEid,
            payload,
            _options,
            fee,
            payable(msg.sender)
        );

        return receipt.guid;
    }

    // ==================== LAYERZERO MESSAGE HANDLING ====================

    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        if (processedMessages[_guid]) revert MessageAlreadyProcessed();
        processedMessages[_guid] = true;

        CrossChainMessage memory message = abi.decode(_message, (CrossChainMessage));

        if (keccak256(bytes(message.action)) == keccak256(bytes("borrow"))) {
            _processCrossChainBorrow(message, _guid);
        } else if (keccak256(bytes(message.action)) == keccak256(bytes("repay"))) {
            _processCrossChainRepay(message, _guid);
        }

        emit LayerZeroMessageReceived(_guid, message.user, message.action);
    }

    function _processCrossChainBorrow(CrossChainMessage memory message, bytes32 guid) internal {
        // Mint synthetic asset on destination chain
        address synthToken = supportedAssets[message.asset].synthToken;
        if (synthToken != address(0)) {
            SyntheticAsset(synthToken).mint(message.receiver, message.amount);
        }
    }

    function _processCrossChainRepay(CrossChainMessage memory message, bytes32 guid) internal {
        // Update user position on source chain
        uint256 borrowBalance = userPositions[message.user].borrowBalance[message.asset];
        uint256 repayAmount = message.amount > borrowBalance ? borrowBalance : message.amount;

        userPositions[message.user].borrowBalance[message.asset] -= repayAmount;
        uint256 repayValue = _getAssetValue(message.asset, repayAmount);
        userPositions[message.user].totalBorrowValue -= repayValue;

        _updateUserPosition(message.user);
    }

    // ==================== PRICE CALCULATION - USING CHAINLINK ====================

    function _getUserCollateralValue(address user) internal view returns (uint256) {
        uint256 totalValue = 0;
        for (uint256 i = 0; i < assetsList.length; i++) {
            address asset = assetsList[i];
            uint256 balance = userPositions[user].collateralBalance[asset];
            if (balance > 0) {
                totalValue += _getAssetValue(asset, balance);
            }
        }
        return totalValue;
    }

    function _getAssetValue(address asset, uint256 amount) internal view returns (uint256) {
        Asset memory assetInfo = supportedAssets[asset];
        require(assetInfo.priceFeed != address(0), "Price feed not configured for asset");

        // Use AggregatorV3Interface interface to get the latest price data
        AggregatorV3Interface priceFeed = AggregatorV3Interface(assetInfo.priceFeed);
        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();

        require(price > 0, "Invalid price from feed");
        uint256 timeSinceUpdate = block.timestamp - updatedAt;
        require(timeSinceUpdate < 3600, "Price feed stale"); // 1 hour stale check

        uint256 priceDecimals = priceFeed.decimals();
        uint256 assetDecimals = assetInfo.decimals;

        // Normalize price to 18 decimals before calculation
        uint256 normalizedPrice = uint256(price) * (10**(18 - priceDecimals));

        return (amount * normalizedPrice) / (10**assetDecimals);
    }

    function _updateUserPosition(address user) internal {
        uint256 collateralValue = _getUserCollateralValue(user);
        uint256 borrowValue = userPositions[user].totalBorrowValue;

        userPositions[user].totalCollateralValue = collateralValue;

        if (borrowValue == 0) {
            userPositions[user].healthFactor = type(uint256).max;
        } else {
            userPositions[user].healthFactor = (collateralValue * LIQUIDATION_THRESHOLD) / (borrowValue * PRECISION);
        }
    }

    // ==================== ADMIN FUNCTIONS ====================

    function addSupportedAsset(
        address token,
        address synthToken,
        address priceFeed, // NEW: price feed address
        uint256 decimals,
        uint256 ltv
    ) external onlyOwner {
        supportedAssets[token] = Asset({
            token: token,
            synthToken: synthToken,
            priceFeed: priceFeed, // NEW
            decimals: decimals,
            ltv: ltv,
            isActive: true
        });
        assetsList.push(token);
    }

    function addSupportedChain(uint32 eid) external onlyOwner {
        supportedChains[eid] = true;
    }

    // NEW: Update price feed for an asset
    function updateAssetPriceFeed(
        address asset,
        address newPriceFeed
    ) external onlyOwner validAsset(asset) {
        supportedAssets[asset].priceFeed = newPriceFeed;
    }

    // NEW: Deactivate or reactivate an asset
    function setAssetActive(
        address asset,
        bool isActive
    ) external onlyOwner validAsset(asset) {
        supportedAssets[asset].isActive = isActive;
    }

    // NEW: Update asset decimals/ltv if needed
    function updateAssetConfig(address asset, uint256 decimals, uint256 ltv) external onlyOwner {
        supportedAssets[asset].decimals = decimals;
        supportedAssets[asset].ltv = ltv;
    }

    // ==================== VIEW FUNCTIONS ====================

    function getUserPosition(address user) external view returns (
        uint256 totalCollateralValue,
        uint256 totalBorrowValue,
        uint256 healthFactor
    ) {
        UserPosition storage position = userPositions[user];
        return (
            position.totalCollateralValue,
            position.totalBorrowValue,
            position.healthFactor
        );
    }

    function quoteCrossChainFee(
        uint32 destEid,
        CrossChainMessage memory message,
        bytes memory options
    ) external view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(message);
        return _quote(destEid, payload, options, false);
    }

    // ==================== EMERGENCY FUNCTIONS ====================

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /*
    // This function is now replaced by the logic inside _getAssetValue
    function _getAssetPrice(address asset) internal view returns (int256) {
        Asset memory assetInfo = supportedAssets[asset];
        require(assetInfo.priceFeed != address(0), "Price feed not configured");
        (, int256 price, , uint256 updatedAt, ) = IPriceFeed(
            assetInfo.priceFeed
        ).latestRoundData();

        uint256 timeSinceUpdate = block.timestamp - updatedAt;
        require(timeSinceUpdate < 3600, "Price feed stale"); // 1 hour stale check

        return price;
    }
    */
}
