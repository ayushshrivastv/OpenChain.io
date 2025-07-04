import type { Address } from "viem";

// 🌐 Network Configuration
export const SUPPORTED_CHAINS = {
  sepolia: 11155111,
  mumbai: 80001,
  solana: "devnet",
} as const;

export type SupportedChainId =
  (typeof SUPPORTED_CHAINS)[keyof typeof SUPPORTED_CHAINS];

// 🔗 Official Chainlink CCIP Configuration (REAL TESTNET ADDRESSES)
export const CCIP_CONFIG = {
  [SUPPORTED_CHAINS.sepolia]: {
    name: "Ethereum Sepolia",
    rpcUrl: "https://ethereum-sepolia.publicnode.com",
    router: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59" as Address,
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789" as Address,
    chainSelector: "16015286601757825753",
    nativeCurrency: "ETH",
    blockExplorer: "https://sepolia.etherscan.io",
    faucets: ["https://sepoliafaucet.com/", "https://faucets.chain.link/"],
  },
  [SUPPORTED_CHAINS.mumbai]: {
    name: "Polygon Mumbai",
    rpcUrl: "https://polygon-mumbai.gateway.tenderly.co",
    router: "0x1035CabC275068e0F4b745A29CEDf38E13aF41b1" as Address,
    linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB" as Address,
    chainSelector: "12532609583862916517",
    nativeCurrency: "MATIC",
    blockExplorer: "https://mumbai.polygonscan.com",
    faucets: [
      "https://faucet.polygon.technology/",
      "https://faucets.chain.link/",
    ],
  },
} as const;

// 📋 Contract Addresses - Updated via deployment
export interface DeployedContracts {
  lendingPool: Address;
  priceFeed: Address;
  permissions: Address;
  rateLimiter: Address;
  liquidationManager: Address;
  synthUSDC: Address;
  synthWETH: Address;
  ccipRouter: Address;
  linkToken: Address;
  layerZeroLending?: Address; // LayerZero contract
}

// 🏗️ Contract addresses - REAL DEPLOYED ADDRESSES (FIXED DEPLOYMENT)
export const CONTRACT_ADDRESSES: Record<number, DeployedContracts> = {
  // Sepolia contracts - FIXED DEPLOYMENT ADDRESSES
  [SUPPORTED_CHAINS.sepolia]: {
    lendingPool: "0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40" as Address, // LayerZero contract
    priceFeed: "0x2E38242Ff1FDa1783fdA682c24A3f409b5c8163f" as Address,
    permissions: "0xe5D4a658583D66a124Af361070c6135A6ce33F5a" as Address,
    rateLimiter: "0x4FFc21015131556B90A86Ab189D9Cba970683205" as Address,
    liquidationManager: "0x53E0672c2280e621f29dCC47696043d6B436F970" as Address,
    synthUSDC: "0xF61f5C31f1b453b3639BB22fd49b6027FC341Dd9" as Address, // LayerZero synthetic USDC
    synthWETH: "0x39CdAe9f7Cb7e06A165f8B4C6864850cCef5CC44" as Address,
    ccipRouter: CCIP_CONFIG[SUPPORTED_CHAINS.sepolia].router,
    linkToken: CCIP_CONFIG[SUPPORTED_CHAINS.sepolia].linkToken,
    layerZeroLending: "0xFb9EeBeBc3958bff5D760D853c2Bb3392146A614" as Address, // NEW Deployed LayerZero contract
  },

  // Mumbai contracts - to be populated by deployment
  [SUPPORTED_CHAINS.mumbai]: {
    lendingPool: "0x0000000000000000000000000000000000000000" as Address,
    priceFeed: "0x0000000000000000000000000000000000000000" as Address,
    permissions: "0x0000000000000000000000000000000000000000" as Address,
    rateLimiter: "0x0000000000000000000000000000000000000000" as Address,
    liquidationManager: "0x0000000000000000000000000000000000000000" as Address,
    synthUSDC: "0x0000000000000000000000000000000000000000" as Address,
    synthWETH: "0x0000000000000000000000000000000000000000" as Address,
    ccipRouter: CCIP_CONFIG[SUPPORTED_CHAINS.mumbai].router,
    linkToken: CCIP_CONFIG[SUPPORTED_CHAINS.mumbai].linkToken,
  },
};

// 🔍 Utility functions
export function getContractAddresses(
  chainId: number,
): DeployedContracts | null {
  return CONTRACT_ADDRESSES[chainId] || null;
}

export function getCCIPConfig(chainId: number) {
  return CCIP_CONFIG[chainId as keyof typeof CCIP_CONFIG] || null;
}

export function isChainSupported(chainId: number): boolean {
  return Object.values(SUPPORTED_CHAINS).includes(chainId as SupportedChainId);
}

