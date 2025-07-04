const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 FRONTEND TRANSACTION FIX GENERATOR");
  console.log("=====================================");

  // Configuration
  const LAYERZERO_CONTRACT = "0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40";
  const TEST_AMOUNT = ethers.parseEther("0.1");
  const TEST_ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

  // Get provider and signer
  const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/BoCIb0ZnDxjtMlAjT63Zp4w5oLlpytye");
  const privateKey = "4e66b0f8b19629b7b465d3eca74aa33b259b05b608bff92070781f48129dcd4d";
  const signer = new ethers.Wallet(privateKey, provider);

  console.log(`🧪 Testing with account: ${signer.address}`);

  // Load contract
  const LayerZeroLending = await ethers.getContractFactory("LayerZeroLending");
  const lendingContract = LayerZeroLending.attach(LAYERZERO_CONTRACT);

  // Get current gas prices
  const feeData = await provider.getFeeData();
  console.log(`⛽ Current gas prices:`);
  console.log(`   Gas Price: ${ethers.formatUnits(feeData.gasPrice, "gwei")} gwei`);
  console.log(`   Max Fee: ${ethers.formatUnits(feeData.maxFeePerGas, "gwei")} gwei`);
  console.log(`   Priority Fee: ${ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei")} gwei`);

  // Generate optimal transaction configuration
  console.log("\n🔧 OPTIMAL TRANSACTION CONFIGURATION");
  
  // Estimate gas
  const gasEstimate = await lendingContract.deposit.estimateGas(
    TEST_ETH_ADDRESS,
    TEST_AMOUNT,
    { value: TEST_AMOUNT }
  );
  
  // Add 20% buffer for safety
  const gasLimit = gasEstimate * 120n / 100n;
  
  console.log(`📊 Gas Configuration:`);
  console.log(`   Estimated Gas: ${gasEstimate.toString()}`);
  console.log(`   Gas Limit (with buffer): ${gasLimit.toString()}`);
  
  // Calculate optimal gas price (25% higher than current)
  const optimalGasPrice = feeData.gasPrice * 125n / 100n;
  const maxFeePerGas = feeData.maxFeePerGas * 125n / 100n;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 125n / 100n;
  
  console.log(`⛽ Optimal Gas Prices:`);
  console.log(`   Gas Price: ${ethers.formatUnits(optimalGasPrice, "gwei")} gwei`);
  console.log(`   Max Fee Per Gas: ${ethers.formatUnits(maxFeePerGas, "gwei")} gwei`);
  console.log(`   Max Priority Fee: ${ethers.formatUnits(maxPriorityFeePerGas, "gwei")} gwei`);

  // Generate frontend configuration
  console.log("\n💻 FRONTEND CONFIGURATION");
  console.log("```javascript");
  console.log("// Optimal transaction configuration for LayerZero deposits");
  console.log("const optimalConfig = {");
  console.log(`  address: "${LAYERZERO_CONTRACT}",`);
  console.log(`  abi: LENDING_POOL_ABI,`);
  console.log(`  functionName: 'deposit',`);
  console.log(`  args: [assetAddress, amount],`);
  console.log(`  value: amount, // For ETH deposits`);
  console.log(`  gasLimit: ${gasLimit.toString()},`);
  console.log(`  maxFeePerGas: "${maxFeePerGas.toString()}",`);
  console.log(`  maxPriorityFeePerGas: "${maxPriorityFeePerGas.toString()}",`);
  console.log("};");
  console.log("");
  console.log("// For wagmi useWriteContract");
  console.log("const { writeContract } = useWriteContract();");
  console.log("await writeContract(optimalConfig);");
  console.log("```");

  // Test the configuration
  console.log("\n🧪 TESTING OPTIMAL CONFIGURATION");
  try {
    console.log(`🔄 Testing deposit with optimal configuration...`);
    
    const tx = await lendingContract.deposit(
      TEST_ETH_ADDRESS,
      TEST_AMOUNT,
      {
        value: TEST_AMOUNT,
        gasLimit: gasLimit,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas
      }
    );
    
    console.log(`📝 Transaction submitted: ${tx.hash}`);
    console.log(`⏳ Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}!`);
    console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`💰 Total cost: ${ethers.formatEther(receipt.gasUsed * receipt.effectiveGasPrice)} ETH`);
    
    // Verify the deposit worked
    const userPosition = await lendingContract.userPositions(signer.address, TEST_ETH_ADDRESS);
    console.log(`✅ User position updated:`);
    console.log(`   Deposited: ${ethers.formatEther(userPosition.deposited)} ETH`);
    console.log(`   Borrowed: ${ethers.formatEther(userPosition.borrowed)} ETH`);
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }

  // Generate MetaMask configuration
  console.log("\n🦊 METAMASK CONFIGURATION");
  console.log("```javascript");
  console.log("// For direct MetaMask integration");
  console.log("const depositConfig = {");
  console.log(`  to: "${LAYERZERO_CONTRACT}",`);
  console.log(`  data: "0x...", // Function call data`);
  console.log(`  value: amount, // For ETH deposits`);
  console.log(`  gasLimit: ${gasLimit.toString()},`);
  console.log(`  maxFeePerGas: "${maxFeePerGas.toString()}",`);
  console.log(`  maxPriorityFeePerGas: "${maxPriorityFeePerGas.toString()}",`);
  console.log("};");
  console.log("");
  console.log("// Send transaction");
  console.log("const tx = await window.ethereum.request({");
  console.log("  method: 'eth_sendTransaction',");
  console.log("  params: [depositConfig]");
  console.log("});");
  console.log("```");

  console.log("\n🏁 CONFIGURATION GENERATION COMPLETE");
  console.log("💡 Use these configurations in your frontend to prevent stuck transactions!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Configuration generation failed:", error);
    process.exit(1);
  }); 
