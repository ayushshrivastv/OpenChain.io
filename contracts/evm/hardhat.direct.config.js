require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");

// Your actual credentials - replace these with your real values
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "YOUR_PRIVATE_KEY_WITHOUT_0x";

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 2000,
      },
    },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
      gasPrice: 20000000000, // 20 gwei
      timeout: 60000, // 60 seconds
    },
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
}; 
