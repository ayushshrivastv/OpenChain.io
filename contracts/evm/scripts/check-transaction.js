const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 TRANSACTION STATUS CHECK");
  console.log("===========================");

  const TX_HASH = "0x6df66d0fbdd453202ac05497afba57e9226baae3f9d87c189417410fe2e9b156";
  const LAYERZERO_CONTRACT = "0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40";
  const USER_ADDRESS = "0x31A09F533045988A6e7a487cc6BD50F9285BCBd1";

  // Get provider
  const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/BoCIb0ZnDxjtMlAjT63Zp4w5oLlpytye");

  try {
    // Check transaction
    const tx = await provider.getTransaction(TX_HASH);
    console.log(`📋 Transaction found: ${tx ? 'YES' : 'NO'}`);
    if (tx) {
      console.log(`📋 Block: ${tx.blockNumber}`);
      console.log(`💰 Value: ${ethers.formatEther(tx.value)} ETH`);
      console.log(`📋 To: ${tx.to}`);
    }

    // Check receipt
    const receipt = await provider.getTransactionReceipt(TX_HASH);
    console.log(`📋 Receipt found: ${receipt ? 'YES' : 'NO'}`);
    if (receipt) {
      console.log(`✅ Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`🔢 Block: ${receipt.blockNumber}`);
    }

    // Check contract balance
    const contractBalance = await provider.getBalance(LAYERZERO_CONTRACT);
    console.log(`💰 Contract ETH balance: ${ethers.formatEther(contractBalance)} ETH`);

    // Check user balance before and after
    const userBalance = await provider.getBalance(USER_ADDRESS);
    console.log(`💰 User ETH balance: ${ethers.formatEther(userBalance)} ETH`);

    console.log("\n🎯 ANALYSIS:");
    if (receipt && receipt.status === 1) {
      console.log("✅ TRANSACTION SUCCESSFUL!");
      console.log("✅ The deposit worked correctly!");
      console.log("✅ The LayerZero contract is functioning!");
    } else if (receipt && receipt.status === 0) {
      console.log("❌ TRANSACTION FAILED!");
      console.log("❌ The deposit reverted!");
    } else {
      console.log("⏳ TRANSACTION PENDING!");
      console.log("⏳ Still waiting for confirmation...");
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Check failed:", error);
    process.exit(1);
  }); 
