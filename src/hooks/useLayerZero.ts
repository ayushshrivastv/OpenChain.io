import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useChainId, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { toast } from 'sonner';

// LayerZero contract addresses
const LAYERZERO_ADDRESSES = {
  [11155111]: { // Sepolia
    lendingPool: '0x6e68fA3EF36f41c4c3031a8B721727EC577F5E40', // NEW Deployed LayerZero contract
    endpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f',
  }
};

// LayerZero Chain IDs
const LAYERZERO_CHAIN_IDS = {
  SEPOLIA: 40161,
  SOLANA: 40168,
  ARBITRUM_SEPOLIA: 40231,
  OPTIMISM_SEPOLIA: 40232,
};

// LayerZero Lending Pool ABI (simplified)
const LAYERZERO_LENDING_POOL_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "asset", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable", // Fixed: deposit is payable
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "asset", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint32", "name": "destEid", "type": "uint32"},
      {"internalType": "address", "name": "receiver", "type": "address"},
      {"internalType": "bytes", "name": "_options", "type": "bytes"}
    ],
    "name": "borrowCrossChain",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "asset", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint32", "name": "srcEid", "type": "uint32"},
      {"internalType": "bytes", "name": "_options", "type": "bytes"}
    ],
    "name": "repayCrossChain",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getUserPosition",
    "outputs": [
      {"internalType": "uint256", "name": "totalCollateralValue", "type": "uint256"},
      {"internalType": "uint256", "name": "totalBorrowValue", "type": "uint256"},
      {"internalType": "uint256", "name": "healthFactor", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint32", "name": "destEid", "type": "uint32"},
      {"internalType": "tuple", "name": "message", "type": "tuple", "components": [
        {"internalType": "address", "name": "user", "type": "address"},
        {"internalType": "string", "name": "action", "type": "string"},
        {"internalType": "address", "name": "asset", "type": "address"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"},
        {"internalType": "uint32", "name": "srcEid", "type": "uint32"},
        {"internalType": "uint32", "name": "dstEid", "type": "uint32"},
        {"internalType": "address", "name": "receiver", "type": "address"},
        {"internalType": "uint256", "name": "nonce", "type": "uint256"}
      ]},
      {"internalType": "bytes", "name": "options", "type": "bytes"}
    ],
    "name": "quoteCrossChainFee",
    "outputs": [
      {"internalType": "tuple", "name": "fee", "type": "tuple", "components": [
        {"internalType": "uint256", "name": "nativeFee", "type": "uint256"},
        {"internalType": "uint256", "name": "lzTokenFee", "type": "uint256"}
      ]}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

interface LayerZeroTransaction {
  id: string;
  type: 'deposit' | 'borrow' | 'repay' | 'withdraw';
  asset: string;
  amount: string;
  srcChain: number;
  dstChain?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  lzMessageId?: string;
  timestamp: number;
}

export function useLayerZero() {
  const [transactions, setTransactions] = useState<LayerZeroTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chainId = useChainId();
  const { address } = useAccount();

  // Get contract address for current chain
  const contractAddress = LAYERZERO_ADDRESSES[chainId as keyof typeof LAYERZERO_ADDRESSES]?.lendingPool;

  // Write contract hook
  const { writeContract, isPending, error } = useWriteContract();

  // Deposit function
  const deposit = useCallback(async (
    asset: string,
    amount: string,
    onSuccess?: (txHash: string) => void,
    onError?: (error: Error) => void
  ) => {
    if (!contractAddress) {
      const error = new Error('LayerZero contract not deployed on this chain');
      onError?.(error);
      return;
    }

    try {
      setIsLoading(true);
      
      const amountWei = parseEther(amount);
      
      // Add transaction to state
      const transaction: LayerZeroTransaction = {
        id: Date.now().toString(),
        type: 'deposit',
        asset,
        amount,
        srcChain: chainId,
        status: 'pending',
        timestamp: Date.now(),
      };
      
      setTransactions(prev => [transaction, ...prev]);
      
      // For ETH deposits, include value parameter
      if (asset === '0x0000000000000000000000000000000000000000') {
        // ETH deposit with value
        writeContract({
          address: contractAddress as `0x${string}`,
          abi: LAYERZERO_LENDING_POOL_ABI,
          functionName: 'deposit' as const,
          args: [asset as `0x${string}`, amountWei],
          value: amountWei
        });
      } else {
        // ERC20 deposit without value
        writeContract({
          address: contractAddress as `0x${string}`,
          abi: LAYERZERO_LENDING_POOL_ABI,
          functionName: 'deposit' as const,
          args: [asset as `0x${string}`, amountWei]
        });
      }
      
      toast.success('Deposit transaction submitted');
      
    } catch (error) {
      console.error('Deposit failed:', error);
      const err = error as Error;
      onError?.(err);
      toast.error(`Deposit failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, chainId, writeContract]);

  // Cross-chain borrow function
  const borrowCrossChain = useCallback(async (
    asset: string,
    amount: string,
    destChain: 'solana' | 'sepolia' | 'arbitrum' | 'optimism',
    receiver?: string,
    onSuccess?: (txHash: string) => void,
    onError?: (error: Error) => void
  ) => {
    if (!contractAddress) {
      const error = new Error('LayerZero contract not deployed on this chain');
      onError?.(error);
      return;
    }

    try {
      setIsLoading(true);
      
      const amountWei = parseEther(amount);
      const destEid = getChainEid(destChain);
      const receiverAddress = receiver || address;
      
      // Basic LayerZero options (can be customized)
      const options = '0x0003010011010000000000000000000000000000ea60'; // Basic options
      
      // Estimate fee first
      const message = {
        user: address,
        action: 'borrow',
        asset,
        amount: amountWei,
        srcEid: chainId,
        dstEid: destEid,
        receiver: receiverAddress,
        nonce: BigInt(Date.now())
      };
      
      // Add transaction to state
      const transaction: LayerZeroTransaction = {
        id: Date.now().toString(),
        type: 'borrow',
        asset,
        amount,
        srcChain: chainId,
        dstChain: destEid,
        status: 'pending',
        timestamp: Date.now(),
      };
      
      setTransactions(prev => [transaction, ...prev]);
      
      writeContract({
        address: contractAddress as `0x${string}`,
        abi: LAYERZERO_LENDING_POOL_ABI,
        functionName: 'borrowCrossChain',
        args: [
          asset as `0x${string}`,
          amountWei,
          destEid,
          receiverAddress as `0x${string}`,
          options as `0x${string}`
        ],
        value: parseEther('0.01'), // Estimated LayerZero fee
      });
      
      toast.success('Cross-chain borrow transaction submitted');
      
    } catch (error) {
      console.error('Cross-chain borrow failed:', error);
      const err = error as Error;
      onError?.(err);
      toast.error(`Cross-chain borrow failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, chainId, address, writeContract]);

  // Cross-chain repay function
  const repayCrossChain = useCallback(async (
    asset: string,
    amount: string,
    srcChain: 'solana' | 'sepolia' | 'arbitrum' | 'optimism',
    onSuccess?: (txHash: string) => void,
    onError?: (error: Error) => void
  ) => {
    if (!contractAddress) {
      const error = new Error('LayerZero contract not deployed on this chain');
      onError?.(error);
      return;
    }

    try {
      setIsLoading(true);
      
      const amountWei = parseEther(amount);
      const srcEid = getChainEid(srcChain);
      
      // Basic LayerZero options
      const options = '0x0003010011010000000000000000000000000000ea60';
      
      // Add transaction to state
      const transaction: LayerZeroTransaction = {
        id: Date.now().toString(),
        type: 'repay',
        asset,
        amount,
        srcChain: chainId,
        dstChain: srcEid,
        status: 'pending',
        timestamp: Date.now(),
      };
      
      setTransactions(prev => [transaction, ...prev]);
      
      writeContract({
        address: contractAddress as `0x${string}`,
        abi: LAYERZERO_LENDING_POOL_ABI,
        functionName: 'repayCrossChain',
        args: [
          asset as `0x${string}`,
          amountWei,
          srcEid,
          options as `0x${string}`
        ],
        value: parseEther('0.01'), // Estimated LayerZero fee
      });
      
      toast.success('Cross-chain repay transaction submitted');
      
    } catch (error) {
      console.error('Cross-chain repay failed:', error);
      const err = error as Error;
      onError?.(err);
      toast.error(`Cross-chain repay failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, chainId, writeContract]);

  // Helper function to get LayerZero chain EID
  const getChainEid = (chain: string): number => {
    switch (chain.toLowerCase()) {
      case 'sepolia':
        return LAYERZERO_CHAIN_IDS.SEPOLIA;
      case 'solana':
        return LAYERZERO_CHAIN_IDS.SOLANA;
      case 'arbitrum':
        return LAYERZERO_CHAIN_IDS.ARBITRUM_SEPOLIA;
      case 'optimism':
        return LAYERZERO_CHAIN_IDS.OPTIMISM_SEPOLIA;
      default:
        return LAYERZERO_CHAIN_IDS.SEPOLIA;
    }
  };

  // Update transaction status
  const updateTransaction = useCallback((id: string, updates: Partial<LayerZeroTransaction>) => {
    setTransactions(prev => prev.map(tx => 
      tx.id === id ? { ...tx, ...updates } : tx
    ));
  }, []);

  // Get user position
  const getUserPosition = useCallback(async (userAddress: string) => {
    if (!contractAddress) return null;
    
    try {
      // This would need to be implemented with useReadContract
      // For now, return placeholder data
      return {
        totalCollateralValue: '0',
        totalBorrowValue: '0',
        healthFactor: '0'
      };
    } catch (error) {
      console.error('Failed to get user position:', error);
      return null;
    }
  }, [contractAddress]);

  return {
    // State
    transactions,
    isLoading: isLoading || isPending,
    error,
    
    // Actions
    deposit,
    borrowCrossChain,
    repayCrossChain,
    getUserPosition,
    updateTransaction,
    
    // Utils
    contractAddress,
    chainId,
    LAYERZERO_CHAIN_IDS,
  };
} 
 