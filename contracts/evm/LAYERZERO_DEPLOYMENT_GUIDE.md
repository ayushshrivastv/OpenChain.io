# LayerZero Testnet Deployment Guide

## Prerequisites

1. **Get Testnet ETH**: Visit [Sepolia Faucet](https://sepoliafaucet.com/) to get testnet ETH
2. **Create `.env` file**:
   ```bash
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
   SEPOLIA_PRIVATE_KEY=your_private_key_here
   ```

## Quick Deploy

1. **Deploy to Sepolia**:
   ```bash
   npx hardhat run scripts/deploy-layerzero.js --network sepolia
   ```

2. **Verify deployment**:
   ```bash
   npx hardhat run scripts/verify-deployment.js --network sepolia
   ```

## What's Deployed

- ✅ **LayerZeroLending.sol** - Main cross-chain lending contract
- ✅ **Chainlink Integration** - Price feeds, VRF, automation
- ✅ **Synthetic Assets** - sUSDC, sWETH for cross-chain borrowing
- ✅ **Feature Flags** - Switch between CCIP and LayerZero

## Test the Integration

After deployment, test with:
```bash
npx hardhat run scripts/test-layerzero-integration.js --network sepolia
```

## Frontend Integration

The deployment automatically updates:
- `src/lib/layerzero-contracts.ts` - Contract addresses
- `src/hooks/useLayerZero.ts` - Ready to use!

## Switch to LayerZero

Set environment variable:
```bash
NEXT_PUBLIC_USE_LAYERZERO=true
```

## Features

- 🔄 **Cross-chain borrowing** - Deposit ETH on Sepolia, borrow USDC on Polygon
- 📊 **Real-time prices** - Chainlink price feeds
- 🎲 **Fair liquidations** - Chainlink VRF for randomness
- ⚡ **Automation** - 24/7 health monitoring
- 🔒 **Security** - Battle-tested with existing CCIP system

## Next Steps

1. Deploy to testnet ✅
2. Test cross-chain transactions
3. Switch feature flag
4. Ready for mainnet! 🚀 
