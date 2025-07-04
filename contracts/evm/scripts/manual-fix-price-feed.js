const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 MANUAL PRICE FEED FIX");
  console.log("========================");

  // Contract addresses
  const LAYERZERO_CONTRACT = "0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40";
  const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
  const WORKING_ETH_PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Sepolia ETH/USD
  
  // Use public RPC
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia.publicnode.com");
  const privateKey = "4e66b0f8b19629b7b465d3eca74aa33b259b05b608bff92070781f48129dcd4d";
  const signer = new ethers.Wallet(privateKey, provider);

  console.log(`🔍 Contract: ${LAYERZERO_CONTRACT}`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`💰 ETH Address: ${ETH_ADDRESS}`);
  console.log(`📊 Working Price Feed: ${WORKING_ETH_PRICE_FEED}`);

  // Load contract
  const LayerZeroLending = await ethers.getContractFactory("LayerZeroLending");
  const lendingContract = LayerZeroLending.attach(LAYERZERO_CONTRACT).connect(signer);

  try {
    // Step 1: Check current configuration
    console.log("\n📊 Step 1: Checking current configuration...");
    const ethConfig = await lendingContract.supportedAssets(ETH_ADDRESS);
    console.log(`   Current Price Feed: ${ethConfig.priceFeed}`);
    console.log(`   Is Active: ${ethConfig.isActive}`);

    // Step 2: Update price feed
    console.log("\n🔧 Step 2: Updating price feed...");
    const updateTx = await lendingContract.updateAssetPriceFeed(
      ETH_ADDRESS,
      WORKING_ETH_PRICE_FEED,
      { gasLimit: 200000 }
    );
    
    console.log(`   Transaction sent: ${updateTx.hash}`);
    console.log(`   Waiting for confirmation...`);
    await updateTx.wait();
    console.log(`   ✅ Price feed updated successfully!`);

    // Step 3: Verify update
    console.log("\n📊 Step 3: Verifying update...");
    const newConfig = await lendingContract.supportedAssets(ETH_ADDRESS);
    console.log(`   New Price Feed: ${newConfig.priceFeed}`);
    console.log(`   Is Active: ${newConfig.isActive}`);

    // Step 4: Test deposit
    console.log("\n💰 Step 4: Testing deposit...");
    const testAmount = ethers.parseEther("0.01");
    
    const depositTx = await lendingContract.deposit(ETH_ADDRESS, testAmount, { 
      value: testAmount,
      gasLimit: 300000 
    });
    
    console.log(`   Deposit transaction sent: ${depositTx.hash}`);
    console.log(`   Waiting for confirmation...`);
    await depositTx.wait();
    console.log(`   ✅ Deposit successful! Price feed issue fixed!`);
    
    console.log("\n🎉 SUCCESS! The price feed has been updated and deposits should now work.");
    console.log("You can now try depositing ETH from the frontend.");

  } catch (error) {
    console.error("❌ Error:", error.message);
    
    if (error.message.includes("updateAssetPriceFeed")) {
      console.log("\n🔧 Alternative: Trying to re-add the asset...");
      
      try {
        const addAssetTx = await lendingContract.addSupportedAsset(
          ETH_ADDRESS,
          WORKING_ETH_PRICE_FEED,
          18, // decimals
          7500, // 75% LTV
          8000, // 80% liquidation threshold
          true, // canBeBorrowed
          true, // canBeCollateral
          { gasLimit: 300000 }
        );
        
        console.log(`   Re-add transaction sent: ${addAssetTx.hash}`);
        await addAssetTx.wait();
        console.log(`   ✅ Asset re-added successfully!`);
        
      } catch (addError) {
        console.log(`   ❌ Could not re-add asset: ${addError.message}`);
        console.log("\n📋 Manual steps to fix:");
        console.log("1. Go to Sepolia Etherscan");
        console.log("2. Find contract: 0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40");
        console.log("3. Call updateAssetPriceFeed function");
        console.log("4. Set asset to: 0x0000000000000000000000000000000000000000");
        console.log("5. Set priceFeed to: 0x694AA1769357215DE4FAC081bf1f309aDC325306");
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 
