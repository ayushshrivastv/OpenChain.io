const { ethers, network } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  
  console.log("========================================");
  console.log("Running on network:", networkName);
  console.log("Deployer address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  console.log("========================================");

  if (deployer.address.toLowerCase() === "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266") {
    console.error("❌ ERROR: Using default Hardhat account. Your .env file is not being loaded correctly.");
  } else {
    console.log("✅ SUCCESS: .env file appears to be loaded correctly!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 
