const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");

// Network configurations
const CCIP_ROUTERS = {
  sepolia: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
  mumbai: "0x1035CabC275068e0F4b745A29CEDf38E13aF41b1",
};

const LINK_TOKENS = {
  sepolia: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  mumbai: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
};

const CHAIN_SELECTORS = {
  sepolia: "16015286601757825753",
  mumbai: "12532609583862916517",
};

async function main() {
  console.log("🚀 Starting DIRECT CrossChain.io Deployment...");
  console.log("============================================================");
  
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  const chainId = await deployer.provider.getNetwork().then(n => Number(n.chainId));
  
  console.log("📡 Network:", networkName);
  console.log("🔗 Chain ID:", chainId);
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Get network-specific configuration
  const ccipRouter = CCIP_ROUTERS[networkName];
  const linkToken = LINK_TOKENS[networkName];
  const chainSelector = CHAIN_SELECTORS[networkName];
  
  if (!ccipRouter || !linkToken) {
    throw new Error(`Network ${networkName} not supported for CCIP deployment`);
  }
  
  console.log("🔗 CCIP Router:", ccipRouter);
  console.log("🔗 LINK Token:", linkToken);
  console.log("🔗 Chain Selector:", chainSelector);
  
  const deploymentInfo = {
    network: networkName,
    chainId,
    deployer: deployer.address,
    contracts: {},
    ccipConfig: {
      router: ccipRouter,
      linkToken: linkToken,
      chainSelector: chainSelector,
    },
    deploymentTimestamp: Date.now(),
    transactionHashes: [],
  };
  
  try {
    // First deploy ChainlinkPriceFeed
    console.log("\n📊 Deploying ChainlinkPriceFeed...");
    const ChainlinkPriceFeed = await ethers.getContractFactory("ChainlinkPriceFeed");
    const priceFeed = await ChainlinkPriceFeed.deploy();
    await priceFeed.waitForDeployment();
    const priceFeedAddress = await priceFeed.getAddress();
    deploymentInfo.contracts.priceFeed = priceFeedAddress;
    console.log("✅ ChainlinkPriceFeed deployed to:", priceFeedAddress);

    // Deploy LayerZero contract with correct parameters
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
    
    // Test the deposit function
    console.log("\n💰 Testing deposit function...");
    const depositAmount = ethers.parseEther("0.1");
    console.log("Depositing", ethers.formatEther(depositAmount), "ETH");
    
    // First add ETH as a supported asset
    console.log("Adding ETH as supported asset...");
    await layerZeroLending.addSupportedAsset(
      ethers.ZeroAddress, // ETH address
      ethers.ZeroAddress, // synthetic token (placeholder)
      18, // decimals
      ethers.parseEther("75") // 75% LTV
    );
    console.log("✅ ETH added as supported asset");
    
    const tx = await layerZeroLending.deposit(ethers.ZeroAddress, depositAmount, { value: depositAmount });
    await tx.wait();
    console.log("✅ Deposit successful! Transaction hash:", tx.hash);
    
    // Check user position
    const position = await layerZeroLending.getUserPosition(deployer.address);
    console.log("✅ User position:");
    console.log("  - Total Collateral Value:", ethers.formatEther(position.totalCollateralValue), "USD");
    console.log("  - Total Borrow Value:", ethers.formatEther(position.totalBorrowValue), "USD");
    console.log("  - Health Factor:", ethers.formatEther(position.healthFactor));
    
    console.log("\n🎉 Deployment Complete!");
    console.log("============================================================");
    console.log("📋 Contract Address:");
    console.log("============================================================");
    console.log(`🌐 LayerZeroLending: ${layerZeroLendingAddress}`);
    console.log("============================================================");
    
    // Save deployment info
    const deploymentFile = `deployments/layerzero-${networkName}-${Date.now()}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`📄 Deployment info saved to: ${deploymentFile}`);
    
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
 