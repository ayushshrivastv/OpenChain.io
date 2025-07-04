const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 DEBUGGING 'PRICE FEED STALE' ERROR");
  console.log("=====================================");

  const LAYERZERO_CONTRACT = "0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40";
  const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
  const USER_ADDRESS = "0x31A09F533045988A6e7a487cc6BD50F9285BCBd1";

  // Get provider
  const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/BoCIb0ZnDxjtMlAjT63Zp4w5oLlpytye");

  console.log(`🔍 Contract: ${LAYERZERO_CONTRACT}`);
  console.log(`👤 User: ${USER_ADDRESS}`);
  console.log(`💰 ETH Address: ${ETH_ADDRESS}`);

  // Load contract
  const LayerZeroLending = await ethers.getContractFactory("LayerZeroLending");
  const lendingContract = LayerZeroLending.attach(LAYERZERO_CONTRACT);

  try {
    // 1. Check if contract is paused
    console.log("\n📊 1. Checking contract status...");
    const isPaused = await lendingContract.paused();
    console.log(`   Contract paused: ${isPaused}`);

    // 2. Check ETH asset configuration
    console.log("\n📊 2. Checking ETH asset configuration...");
    const ethConfig = await lendingContract.supportedAssets(ETH_ADDRESS);
    console.log(`   ETH Asset Config:`);
    console.log(`   - Token: ${ethConfig.token}`);
    console.log(`   - Price Feed: ${ethConfig.priceFeed}`);
    console.log(`   - Decimals: ${ethConfig.decimals}`);
    console.log(`   - LTV: ${ethConfig.ltv}`);
    console.log(`   - Is Active: ${ethConfig.isActive}`);
    console.log(`   - Can Be Borrowed: ${ethConfig.canBeBorrowed}`);
    console.log(`   - Can Be Collateral: ${ethConfig.canBeCollateral}`);

    // 3. Check if price feed is configured
    if (ethConfig.priceFeed !== "0x0000000000000000000000000000000000000000") {
      console.log("\n📊 3. Checking price feed contract...");
      
      // Load price feed contract
      const priceFeedABI = [
        "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
        "function getRoundData(uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
        "function decimals() external view returns (uint8)",
        "function description() external view returns (string memory)",
        "function version() external view returns (uint256)"
      ];
      
      const priceFeedContract = new ethers.Contract(ethConfig.priceFeed, priceFeedABI, provider);
      
      try {
        const latestData = await priceFeedContract.latestRoundData();
        console.log(`   Latest Round Data:`);
        console.log(`   - Round ID: ${latestData.roundId}`);
        console.log(`   - Answer: ${latestData.answer}`);
        console.log(`   - Started At: ${new Date(Number(latestData.startedAt) * 1000).toISOString()}`);
        console.log(`   - Updated At: ${new Date(Number(latestData.updatedAt) * 1000).toISOString()}`);
        console.log(`   - Answered In Round: ${latestData.answeredInRound}`);
        
        const currentTime = Math.floor(Date.now() / 1000);
        const timeDiff = currentTime - Number(latestData.updatedAt);
        console.log(`   - Time since last update: ${timeDiff} seconds (${Math.floor(timeDiff/3600)} hours)`);
        
        // Check if price feed is stale (older than 1 hour)
        if (timeDiff > 3600) {
          console.log(`   ⚠️  PRICE FEED IS STALE! (${Math.floor(timeDiff/3600)} hours old)`);
        } else {
          console.log(`   ✅ Price feed is recent`);
        }
        
        const decimals = await priceFeedContract.decimals();
        const description = await priceFeedContract.description();
        console.log(`   - Decimals: ${decimals}`);
        console.log(`   - Description: ${description}`);
        
      } catch (error) {
        console.log(`   ❌ Error reading price feed: ${error.message}`);
      }
    } else {
      console.log("\n❌ 3. No price feed configured for ETH!");
    }

    // 4. Check user position
    console.log("\n📊 4. Checking user position...");
    try {
      const userPosition = await lendingContract.getUserPosition(USER_ADDRESS);
      console.log(`   User Position:`);
      console.log(`   - Total Collateral Value: ${ethers.formatEther(userPosition.totalCollateralValue)} ETH`);
      console.log(`   - Total Borrow Value: ${ethers.formatEther(userPosition.totalBorrowValue)} ETH`);
      console.log(`   - Health Factor: ${ethers.formatEther(userPosition.healthFactor)}`);
    } catch (error) {
      console.log(`   ❌ Error reading user position: ${error.message}`);
    }

    // 5. Check contract balance
    console.log("\n📊 5. Checking contract balance...");
    const contractBalance = await provider.getBalance(LAYERZERO_CONTRACT);
    console.log(`   Contract ETH Balance: ${ethers.formatEther(contractBalance)} ETH`);

    // 6. Simulate the deposit transaction
    console.log("\n📊 6. Simulating deposit transaction...");
    const testAmount = ethers.parseEther("0.01");
    
    try {
      const result = await lendingContract.deposit.staticCall(ETH_ADDRESS, testAmount, { value: testAmount });
      console.log(`   ✅ Deposit simulation successful: ${result}`);
    } catch (error) {
      console.log(`   ❌ Deposit simulation failed: ${error.message}`);
      
      // Try to decode the error
      if (error.data) {
        try {
          const decodedError = lendingContract.interface.parseError(error.data);
          console.log(`   📋 Decoded error: ${decodedError.name}`);
          console.log(`   📋 Error args: ${JSON.stringify(decodedError.args)}`);
        } catch (decodeError) {
          console.log(`   📋 Could not decode error: ${decodeError.message}`);
        }
      }
    }

  } catch (error) {
    console.error("❌ Error during debugging:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 
