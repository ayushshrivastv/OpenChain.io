const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 UPDATING ETH PRICE FEED");
  console.log("==========================");

  const LAYERZERO_CONTRACT = "0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40";
  const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
  
  // Use a public RPC to avoid rate limiting
  const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia.publicnode.com");
  
  // Get signer
  const privateKey = "4e66b0f8b19629b7b465d3eca74aa33b259b05b608bff92070781f48129dcd4d";
  const signer = new ethers.Wallet(privateKey, provider);

  console.log(`🔍 Contract: ${LAYERZERO_CONTRACT}`);
  console.log(`👤 Signer: ${signer.address}`);

  // Load contract
  const LayerZeroLending = await ethers.getContractFactory("LayerZeroLending");
  const lendingContract = LayerZeroLending.attach(LAYERZERO_CONTRACT).connect(signer);

  try {
    // Check current configuration
    console.log("\n📊 Current ETH configuration...");
    const ethConfig = await lendingContract.supportedAssets(ETH_ADDRESS);
    console.log(`   Price Feed: ${ethConfig.priceFeed}`);
    console.log(`   Is Active: ${ethConfig.isActive}`);

    // Use a working Sepolia ETH/USD price feed
    const WORKING_ETH_PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
    
    console.log(`\n🔧 Updating to working price feed: ${WORKING_ETH_PRICE_FEED}`);
    
    // Try to update the price feed
    const updateTx = await lendingContract.updateAssetPriceFeed(
      ETH_ADDRESS,
      WORKING_ETH_PRICE_FEED,
      { gasLimit: 200000 }
    );
    
    console.log(`✅ Update transaction sent: ${updateTx.hash}`);
    await updateTx.wait();
    console.log(`✅ Price feed updated successfully!`);
    
    // Verify the update
    console.log("\n📊 Verifying update...");
    const newConfig = await lendingContract.supportedAssets(ETH_ADDRESS);
    console.log(`   New Price Feed: ${newConfig.priceFeed}`);
    console.log(`   Is Active: ${newConfig.isActive}`);
    
    // Test a small deposit
    console.log("\n💰 Testing deposit after update...");
    const testAmount = ethers.parseEther("0.01");
    
    try {
      const result = await lendingContract.deposit.staticCall(ETH_ADDRESS, testAmount, { value: testAmount });
      console.log(`✅ Deposit simulation successful!`);
      
      const depositTx = await lendingContract.deposit(ETH_ADDRESS, testAmount, { 
        value: testAmount,
        gasLimit: 300000 
      });
      
      console.log(`✅ Deposit transaction sent: ${depositTx.hash}`);
      await depositTx.wait();
      console.log(`✅ Deposit successful! Price feed issue fixed!`);
      
    } catch (error) {
      console.log(`❌ Deposit still failing: ${error.message}`);
    }

  } catch (error) {
    console.error("❌ Error during update:", error);
    
    // If update fails, try alternative approach
    console.log("\n🔧 Trying alternative approach...");
    
    try {
      // Try to re-add the asset with the working price feed
      const WORKING_ETH_PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
      
      console.log("Attempting to re-add ETH asset with working price feed...");
      
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
      
      console.log(`✅ Re-add asset transaction sent: ${addAssetTx.hash}`);
      await addAssetTx.wait();
      console.log(`✅ ETH asset re-added with working price feed!`);
      
    } catch (addError) {
      console.log(`❌ Could not re-add asset: ${addError.message}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 
