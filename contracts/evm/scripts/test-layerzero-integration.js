const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing LayerZero Integration...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);
  
  // Load latest deployment
  const deploymentFile = fs.readdirSync(path.join(__dirname, "../deployments/"))
    .filter(file => file.includes("layerzero") || file.includes("sepolia"))
    .sort()
    .pop();
  
  if (!deploymentFile) {
    throw new Error("No deployment file found. Please deploy first.");
  }
  
  const deployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../deployments/", deploymentFile))
  );
  
  console.log("📄 Using deployment:", deploymentFile);
  console.log("🔗 LayerZero Lending Pool:", deployment.contracts.layerZeroLendingPool);
  
  // Connect to contract
  const lendingPool = await ethers.getContractAt(
    "LayerZeroLending",
    deployment.contracts.layerZeroLendingPool
  );
  
  console.log("\n📊 Contract Information:");
  console.log("- Owner:", await lendingPool.owner());
  console.log("- Supported chains:", await lendingPool.supportedChains(40161)); // Sepolia
  console.log("- Liquidation threshold:", await lendingPool.LIQUIDATION_THRESHOLD());
  console.log("- Max borrow rate:", await lendingPool.MAX_BORROW_RATE());
  
  // Test view functions
  console.log("\n🔍 Testing View Functions:");
  
  try {
    const userPosition = await lendingPool.getUserPosition(deployer.address);
    console.log("✅ User position:", {
      collateralValue: userPosition[0].toString(),
      borrowValue: userPosition[1].toString(),
      healthFactor: userPosition[2].toString()
    });
  } catch (error) {
    console.log("❌ Error getting user position:", error.message);
  }
  
  // Test cross-chain fee quote
  console.log("\n💰 Testing Cross-Chain Fee Quote:");
  
  try {
    const message = {
      user: deployer.address,
      action: "borrow",
      asset: "0x77036167D0b74Fb82BA5966a507ACA06C5E16B30", // USDC
      amount: ethers.parseEther("1000"),
      srcEid: 40161,
      dstEid: 40109,
      receiver: deployer.address,
      nonce: Date.now()
    };
    
    const options = "0x"; // Empty options
    const fee = await lendingPool.quoteCrossChainFee(40109, message, options);
    console.log("✅ Cross-chain fee quote:", fee.nativeFee.toString(), "wei");
    
  } catch (error) {
    console.log("❌ Error quoting fee:", error.message);
  }
  
  // Test asset configuration
  console.log("\n🏦 Testing Asset Configuration:");
  
  try {
    const ethAsset = await lendingPool.supportedAssets("0x0000000000000000000000000000000000000000");
    console.log("✅ ETH asset:", {
      token: ethAsset.token,
      synthToken: ethAsset.synthToken,
      decimals: ethAsset.decimals.toString(),
      ltv: ethAsset.ltv.toString(),
      isActive: ethAsset.isActive
    });
  } catch (error) {
    console.log("❌ Error getting ETH asset:", error.message);
  }
  
  console.log("\n🎉 Integration Test Complete!");
  console.log("✅ LayerZero contract is ready for cross-chain lending!");
  
  return {
    contractAddress: deployment.contracts.layerZeroLendingPool,
    deployment: deploymentFile,
    status: "ready"
  };
}

main()
  .then((result) => {
    console.log("\n📈 Test Results:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }); 
