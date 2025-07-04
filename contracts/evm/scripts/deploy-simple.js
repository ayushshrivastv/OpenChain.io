const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Starting SIMPLE LayerZero Deployment...");
  console.log("============================================================");
  
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  const chainId = await deployer.provider.getNetwork().then(n => Number(n.chainId));
  
  console.log("📡 Network:", networkName);
  console.log("🔗 Chain ID:", chainId);
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  const deploymentInfo = {
    network: networkName,
    chainId,
    deployer: deployer.address,
    contracts: {},
    deploymentTimestamp: Date.now(),
    transactionHashes: [],
  };
  
  try {
    // Deploy ChainlinkPriceFeed
    console.log("\n📊 Deploying ChainlinkPriceFeed...");
    const ChainlinkPriceFeed = await ethers.getContractFactory("ChainlinkPriceFeed");
    const priceFeed = await ChainlinkPriceFeed.deploy();
    await priceFeed.waitForDeployment();
    const priceFeedAddress = await priceFeed.getAddress();
    deploymentInfo.contracts.priceFeed = priceFeedAddress;
    console.log("✅ ChainlinkPriceFeed deployed to:", priceFeedAddress);

    // Deploy LayerZeroLending
    console.log("\n🌐 Deploying LayerZeroLending...");
    const LayerZeroLending = await ethers.getContractFactory("LayerZeroLending");
    
    // LayerZero Sepolia endpoint
    const layerZeroEndpoint = "0x6EDCE65403992e310A62460808c4b910D972f10f";
    
    console.log("Constructor parameters:");
    console.log("  - LayerZero Endpoint:", layerZeroEndpoint);
    console.log("  - Owner:", deployer.address);
    console.log("  - Price Feed:", priceFeedAddress);
    
    const layerZeroLending = await LayerZeroLending.deploy(
      layerZeroEndpoint,
      deployer.address,
      priceFeedAddress
    );
    await layerZeroLending.waitForDeployment();
    const layerZeroLendingAddress = await layerZeroLending.getAddress();
    deploymentInfo.contracts.layerZeroLending = layerZeroLendingAddress;
    console.log("✅ LayerZeroLending deployed to:", layerZeroLendingAddress);
    
    console.log("\n🎉 Deployment Complete!");
    console.log("============================================================");
    console.log("📋 Contract Addresses:");
    console.log("============================================================");
    console.log(`📊 ChainlinkPriceFeed: ${priceFeedAddress}`);
    console.log(`🌐 LayerZeroLending: ${layerZeroLendingAddress}`);
    console.log("============================================================");
    
    // Save deployment info
    const deploymentFile = `deployments/layerzero-simple-${networkName}-${Date.now()}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`📄 Deployment info saved to: ${deploymentFile}`);
    
    // Update frontend contracts
    console.log("\n🔄 Updating frontend contract addresses...");
    const frontendContractsPath = "../../../src/lib/contracts.ts";
    
    try {
      let contractsContent = fs.readFileSync(frontendContractsPath, 'utf8');
      
      // Update LayerZero contract address
      contractsContent = contractsContent.replace(
        /LAYERZERO_LENDING_ADDRESS:\s*"[^"]*"/,
        `LAYERZERO_LENDING_ADDRESS: "${layerZeroLendingAddress}"`
      );
      
      fs.writeFileSync(frontendContractsPath, contractsContent);
      console.log("✅ Frontend contracts updated successfully!");
    } catch (error) {
      console.log("⚠️ Could not update frontend contracts:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 
