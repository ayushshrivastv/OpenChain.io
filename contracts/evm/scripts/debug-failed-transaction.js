const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 DEBUGGING FAILED TRANSACTION");
  console.log("================================");

  const LAYERZERO_CONTRACT = "0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40";
  const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
  const TEST_AMOUNT = ethers.parseEther("0.01"); // Small test

  // Get provider and signer
  const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/BoCIb0ZnDxjtMlAjT63Zp4w5oLlpytye");
  const privateKey = "4e66b0f8b19629b7b465d3eca74aa33b259b05b608bff92070781f48129dcd4d";
  const signer = new ethers.Wallet(privateKey, provider);

  console.log(`🧪 Testing with account: ${signer.address}`);

  // Load contract
  const LayerZeroLending = await ethers.getContractFactory("LayerZeroLending");
  const lendingContract = LayerZeroLending.attach(LAYERZERO_CONTRACT);

  try {
    // Check contract state
    console.log("\n🔍 CONTRACT STATE CHECK");
    const paused = await lendingContract.paused();
    console.log(`✅ Contract paused: ${paused}`);

    const owner = await lendingContract.owner();
    console.log(`✅ Owner: ${owner}`);

    // Check ETH asset configuration
    console.log("\n🔍 ETH ASSET CONFIGURATION");
    const ethAsset = await lendingContract.supportedAssets(ETH_ADDRESS);
    console.log(`✅ ETH asset:`, {
      token: ethAsset.token,
      synthToken: ethAsset.synthToken,
      decimals: ethAsset.decimals.toString(),
      ltv: ethAsset.ltv.toString(),
      isActive: ethAsset.isActive
    });

    // Check if ETH is properly configured
    if (!ethAsset.isActive) {
      console.log("❌ ETH is not active! This is the problem!");
      console.log("💡 Need to add ETH as supported asset");
    }

    // Check if contract is paused
    if (paused) {
      console.log("❌ Contract is paused! This is the problem!");
      console.log("💡 Need to unpause the contract");
    }

    // Try to call deposit function directly to see the error
    console.log("\n🔍 TESTING DEPOSIT FUNCTION");
    try {
      const gasEstimate = await lendingContract.deposit.estimateGas(
        ETH_ADDRESS,
        TEST_AMOUNT,
        { value: TEST_AMOUNT }
      );
      console.log(`✅ Gas estimate: ${gasEstimate.toString()}`);
    } catch (error) {
      console.log(`❌ Gas estimation failed: ${error.message}`);
      
      // Check if it's a revert reason
      if (error.data) {
        console.log(`🔍 Error data: ${error.data}`);
      }
      
      // Common revert reasons
      if (error.message.includes("AssetNotSupported")) {
        console.log("💡 SOLUTION: ETH is not configured as supported asset");
      } else if (error.message.includes("Pausable: paused")) {
        console.log("💡 SOLUTION: Contract is paused");
      } else if (error.message.includes("InvalidAmount")) {
        console.log("💡 SOLUTION: Amount is invalid");
      } else if (error.message.includes("Incorrect ETH amount")) {
        console.log("💡 SOLUTION: Incorrect ETH amount sent");
      }
    }

    // Check if we need to add ETH as supported asset
    console.log("\n🔍 CHECKING IF ETH NEEDS TO BE ADDED");
    if (!ethAsset.isActive) {
      console.log("🔄 ETH is not configured. Adding it now...");
      
      try {
        const tx = await lendingContract.addSupportedAsset(
          ETH_ADDRESS,
          "0x0000000000000000000000000000000000000000", // No synth token for ETH
          18, // 18 decimals
          75e18, // 75% LTV
          true // isActive
        );
        
        console.log(`📝 Adding ETH asset transaction: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ ETH asset added successfully!`);
        
        // Verify it was added
        const newEthAsset = await lendingContract.supportedAssets(ETH_ADDRESS);
        console.log(`✅ New ETH asset config:`, {
          isActive: newEthAsset.isActive,
          ltv: newEthAsset.ltv.toString(),
          decimals: newEthAsset.decimals.toString()
        });
        
      } catch (error) {
        console.log(`❌ Failed to add ETH asset: ${error.message}`);
      }
    }

    // Check if contract needs to be unpaused
    if (paused) {
      console.log("🔄 Contract is paused. Unpausing...");
      
      try {
        const tx = await lendingContract.unpause();
        console.log(`📝 Unpause transaction: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ Contract unpaused successfully!`);
      } catch (error) {
        console.log(`❌ Failed to unpause: ${error.message}`);
      }
    }

    // Test deposit again if issues were fixed
    console.log("\n🔍 TESTING DEPOSIT AFTER FIX");
    const updatedEthAsset = await lendingContract.supportedAssets(ETH_ADDRESS);
    const updatedPaused = await lendingContract.paused();
    
    if (updatedEthAsset.isActive && !updatedPaused) {
      try {
        console.log(`🔄 Testing deposit of ${ethers.formatEther(TEST_AMOUNT)} ETH...`);
        
        const tx = await lendingContract.deposit(
          ETH_ADDRESS,
          TEST_AMOUNT,
          { 
            value: TEST_AMOUNT,
            gasLimit: 300000
          }
        );
        
        console.log(`📝 Deposit transaction: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ Deposit successful!`);
        
        // Check user position
        const userPosition = await lendingContract.userPositions(signer.address);
        console.log(`✅ User position:`, {
          totalCollateralValue: ethers.formatEther(userPosition.totalCollateralValue),
          totalBorrowValue: ethers.formatEther(userPosition.totalBorrowValue),
          healthFactor: ethers.formatEther(userPosition.healthFactor)
        });
        
      } catch (error) {
        console.log(`❌ Deposit still failed: ${error.message}`);
      }
    } else {
      console.log("❌ Contract still not ready for deposits");
      console.log(`   ETH active: ${updatedEthAsset.isActive}`);
      console.log(`   Contract paused: ${updatedPaused}`);
    }

  } catch (error) {
    console.log(`❌ Debug failed: ${error.message}`);
  }

  console.log("\n🏁 DEBUG COMPLETE");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Debug failed:", error);
    process.exit(1);
  }); 
 