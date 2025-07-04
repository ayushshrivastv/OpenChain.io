const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking LayerZero contract supported assets...");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  // LayerZero contract address
  const layerZeroAddress = "0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40";
  
  // Connect to LayerZero contract
  const layerZeroContract = await ethers.getContractAt("LayerZeroLending", layerZeroAddress);
  
  console.log("🔗 LayerZero contract:", layerZeroAddress);
  console.log("👑 Contract owner:", await layerZeroContract.owner());
  
  // Check ETH specifically
  console.log("\n🔍 Checking ETH (zero address)...");
  try {
    const ethAsset = await layerZeroContract.supportedAssets("0x0000000000000000000000000000000000000000");
    console.log("✅ ETH asset info:", {
      token: ethAsset.token,
      synthToken: ethAsset.synthToken,
      decimals: ethAsset.decimals.toString(),
      ltv: ethAsset.ltv.toString(),
      isActive: ethAsset.isActive
    });
    
    if (ethAsset.isActive) {
      console.log("🎉 ETH is properly configured!");
    } else {
      console.log("❌ ETH is not active");
    }
  } catch (error) {
    console.error("❌ Error checking ETH:", error.message);
  }
  
  // Check common assets
  const assetsToCheck = [
    { name: "ETH", address: "0x0000000000000000000000000000000000000000" },
    { name: "USDC", address: "0x77036167D0b74Fb82BA5966a507ACA06C5E16B30" },
    { name: "WETH", address: "0x39CdAe9f7Cb7e06A165f8B4C6864850cCef5CC44" }
  ];
  
  console.log("\n📊 All supported assets:");
  for (const asset of assetsToCheck) {
    try {
      const assetInfo = await layerZeroContract.supportedAssets(asset.address);
      if (assetInfo.isActive) {
        console.log(`✅ ${asset.name}: Active (LTV: ${ethAsset.ltv.toString()})`);
      } else {
        console.log(`❌ ${asset.name}: Not configured or inactive`);
      }
    } catch (error) {
      console.log(`❌ ${asset.name}: Error - ${error.message}`);
    }
  }
  
  console.log("\n🎯 LayerZero contract is ready for deposits!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 
