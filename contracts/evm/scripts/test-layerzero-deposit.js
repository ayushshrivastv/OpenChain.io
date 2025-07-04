const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 LAYERZERO DEPOSIT DIAGNOSTIC TEST");
  console.log("=====================================");

  // Test configuration
  const LAYERZERO_CONTRACT = "0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40";
  const TEST_AMOUNT = ethers.parseEther("0.01"); // Small test amount
  const TEST_ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log(`🧪 Testing with account: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);

  // Load contract
  const LayerZeroLending = await ethers.getContractFactory("LayerZeroLending");
  const lendingContract = LayerZeroLending.attach(LAYERZERO_CONTRACT);
  console.log(`📋 Contract loaded at: ${LAYERZERO_CONTRACT}`);

  // Test 1: Check contract state
  console.log("\n🔍 TEST 1: Contract State Check");
  try {
    const owner = await lendingContract.owner();
    console.log(`✅ Owner: ${owner}`);
    
    const isActive = await lendingContract.isActive();
    console.log(`✅ Contract active: ${isActive}`);
    
    const totalAssets = await lendingContract.totalAssets();
    console.log(`✅ Total assets: ${ethers.formatEther(totalAssets)} ETH`);
  } catch (error) {
    console.log(`❌ Contract state check failed: ${error.message}`);
  }

  // Test 2: Check ETH asset configuration
  console.log("\n🔍 TEST 2: ETH Asset Configuration");
  try {
    const ethAsset = await lendingContract.supportedAssets(TEST_ETH_ADDRESS);
    console.log(`✅ ETH asset config:`, {
      isActive: ethAsset.isActive,
      ltv: ethAsset.ltv.toString(),
      decimals: ethAsset.decimals.toString(),
      priceFeed: ethAsset.priceFeed
    });
  } catch (error) {
    console.log(`❌ ETH asset check failed: ${error.message}`);
  }

  // Test 3: Check user position
  console.log("\n🔍 TEST 3: User Position Check");
  try {
    const userPosition = await lendingContract.userPositions(deployer.address, TEST_ETH_ADDRESS);
    console.log(`✅ User position:`, {
      deposited: ethers.formatEther(userPosition.deposited),
      borrowed: ethers.formatEther(userPosition.borrowed),
      lastUpdate: userPosition.lastUpdate.toString()
    });
  } catch (error) {
    console.log(`❌ User position check failed: ${error.message}`);
  }

  // Test 4: Estimate gas for deposit
  console.log("\n🔍 TEST 4: Gas Estimation");
  try {
    const gasEstimate = await lendingContract.deposit.estimateGas(
      TEST_ETH_ADDRESS,
      TEST_AMOUNT,
      { value: TEST_AMOUNT }
    );
    console.log(`✅ Gas estimate: ${gasEstimate.toString()}`);
    
    const gasPrice = await deployer.provider.getFeeData();
    console.log(`✅ Gas price: ${ethers.formatUnits(gasPrice.gasPrice, "gwei")} gwei`);
    
    const totalCost = gasEstimate * gasPrice.gasPrice;
    console.log(`✅ Total cost: ${ethers.formatEther(totalCost)} ETH`);
  } catch (error) {
    console.log(`❌ Gas estimation failed: ${error.message}`);
  }

  // Test 5: Simulate deposit transaction
  console.log("\n🔍 TEST 5: Transaction Simulation");
  try {
    const tx = await lendingContract.deposit.populateTransaction(
      TEST_ETH_ADDRESS,
      TEST_AMOUNT,
      { value: TEST_AMOUNT }
    );
    console.log(`✅ Transaction data:`, {
      to: tx.to,
      value: ethers.formatEther(tx.value),
      data: tx.data.slice(0, 66) + "..."
    });
  } catch (error) {
    console.log(`❌ Transaction simulation failed: ${error.message}`);
  }

  // Test 6: Check if contract can receive ETH
  console.log("\n🔍 TEST 6: ETH Reception Test");
  try {
    const balanceBefore = await deployer.provider.getBalance(LAYERZERO_CONTRACT);
    console.log(`✅ Contract ETH balance before: ${ethers.formatEther(balanceBefore)} ETH`);
    
    // Try a minimal ETH transfer
    const testTx = await deployer.sendTransaction({
      to: LAYERZERO_CONTRACT,
      value: ethers.parseEther("0.001"),
      gasLimit: 100000
    });
    await testTx.wait();
    
    const balanceAfter = await deployer.provider.getBalance(LAYERZERO_CONTRACT);
    console.log(`✅ Contract ETH balance after: ${ethers.formatEther(balanceAfter)} ETH`);
    console.log(`✅ ETH transfer successful: ${testTx.hash}`);
  } catch (error) {
    console.log(`❌ ETH reception test failed: ${error.message}`);
  }

  // Test 7: Actual deposit test (small amount)
  console.log("\n🔍 TEST 7: Actual Deposit Test");
  try {
    console.log(`🔄 Attempting deposit of ${ethers.formatEther(TEST_AMOUNT)} ETH...`);
    
    const tx = await lendingContract.deposit(
      TEST_ETH_ADDRESS,
      TEST_AMOUNT,
      { 
        value: TEST_AMOUNT,
        gasLimit: 500000 // Higher gas limit
      }
    );
    
    console.log(`📝 Transaction submitted: ${tx.hash}`);
    console.log(`⏳ Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed!`);
    console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`💰 Gas cost: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} ETH`);
    
    // Check updated position
    const newPosition = await lendingContract.userPositions(deployer.address, TEST_ETH_ADDRESS);
    console.log(`✅ New user position:`, {
      deposited: ethers.formatEther(newPosition.deposited),
      borrowed: ethers.formatEther(newPosition.borrowed)
    });
    
  } catch (error) {
    console.log(`❌ Deposit test failed: ${error.message}`);
    
    // Try to get more error details
    if (error.data) {
      console.log(`🔍 Error data: ${error.data}`);
    }
    if (error.reason) {
      console.log(`🔍 Error reason: ${error.reason}`);
    }
  }

  console.log("\n🏁 DIAGNOSTIC TEST COMPLETE");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }); 
