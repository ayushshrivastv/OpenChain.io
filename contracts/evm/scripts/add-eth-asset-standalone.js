const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("🔧 Adding ETH as a supported asset...");
  
  const DEPLOYED_CONTRACTS = {
    lendingPool: "0x473AC85625b7f9F18eA21d2250ea19Ded1093a99",
    chainlinkPriceFeed: "0x2E38242Ff1FDa1783fdA682c24A3f409b5c8163f", 
    synthUSDC: "0x77036167D0b74Fb82BA5966a507ACA06C5E16B30",
    synthWETH: "0x39CdAe9f7Cb7e06A165f8B4C6864850cCef5CC44"
  };

  // Multiple RPC endpoints to try
  const rpcEndpoints = [
    "https://sepolia.infura.io/v3/8d9e3a28a3954e8cb4b7de896bc1a3a5",
    "https://eth-sepolia.g.alchemy.com/v2/OHPHwfhaxdCKciIpApqKF6hUx2dVcMzJ",
    "https://sepolia.gateway.tenderly.co",
    "https://rpc.sepolia.ethpandaops.io"
  ];
  
  let provider;
  let deployer;
  
  // Try different RPC endpoints
  for (const rpcUrl of rpcEndpoints) {
    try {
      console.log(`🔗 Trying RPC: ${rpcUrl.substring(0, 50)}...`);
      provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Test the connection
      await provider.getNetwork();
      console.log("✅ RPC connection successful");
      break;
    } catch (error) {
      console.log(`❌ RPC failed: ${error.message}`);
      continue;
    }
  }
  
  if (!provider) {
    throw new Error("❌ Could not connect to any RPC endpoint");
  }
  
  // Get the signer from private key if available
  const privateKey = process.env.PRIVATE_KEY || process.env.SEPOLIA_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("❌ PRIVATE_KEY not found in environment variables");
  }
  
  deployer = new ethers.Wallet(privateKey, provider);
  console.log(`👤 Deployer: ${deployer.address}`);
  
  const balance = await provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  // Minimal ABI for the functions we need
  const lendingPoolABI = [
    "function addSupportedAsset(address token, address priceFeed, address synthToken, uint256 ltv, uint256 liquidationThreshold, bool canBeBorrowed, bool canBeCollateral) external",
    "function supportedAssets(address) external view returns (address token, address priceFeed, address synthToken, uint256 decimals, uint256 ltv, uint256 liquidationThreshold, bool isActive, bool canBeBorrowed, bool canBeCollateral)",
    "function owner() external view returns (address)"
  ];

  // Connect to the LendingPool contract
  const lendingPool = new ethers.Contract(
    DEPLOYED_CONTRACTS.lendingPool,
    lendingPoolABI,
    deployer
  );
  
  // Chainlink price feed for ETH/USD on Sepolia
  const ETH_USD_PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  
  try {
    // Check if we are the owner
    const owner = await lendingPool.owner();
    console.log(`👑 Contract Owner: ${owner}`);
    console.log(`🔑 Deployer: ${deployer.address}`);
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      throw new Error(`❌ Only the contract owner can add assets. Owner: ${owner}, You: ${deployer.address}`);
    }
    
    // Check if ETH is already configured
    try {
      const existingAsset = await lendingPool.supportedAssets("0x0000000000000000000000000000000000000000");
      if (existingAsset.isActive) {
        console.log("✅ ETH is already configured as a supported asset");
        console.log("\n📊 Current ETH Asset Info:");
        console.log(`  - Token: ${existingAsset.token}`);
        console.log(`  - Price Feed: ${existingAsset.priceFeed}`);
        console.log(`  - Synthetic Token: ${existingAsset.synthToken}`);
        console.log(`  - LTV: ${ethers.formatEther(existingAsset.ltv)}%`);
        console.log(`  - Liquidation Threshold: ${ethers.formatEther(existingAsset.liquidationThreshold)}%`);
        console.log(`  - Is Active: ${existingAsset.isActive}`);
        console.log(`  - Can Be Borrowed: ${existingAsset.canBeBorrowed}`);
        console.log(`  - Can Be Collateral: ${existingAsset.canBeCollateral}`);
        return;
      }
    } catch (error) {
      console.log("ℹ️  ETH not yet configured, proceeding to add it...");
    }
    
    console.log("\n💰 Adding ETH as supported asset...");
    
    // Add ETH (zero address) as a supported asset
    const addEthAssetTx = await lendingPool.addSupportedAsset(
      "0x0000000000000000000000000000000000000000", // ETH token address (zero address)
      ETH_USD_PRICE_FEED,                              // ETH/USD price feed
      DEPLOYED_CONTRACTS.synthWETH,                    // Use WETH as synthetic token
      ethers.parseEther("0.75"),                       // 75% LTV
      ethers.parseEther("0.80"),                       // 80% liquidation threshold
      true,                                            // can be borrowed
      true                                             // can be collateral
    );
    
    console.log(`📋 Transaction hash: ${addEthAssetTx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await addEthAssetTx.wait();
    console.log(`✅ ETH added as supported asset! Gas used: ${receipt.gasUsed.toString()}`);
    
    // Verify the asset was added
    const assetInfo = await lendingPool.supportedAssets("0x0000000000000000000000000000000000000000");
    console.log("\n📊 Asset Info:");
    console.log(`  - Token: ${assetInfo.token}`);
    console.log(`  - Price Feed: ${assetInfo.priceFeed}`);
    console.log(`  - Synthetic Token: ${assetInfo.synthToken}`);
    console.log(`  - LTV: ${ethers.formatEther(assetInfo.ltv)}%`);
    console.log(`  - Liquidation Threshold: ${ethers.formatEther(assetInfo.liquidationThreshold)}%`);
    console.log(`  - Is Active: ${assetInfo.isActive}`);
    console.log(`  - Can Be Borrowed: ${assetInfo.canBeBorrowed}`);
    console.log(`  - Can Be Collateral: ${assetInfo.canBeCollateral}`);
    
    console.log("\n🎉 ETH is now supported for deposits!");
    
  } catch (error) {
    console.error("❌ Failed to add ETH as supported asset:", error);
    
    // More specific error handling
    if (error.message.includes("revert")) {
      console.log("💡 This might be a contract-level revert. Common causes:");
      console.log("  - Asset already exists");
      console.log("  - Invalid parameters");
      console.log("  - Access control restrictions");
    }
    
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n✅ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error.message);
    process.exit(1);
  }); 
