const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 FIXING 'PRICE FEED STALE' ERROR");
  console.log("==================================");

  const LAYERZERO_CONTRACT = "0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40";
  const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
  
  // Use a different RPC to avoid rate limiting
  const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
  
  // Get signer
  const privateKey = "4e66b0f8b19629b7b465d3eca74aa33b259b05b608bff92070781f48129dcd4d";
  const signer = new ethers.Wallet(privateKey, provider);

  console.log(`🔍 Contract: ${LAYERZERO_CONTRACT}`);
  console.log(`👤 Signer: ${signer.address}`);

  // Load contract
  const LayerZeroLending = await ethers.getContractFactory("LayerZeroLending");
  const lendingContract = LayerZeroLending.attach(LAYERZERO_CONTRACT).connect(signer);

  try {
    // 1. Check current ETH configuration
    console.log("\n📊 1. Current ETH configuration...");
    const ethConfig = await lendingContract.supportedAssets(ETH_ADDRESS);
    console.log(`   Price Feed: ${ethConfig.priceFeed}`);
    console.log(`   Is Active: ${ethConfig.isActive}`);

    // 2. Check if we need to update the price feed
    if (ethConfig.priceFeed !== "0x0000000000000000000000000000000000000000") {
      console.log("\n📊 2. Checking price feed status...");
      
      const priceFeedABI = [
        "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
        "function decimals() external view returns (uint8)"
      ];
      
      const priceFeedContract = new ethers.Contract(ethConfig.priceFeed, priceFeedABI, provider);
      
      try {
        const latestData = await priceFeedContract.latestRoundData();
        const currentTime = Math.floor(Date.now() / 1000);
        const timeDiff = currentTime - Number(latestData.updatedAt);
        
        console.log(`   Last update: ${Math.floor(timeDiff/3600)} hours ago`);
        
        if (timeDiff > 3600) {
          console.log(`   ⚠️  Price feed is stale! Need to update.`);
          
          // 3. Try to update the price feed or use a different approach
          console.log("\n🔧 3. Attempting to fix price feed issue...");
          
          // Option 1: Try to update the price feed configuration
          try {
            // Check if we can call updatePriceFeed function (if it exists)
            console.log("   Trying to update price feed configuration...");
            
            // For now, let's try a different approach - use a working price feed
            const WORKING_ETH_PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Sepolia ETH/USD
            
            console.log(`   Attempting to update to working price feed: ${WORKING_ETH_PRICE_FEED}`);
            
            // Check if the contract has an update function
            const updateTx = await lendingContract.updateAssetPriceFeed(
              ETH_ADDRESS,
              WORKING_ETH_PRICE_FEED,
              { gasLimit: 200000 }
            );
            
            console.log(`   ✅ Update transaction sent: ${updateTx.hash}`);
            await updateTx.wait();
            console.log(`   ✅ Price feed updated successfully!`);
            
          } catch (updateError) {
            console.log(`   ❌ Could not update price feed: ${updateError.message}`);
            
            // Option 2: Try to add ETH as a new asset with a working price feed
            console.log("\n🔧 4. Trying alternative approach - re-add ETH with working price feed...");
            
            try {
              const WORKING_ETH_PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Sepolia ETH/USD
              
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
              
              console.log(`   ✅ Re-add asset transaction sent: ${addAssetTx.hash}`);
              await addAssetTx.wait();
              console.log(`   ✅ ETH asset re-added with working price feed!`);
              
            } catch (addError) {
              console.log(`   ❌ Could not re-add asset: ${addError.message}`);
              
              // Option 3: Try to disable and re-enable the asset
              console.log("\n🔧 5. Trying to disable and re-enable ETH asset...");
              
              try {
                const disableTx = await lendingContract.setAssetActive(ETH_ADDRESS, false, { gasLimit: 100000 });
                console.log(`   Disable transaction sent: ${disableTx.hash}`);
                await disableTx.wait();
                
                const enableTx = await lendingContract.setAssetActive(ETH_ADDRESS, true, { gasLimit: 100000 });
                console.log(`   Enable transaction sent: ${enableTx.hash}`);
                await enableTx.wait();
                
                console.log(`   ✅ Asset disabled and re-enabled!`);
                
              } catch (toggleError) {
                console.log(`   ❌ Could not toggle asset: ${toggleError.message}`);
              }
            }
          }
        } else {
          console.log(`   ✅ Price feed is recent, no update needed.`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error reading price feed: ${error.message}`);
      }
    } else {
      console.log("\n❌ No price feed configured for ETH!");
    }

    // 4. Test deposit after fixes
    console.log("\n📊 6. Testing deposit after fixes...");
    const testAmount = ethers.parseEther("0.01");
    
    try {
      const result = await lendingContract.deposit.staticCall(ETH_ADDRESS, testAmount, { value: testAmount });
      console.log(`   ✅ Deposit simulation successful!`);
      
      // If simulation works, try actual deposit
      console.log("\n💰 7. Attempting actual deposit...");
      const depositTx = await lendingContract.deposit(ETH_ADDRESS, testAmount, { 
        value: testAmount,
        gasLimit: 300000 
      });
      
      console.log(`   ✅ Deposit transaction sent: ${depositTx.hash}`);
      await depositTx.wait();
      console.log(`   ✅ Deposit successful!`);
      
    } catch (error) {
      console.log(`   ❌ Deposit still failing: ${error.message}`);
    }

  } catch (error) {
    console.error("❌ Error during fix:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 
