const { ethers } = require("ethers");

async function main() {
  console.log("🔍 Checking currently supported assets...");
  
  const LENDING_POOL_ADDRESS = "0x473AC85625b7f9F18eA21d2250ea19Ded1093a99";
  
  // Use a public RPC endpoint
  const provider = new ethers.JsonRpcProvider("https://sepolia.gateway.tenderly.co");
  
  // Minimal ABI for reading supported assets
  const lendingPoolABI = [
    "function getSupportedAssets() external view returns (address[])",
    "function supportedAssets(address) external view returns (address token, address priceFeed, address synthToken, uint256 decimals, uint256 ltv, uint256 liquidationThreshold, bool isActive, bool canBeBorrowed, bool canBeCollateral)",
    "function owner() external view returns (address)"
  ];

  const lendingPool = new ethers.Contract(
    LENDING_POOL_ADDRESS,
    lendingPoolABI,
    provider
  );
  
  try {
    console.log("📄 Contract Owner:", await lendingPool.owner());
    
    // Get list of supported assets
    const supportedAssets = await lendingPool.getSupportedAssets();
    console.log(`\n📊 Found ${supportedAssets.length} supported assets:`);
    
    for (let i = 0; i < supportedAssets.length; i++) {
      const assetAddress = supportedAssets[i];
      console.log(`\n🪙 Asset ${i + 1}: ${assetAddress}`);
      
      try {
        const assetInfo = await lendingPool.supportedAssets(assetAddress);
        console.log(`  - Token: ${assetInfo.token}`);
        console.log(`  - Price Feed: ${assetInfo.priceFeed}`);
        console.log(`  - Synthetic Token: ${assetInfo.synthToken}`);
        console.log(`  - Decimals: ${assetInfo.decimals.toString()}`);
        console.log(`  - LTV: ${ethers.formatEther(assetInfo.ltv)}%`);
        console.log(`  - Liquidation Threshold: ${ethers.formatEther(assetInfo.liquidationThreshold)}%`);
        console.log(`  - Is Active: ${assetInfo.isActive}`);
        console.log(`  - Can Be Borrowed: ${assetInfo.canBeBorrowed}`);
        console.log(`  - Can Be Collateral: ${assetInfo.canBeCollateral}`);
        
        // Check if this is ETH (zero address)
        if (assetAddress === "0x0000000000000000000000000000000000000000") {
          console.log("  🎉 This is ETH (native token)");
        }
      } catch (error) {
        console.log(`  ❌ Failed to get asset info: ${error.message}`);
      }
    }
    
    // Check specifically for ETH (zero address)
    console.log(`\n🔍 Checking specifically for ETH (zero address)...`);
    try {
      const ethAssetInfo = await lendingPool.supportedAssets("0x0000000000000000000000000000000000000000");
      if (ethAssetInfo.isActive) {
        console.log("✅ ETH is already supported!");
        console.log(`  - LTV: ${ethers.formatEther(ethAssetInfo.ltv)}%`);
        console.log(`  - Can Be Collateral: ${ethAssetInfo.canBeCollateral}`);
      } else {
        console.log("❌ ETH is not configured as a supported asset");
      }
    } catch (error) {
      console.log("❌ ETH is not configured as a supported asset");
    }
    
  } catch (error) {
    console.error("❌ Failed to check supported assets:", error);
  }
}

main()
  .then(() => {
    console.log("\n✅ Asset check completed!");
    console.log("\n💡 TO FIX THE TRANSACTION ERROR:");
    console.log("1. You need to add ETH as a supported asset using the contract owner's private key");
    console.log("2. The contract owner is: 0x31A09F533045988A6e7a487cc6BD50F9285BCBd1");
    console.log("3. Run the add-eth-asset script with the correct PRIVATE_KEY in your .env file");
    console.log("4. Or use the LendingPool's addSupportedAsset function directly");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error.message);
    process.exit(1);
  }); 