// 💰 Asset Configuration
export const SUPPORTED_ASSETS = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    isCollateral: true,
  },
  WETH: {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    decimals: 18,
    isCollateral: true,
  },
  sUSDC: {
    symbol: "sUSDC",
    name: "Synthetic USDC",
    decimals: 6,
    isCollateral: false,
  },
  sWETH: {
    symbol: "sWETH",
    name: "Synthetic WETH",
    decimals: 18,
    isCollateral: false,
  },
} as const;

// 🚨 Validation helpers
export function validateDeployment(): boolean {
  for (const [chainId, contracts] of Object.entries(CONTRACT_ADDRESSES)) {
    const zeroAddress = "0x0000000000000000000000000000000000000000";

    // Check if core contracts are deployed (not zero address)
    if (contracts.lendingPool === zeroAddress) {
      console.warn(`⚠️ LendingPool not deployed on chain ${chainId}`);
      return false;
    }
  }
  return true;
}

// 🔄 Dynamic config update (called by deployment script)
export function updateContractAddresses(
  chainId: number,
  contracts: DeployedContracts,
) {
  CONTRACT_ADDRESSES[chainId] = contracts;
  console.log(`✅ Updated contract addresses for chain ${chainId}`);
}

// Contract ABIs - Essential functions for the DeFi protocol
export const LAYERZERO_LENDING_ABI = [
  // Core lending functions
  {
    "name": "deposit",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [
      { "name": "asset", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": []
  },
  {
    "name": "borrowCrossChain",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [
      { "name": "asset", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "destEid", "type": "uint32" },
      { "name": "receiver", "type": "address" },
      { "name": "_options", "type": "bytes" }
    ],
    "outputs": []
  },
  {
    "name": "repay",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "asset", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": []
  },
   // View functions
  {
    "name": "getUserPosition",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "user", "type": "address" }],
    "outputs": [
      { "name": "totalCollateralValue", "type": "uint256" },
      { "name": "totalBorrowValue", "type": "uint256" },
      { "name": "healthFactor", "type": "uint256" }
    ]
  },
  {
    "name": "supportedAssets",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "asset", "type": "address" }],
    "outputs": [
      { "name": "token", "type": "address" },
      { "name": "synthToken", "type": "address" },
      { "name": "decimals", "type": "uint256" },
      { "name": "ltv", "type": "uint256" },
      { "name": "isActive", "type": "bool" },
      { "name": "priceFeed", "type": "address" }
    ]
  }
] as const;


export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "allowance", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "decimals", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "symbol", type: "string" }],
  },
] as const;

// Liquidation Manager ABI
export const LIQUIDATION_MANAGER_ABI = [
  {
    name: "liquidate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "collateralAsset", type: "address" },
      { name: "debtAsset", type: "address" },
      { name: "debtAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "calculateLiquidationAmount",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "collateralAsset", type: "address" },
      { name: "debtAsset", type: "address" },
    ],
    outputs: [
      { name: "maxLiquidation", type: "uint256" },
      { name: "collateralSeized", type: "uint256" },
    ],
  },
  {
    name: "canLiquidate",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "canLiquidate", type: "bool" },
      { name: "healthFactor", type: "uint256" },
    ],
  },
] as const;

// Chainlink CCIP Router ABI (essential functions)
export const CCIP_ROUTER_ABI = [
  {
    name: "ccipSend",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "destinationChainSelector", type: "uint64" },
      {
        name: "message",
        type: "tuple",
        components: [
          { name: "receiver", type: "bytes" },
          { name: "data", type: "bytes" },
          {
            name: "tokenAmounts",
            type: "tuple[]",
            components: [
              { name: "token", type: "address" },
              { name: "amount", type: "uint256" },
            ],
          },
          { name: "extraArgs", type: "bytes" },
          { name: "feeToken", type: "address" },
        ],
      },
    ],
    outputs: [{ name: "messageId", type: "bytes32" }],
  },
  {
    name: "getFee",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "destinationChainSelector", type: "uint64" },
      {
        name: "message",
        type: "tuple",
        components: [
          { name: "receiver", type: "bytes" },
          { name: "data", type: "bytes" },
          {
            name: "tokenAmounts",
            type: "tuple[]",
            components: [
              { name: "token", type: "address" },
              { name: "amount", type: "uint256" },
            ],
          },
          { name: "extraArgs", type: "bytes" },
          { name: "feeToken", type: "address" },
        ],
      },
    ],
    outputs: [{ name: "fee", type: "uint256" }],
  },
  {
    name: "isChainSupported",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "chainSelector", type: "uint64" }],
    outputs: [{ name: "supported", type: "bool" }],
  },
] as const;

// Utility functions for contract interactions
export function formatUnits(value: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const quotient = value / divisor;
  const remainder = value % divisor;

  if (remainder === 0n) {
    return quotient.toString();
  }

  const remainderStr = remainder.toString().padStart(decimals, "0");
  const trimmedRemainder = remainderStr.replace(/0+$/, "");

  return trimmedRemainder
    ? `${quotient}.${trimmedRemainder}`
    : quotient.toString();
}

