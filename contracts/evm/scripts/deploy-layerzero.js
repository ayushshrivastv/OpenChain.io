const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// LayerZero Endpoint Addresses (Testnet)
const LZ_ENDPOINTS = {
  sepolia: "0x6EDCE65403992e310A62460808c4b910D972f10f", 
  mumbai: "0x6EDCE65403992e310A62460808c4b910D372ea03",
  // Add other testnet endpoints as needed
};

async function main() {
  console.log("🚀 DEPLOYING [LayerZero] CrossChain.io Protocol...");
  console.log("==================================================");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  const chainId = Number(network.chainId);

  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("🌐 Network:", networkName, `(Chain ID: ${chainId})`);

  const lzEndpoint = LZ_ENDPOINTS[networkName];
  if (!lzEndpoint) {
    throw new Error(`LayerZero endpoint not found for network: ${networkName}`);
  }
  console.log("LZ Endpoint:", lzEndpoint);

  console.log("\nDeploying LayerZeroLending contract...");
  const LayerZeroLending = await ethers.getContractFactory("LayerZeroLending");
  const lendingPool = await LayerZeroLending.deploy(lzEndpoint, deployer.address);
  await lendingPool.waitForDeployment();
  const lendingPoolAddress = await lendingPool.getAddress();
  console.log("✅ LayerZeroLending deployed to:", lendingPoolAddress);

  console.log("\nDeploying SyntheticAsset (sUSDC)...");
  const SyntheticAsset = await ethers.getContractFactory("SyntheticAsset");
  const syntheticUSDC = await SyntheticAsset.deploy("Synthetic USDC", "sUSDC");
  await syntheticUSDC.waitForDeployment();
  const syntheticUSDCAddress = await syntheticUSDC.getAddress();
  console.log("✅ Synthetic USDC (sUSDC) deployed to:", syntheticUSDCAddress);

  // Set the lending pool as the authorized minter
  console.log("Setting lending pool as authorized minter...");
  const setPoolTx = await syntheticUSDC.setPool(lendingPoolAddress);
  await setPoolTx.wait();
  console.log("✅ Lending pool set as authorized minter");

  console.log("\nConfiguring supported assets in LendingPool...");
  const ethPriceFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // ETH/USD on Sepolia

  // Add ETH as a supported asset
  let tx = await lendingPool.addSupportedAsset(
    "0x0000000000000000000000000000000000000000", // Using address(0) for native ETH
    syntheticUSDCAddress, // Using sUSDC as synthetic representation for borrowing
    ethPriceFeed,
    18, // Decimals for ETH
    7500 // 75% LTV (using 2 decimals for precision, e.g., 75.00%)
  );
  await tx.wait();
  console.log("-> Added ETH as a supported asset.");

  console.log("\n🎉 Deployment and configuration complete!");

  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId,
    deployer: deployer.address,
    lendingPool: lendingPoolAddress,
    syntheticUSDC: syntheticUSDCAddress,
    timestamp: new Date().toISOString(),
  };

  const dir = path.join(__dirname, `../deployments`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, `layerzero-${networkName}-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`\nDeployment details saved to: ${filePath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ DEPLOYMENT FAILED:", error);
    process.exit(1);
  });
