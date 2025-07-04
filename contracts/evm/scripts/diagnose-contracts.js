const { ethers, network } = require("hardhat");

// Live Sepolia contract addresses from deployment
const DEPLOYED_CONTRACTS = {
  lendingPool: "0xDD5c505d69703230CFFfA1307753923302CEb586",
  chainlinkPriceFeed: "0x63efCbA94D2A1A4a9dF59A6e73514E0348ED31ff",
  permissions: "0xEAF4ECeBeE04f7D10c47ff31d152a82596D90800",
  syntheticUSDC: "0x7b0d1FCC2e4839Ae10a7F936bB2FFd411237068e"
};

async function main() {
  console.log("🔍 LAYERZERO CONTRACT DIAGNOSIS");
  console.log("===================================");
  
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  
  try {
    // Connect to LendingPool (LayerZero)
    console.log("\n🏦 DIAGNOSING LENDING POOL (LAYERZERO)...");
    const lendingPool = await ethers.getContractAt("LayerZeroLending", "0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40");
    
    // Check basic state
    try {
      const owner = await lendingPool.owner();
      console.log(`Owner: ${owner}`);
    } catch (error) {
      console.log(`❌ Owner check failed: ${error.message}`);
    }
    
    try {
      const isPaused = await lendingPool.paused();
      console.log(`Is Paused: ${isPaused}`);
    } catch (error) {
      console.log(`❌ Pause check failed: ${error.message}`);
    }
    
    try {
      const lzEndpoint = await lendingPool.endpoint();
      console.log(`LayerZero Endpoint: ${lzEndpoint}`);
    } catch (error) {
      console.log(`❌ LayerZero Endpoint check failed: ${error.message}`);
    }
    
    // Check contract bytecode
    console.log("\n🔍 Contract bytecode analysis...");
    const code = await ethers.provider.getCode("0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40");
    console.log(`Bytecode length: ${code.length} characters`);
    console.log(`Has substantial code: ${code.length > 100}`);
    
    console.log("\n💰 DIAGNOSING SYNTHETIC USDC...");
    const syntheticUSDC = await ethers.getContractAt("SyntheticAsset", "0xF61f5C31f1b453b3639BB22fd49b6027FC341Dd9");
    
    try {
      const name = await syntheticUSDC.name();
      const symbol = await syntheticUSDC.symbol();
      const decimals = await syntheticUSDC.decimals();
      
      console.log(`Name: ${name}`);
      console.log(`Symbol: ${symbol}`);
      console.log(`Decimals: ${decimals}`);
    } catch (error) {
      console.log(`❌ Synthetic USDC analysis failed: ${error.message}`);
    }
    
    console.log("\n🎯 DIAGNOSIS COMPLETE");
    
  } catch (error) {
    console.error("❌ DIAGNOSIS FAILED:", error);
    throw error;
  }
}

// Execute diagnosis
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main }; 