export function parseUnits(value: string, decimals: number): bigint {
  const [integer, fractional = ""] = value.split(".");
  const fractionalPadded = fractional.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(integer + fractionalPadded);
}

export function formatCurrency(
  value: bigint,
  decimals: number,
  symbol: string,
): string {
  const formatted = formatUnits(value, decimals);
  return `${formatted} ${symbol}`;
}

export function calculateHealthFactor(
  totalCollateralValue: bigint,
  totalBorrowValue: bigint,
  liquidationThreshold: bigint,
): bigint {
  if (totalBorrowValue === 0n) {
    return BigInt(Number.MAX_SAFE_INTEGER); // Effectively infinite
  }

  return (
    (totalCollateralValue * liquidationThreshold) / (totalBorrowValue * 100n)
  );
}

// Chainlink Security Contract ABI
export const CHAINLINK_SECURITY_ABI = [
  {
    name: "requestLiquidatorSelection",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "requestId", type: "uint256" }],
  },
  {
    name: "getSecurityStatus",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "currentSecurityScore", type: "uint256" },
      { name: "isEmergencyMode", type: "bool" },
      { name: "emergencyCount", type: "uint256" },
      { name: "lastCheck", type: "uint256" },
      { name: "liquidatorCount", type: "uint256" },
    ],
  },
  {
    name: "getUserSecurityProfile",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      {
        name: "profile",
        type: "tuple",
        components: [
          { name: "riskScore", type: "uint256" },
          { name: "lastActivity", type: "uint256" },
          { name: "liquidationHistory", type: "uint256" },
          { name: "isHighRisk", type: "bool" },
          { name: "securityDelay", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getLiquidationRequest",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [
      {
        name: "request",
        type: "tuple",
        components: [
          { name: "user", type: "address" },
          { name: "liquidator", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "timestamp", type: "uint256" },
          { name: "executed", type: "bool" },
          { name: "isEmergency", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "addLiquidator",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "liquidator", type: "address" }],
    outputs: [],
  },
  {
    name: "disableEmergencyMode",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "SecurityAlert",
    type: "event",
    anonymous: false,
    inputs: [
      { name: "alertType", type: "string", indexed: false },
      { name: "user", type: "address", indexed: true },
      { name: "severity", type: "uint256", indexed: false },
      { name: "details", type: "string", indexed: false },
    ],
  },
  {
    name: "LiquidationQueued",
    type: "event",
    anonymous: false,
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "liquidator", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "AutomationExecuted",
    type: "event",
    anonymous: false,
    inputs: [
      { name: "taskType", type: "string", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
      { name: "data", type: "bytes", indexed: false },
    ],
  },
] as const;

// TimeLock Contract ABI
export const TIMELOCK_ABI = [
  {
    name: "getOperationDelay",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "target", type: "address" },
      { name: "selector", type: "bytes4" },
    ],
    outputs: [{ name: "delay", type: "uint256" }],
  },
  {
    name: "scheduleWithType",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "predecessor", type: "bytes32" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "emergencyExecute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "predecessor", type: "bytes32" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "isOperation",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [{ name: "pending", type: "bool" }],
  },
  {
    name: "isOperationReady",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [{ name: "ready", type: "bool" }],
  },
] as const;

// Chainlink VRF Coordinator ABI
export const VRF_COORDINATOR_ABI = [
  {
    name: "requestRandomWords",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "keyHash", type: "bytes32" },
      { name: "subId", type: "uint64" },
      { name: "minimumRequestConfirmations", type: "uint16" },
      { name: "callbackGasLimit", type: "uint32" },
      { name: "numWords", type: "uint32" },
    ],
    outputs: [{ name: "requestId", type: "uint256" }],
  },
  {
    name: "getSubscription",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "subId", type: "uint64" }],
    outputs: [
      { name: "balance", type: "uint96" },
      { name: "reqCount", type: "uint64" },
      { name: "owner", type: "address" },
      { name: "consumers", type: "address[]" },
    ],
  },
  {
    name: "addConsumer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "subId", type: "uint64" },
      { name: "consumer", type: "address" },
    ],
    outputs: [],
  },
] as const;

// Chainlink Automation Registry ABI
export const AUTOMATION_REGISTRY_ABI = [
  {
    name: "getUpkeep",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "upkeep",
        type: "tuple",
        components: [
          { name: "target", type: "address" },
          { name: "executeGas", type: "uint32" },
          { name: "checkData", type: "bytes" },
          { name: "balance", type: "uint96" },
          { name: "admin", type: "address" },
          { name: "maxValidBlocknumber", type: "uint64" },
          { name: "lastKeeperId", type: "uint256" },
          { name: "amountSpent", type: "uint96" },
          { name: "paused", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "addFunds",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint96" },
    ],
    outputs: [],
  },
  {
    name: "pauseUpkeep",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    name: "unpauseUpkeep",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
] as const;
