const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Adding ETH to LayerZero contract...");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // LayerZero contract address
  const layerZeroAddress = "0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40";
  
  // Connect to LayerZero contract
  const layerZeroContract = await ethers.getContractAt("LayerZeroLending", layerZeroAddress);
  
  console.log("🔗 LayerZero contract:", layerZeroAddress);
  console.log("👑 Contract owner:", await layerZeroContract.owner());
  
  // Add ETH as supported asset
  console.log("\n💰 Adding ETH as supported asset...");
  
  try {
    const tx = await layerZeroContract.addSupportedAsset(
      "0x0000000000000000000000000000000000000000", // ETH address (zero address)
      "0x0000000000000000000000000000000000000000", // No synthetic token for ETH
      18, // decimals
      ethers.parseEther("0.75") // 75% LTV
    );
    
    console.log("📝 Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    await tx.wait();
    console.log("✅ ETH successfully added as supported asset!");
    
    // Verify the asset was added
    console.log("\n🔍 Verifying asset configuration...");
    const assetInfo = await layerZeroContract.supportedAssets("0x0000000000000000000000000000000000000000");
    console.log("Asset info:", {
      token: assetInfo.token,
      synthToken: assetInfo.synthToken,
      decimals: assetInfo.decimals.toString(),
      ltv: ethers.formatEther(assetInfo.ltv),
      isActive: assetInfo.isActive
    });
    
  } catch (error) {
    console.error("❌ Failed to add ETH:", error.message);
    
    // Check if ETH is already added
    try {
      const assetInfo = await layerZeroContract.supportedAssets("0x0000000000000000000000000000000000000000");
      if (assetInfo.isActive) {
        console.log("ℹ️ ETH is already configured as a supported asset");
        console.log("Asset info:", {
          token: assetInfo.token,
          synthToken: assetInfo.synthToken,
          decimals: assetInfo.decimals.toString(),
          ltv: ethers.formatEther(assetInfo.ltv),
          isActive: assetInfo.isActive
        });
      }
    } catch (checkError) {
      console.error("❌ Error checking asset:", checkError.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 
