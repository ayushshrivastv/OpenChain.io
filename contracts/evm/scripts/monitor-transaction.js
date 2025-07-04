const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 TRANSACTION MONITORING");
  console.log("=========================");

  // The stuck transaction hash
  const TX_HASH = "0x6df66d0fbdd453202ac05497afba57e9226baae3f9d87c189417410fe2e9b156";
  
  // Get provider
  const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/BoCIb0ZnDxjtMlAjT63Zp4w5oLlpytye");

  console.log(`🔍 Monitoring transaction: ${TX_HASH}`);

  // Check transaction status
  console.log("\n📊 Transaction Status Check");
  try {
    const tx = await provider.getTransaction(TX_HASH);
    if (tx) {
      console.log(`✅ Transaction found in mempool`);
      console.log(`📋 From: ${tx.from}`);
      console.log(`📋 To: ${tx.to}`);
      console.log(`💰 Value: ${ethers.formatEther(tx.value)} ETH`);
      console.log(`⛽ Gas Limit: ${tx.gasLimit.toString()}`);
      console.log(`⛽ Gas Price: ${ethers.formatUnits(tx.gasPrice, "gwei")} gwei`);
      console.log(`📝 Nonce: ${tx.nonce}`);
      console.log(`🔢 Block Number: ${tx.blockNumber || "Pending"}`);
    } else {
      console.log(`❌ Transaction not found in mempool`);
    }
  } catch (error) {
    console.log(`❌ Error checking transaction: ${error.message}`);
  }

  // Check transaction receipt
  console.log("\n📋 Transaction Receipt Check");
  try {
    const receipt = await provider.getTransactionReceipt(TX_HASH);
    if (receipt) {
      console.log(`✅ Transaction confirmed!`);
      console.log(`🔢 Block Number: ${receipt.blockNumber}`);
      console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`💰 Effective Gas Price: ${ethers.formatUnits(receipt.effectiveGasPrice, "gwei")} gwei`);
      console.log(`✅ Status: ${receipt.status === 1 ? "Success" : "Failed"}`);
      console.log(`📝 Logs: ${receipt.logs.length} events`);
      
      if (receipt.status === 0) {
        console.log(`❌ Transaction failed!`);
      }
    } else {
      console.log(`⏳ Transaction still pending...`);
    }
  } catch (error) {
    console.log(`❌ Error checking receipt: ${error.message}`);
  }

  // Check current gas prices
  console.log("\n⛽ Current Gas Prices");
  try {
    const feeData = await provider.getFeeData();
    console.log(`💰 Gas Price: ${ethers.formatUnits(feeData.gasPrice, "gwei")} gwei`);
    console.log(`⚡ Max Fee Per Gas: ${ethers.formatUnits(feeData.maxFeePerGas, "gwei")} gwei`);
    console.log(`⚡ Max Priority Fee Per Gas: ${ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei")} gwei`);
  } catch (error) {
    console.log(`❌ Error getting gas prices: ${error.message}`);
  }

  // Check LayerZero contract state
  console.log("\n📋 LayerZero Contract State");
  try {
    const LAYERZERO_CONTRACT = "0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40";
    const LayerZeroLending = await ethers.getContractFactory("LayerZeroLending");
    const lendingContract = LayerZeroLending.attach(LAYERZERO_CONTRACT);
    
    const isActive = await lendingContract.isActive();
    console.log(`✅ Contract active: ${isActive}`);
    
    const totalAssets = await lendingContract.totalAssets();
    console.log(`✅ Total assets: ${ethers.formatEther(totalAssets)} ETH`);
    
    const contractBalance = await provider.getBalance(LAYERZERO_CONTRACT);
    console.log(`✅ Contract ETH balance: ${ethers.formatEther(contractBalance)} ETH`);
    
  } catch (error) {
    console.log(`❌ Error checking contract state: ${error.message}`);
  }

  // Try to speed up the transaction
  console.log("\n⚡ Transaction Speed Up Options");
  try {
    const tx = await provider.getTransaction(TX_HASH);
    if (tx && !tx.blockNumber) {
      console.log(`🔄 Transaction is pending, can be speed up`);
      console.log(`💰 Current gas price: ${ethers.formatUnits(tx.gasPrice, "gwei")} gwei`);
      
      const feeData = await provider.getFeeData();
      const newGasPrice = feeData.gasPrice * 120n / 100n; // 20% increase
      console.log(`💰 Suggested new gas price: ${ethers.formatUnits(newGasPrice, "gwei")} gwei`);
      
      console.log(`💡 To speed up, send a new transaction with:`);
      console.log(`   - Same nonce: ${tx.nonce}`);
      console.log(`   - Higher gas price: ${ethers.formatUnits(newGasPrice, "gwei")} gwei`);
      console.log(`   - Same data and value`);
    }
  } catch (error) {
    console.log(`❌ Error analyzing speed up: ${error.message}`);
  }

  console.log("\n🏁 MONITORING COMPLETE");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Monitoring failed:", error);
    process.exit(1);
  }); 
