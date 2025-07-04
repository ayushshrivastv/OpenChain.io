import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "dotenv/config";
import { ethers } from "ethers"; // Import ethers directly

// Define the deployment and configuration task
task("deploy-and-configure", "Deploys and configures the LayerZeroLending contract")
  .addParam("privateKey", "The private key of the deployer account")
  .setAction(async (taskArgs, hre) => { // Use hre (Hardhat Runtime Environment)
    const { privateKey } = taskArgs;

    console.log("🚀 Deploying and configuring LayerZeroLending contract...");

    // Use a reliable RPC endpoint with the provided API key
    const alchemyApiKey = "BoCIb0ZnDxjtMlAjT63Zp4w5oLlpytye";
    const provider = new hre.ethers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`);
    const deployer = new hre.ethers.Wallet(privateKey, provider);

    console.log(`👤 Deploying contracts with the account: ${deployer.address}`);

    const balance = await provider.getBalance(deployer.address);
    console.log(`💰 Account balance: ${hre.ethers.formatEther(balance)} ETH`);

    if (balance < hre.ethers.parseEther("0.05")) {
      console.error("❌ Error: Insufficient balance for deployment. Please fund the deployer account.");
      return;
    }

    // Contract Addresses (with checksum correction using imported ethers)
    const lzEndpoint = "0x6EDCE65403992e310A62460808c4b910D972f10f"; // CORRECT Sepolia Endpoint
    
    // Deploy the contract
    const LayerZeroLending = await hre.ethers.getContractFactory("LayerZeroLending", deployer);
    const lendingContract = await LayerZeroLending.deploy(
        lzEndpoint, 
        deployer.address,
        { gasLimit: 5000000 } // Explicitly set gas limit
    );
    await lendingContract.waitForDeployment();
    const contractAddress = await lendingContract.getAddress();

    console.log(`✅ LayerZeroLending deployed to: ${contractAddress}`);

    // --- Configuration ---
    console.log("🔧 Configuring supported asset (ETH)...");

    const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
    const ETH_PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Pre-checksummed Chainlink ETH/USD on Sepolia
    const SYNTH_ADDRESS = "0x0000000000000000000000000000000000000000"; // Placeholder for now

    const tx = await lendingContract.addSupportedAsset(
      ETH_ADDRESS,
      SYNTH_ADDRESS,
      ETH_PRICE_FEED,
      18, // Decimals
      7500 // 75% LTV (7500 / 10000)
    );

    console.log("⏳ Waiting for asset configuration transaction to be mined...");
    await tx.wait();
    console.log("✅ ETH configured as a supported asset.");
    console.log(`Transaction hash: ${tx.hash}`);

    // --- Verification ---
    console.log("🔍 Verifying configuration...");
    const assetConfig = await lendingContract.supportedAssets(ETH_ADDRESS);

    console.log("Asset Config for ETH:", {
      token: assetConfig.token,
      synthToken: assetConfig.synthToken,
      priceFeed: assetConfig.priceFeed,
      decimals: assetConfig.decimals.toString(),
      ltv: assetConfig.ltv.toString(),
      isActive: assetConfig.isActive,
    });

    if (assetConfig.priceFeed.toLowerCase() === ETH_PRICE_FEED.toLowerCase() && assetConfig.isActive) {
      console.log("🎉 Configuration successful and verified!");
    } else {
      console.error("❌ Configuration verification failed!");
    }

    console.log(`\n\n✅ Deployment successful! New contract address: ${contractAddress}`);
    console.log("Please update this address in your frontend configuration.");
  });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: "https://ethereum-sepolia.publicnode.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    mumbai: {
      url: process.env.MUMBAI_RPC_URL || "https://polygon-mumbai.gateway.tenderly.co",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
};

export default config;
