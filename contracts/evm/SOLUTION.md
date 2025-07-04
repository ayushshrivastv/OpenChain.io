# Fix for ETH Deposit Transaction Failure

## Problem
Transaction failing with "execution reverted for an unknown reason" when trying to deposit ETH.

**Root Cause**: ETH (zero address `0x0000000000000000000000000000000000000000`) is not configured as a supported asset in the LendingPool contract.

## Solution

### Option 1: Using the Script (Recommended)

1. **Update your `.env` file** with the correct private key:
   ```bash
   # In contracts/evm/.env
   PRIVATE_KEY=your_actual_private_key_that_corresponds_to_0x31A09F533045988A6e7a487cc6BD50F9285BCBd1
   ```

2. **Run the ETH asset addition script**:
   ```bash
   cd contracts/evm
   node scripts/add-eth-asset-standalone.js
   ```

### Option 2: Manual Contract Call

Call the `addSupportedAsset` function on your LendingPool contract with these parameters:

```solidity
lendingPool.addSupportedAsset(
    "0x0000000000000000000000000000000000000000", // ETH token address (zero address)
    "0x694AA1769357215DE4FAC081bf1f309aDC325306", // ETH/USD price feed on Sepolia
    "0x39CdAe9f7Cb7e06A165f8B4C6864850cCef5CC44", // Use WETH as synthetic token
    ethers.parseEther("0.75"),                       // 75% LTV
    ethers.parseEther("0.80"),                       // 80% liquidation threshold
    true,                                            // can be borrowed
    true                                             // can be collateral
);
```

### Option 3: Using Cast (if you have Foundry)

```bash
cast send 0x473AC85625b7f9F18eA21d2250ea19Ded1093a99 \
  "addSupportedAsset(address,address,address,uint256,uint256,bool,bool)" \
  0x0000000000000000000000000000000000000000 \
  0x694AA1769357215DE4FAC081bf1f309aDC325306 \
  0x39CdAe9f7Cb7e06A165f8B4C6864850cCef5CC44 \
  750000000000000000 \
  800000000000000000 \
  true \
  true \
  --private-key $PRIVATE_KEY \
  --rpc-url https://sepolia.gateway.tenderly.co
```

## Contract Details

- **LendingPool**: `0x473AC85625b7f9F18eA21d2250ea19Ded1093a99`
- **Contract Owner**: `0x31A09F533045988A6e7a487cc6BD50F9285BCBd1`
- **Current Assets**: 2 (Synthetic USDC, Synthetic WETH)
- **Missing**: ETH (zero address)

## After Adding ETH

Your deposit transactions for ETH should work correctly. The transaction that's currently failing:
- **Function**: `deposit(address,uint256)`
- **Asset**: `0x0000000000000000000000000000000000000000` (ETH)
- **Amount**: `0x016345785d8a0000` (0.1 ETH)

Will succeed once ETH is added as a supported asset.

## Verification

After adding ETH, you can verify it worked by checking:
```javascript
const assetInfo = await lendingPool.supportedAssets("0x0000000000000000000000000000000000000000");
console.log("ETH is active:", assetInfo.isActive); // Should be true
``` 
