"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAccount, useBalance, useWriteContract, useChainId, useReadContract, useWaitForTransactionReceipt, useEstimateGas } from 'wagmi';
import { type WriteContractParameters } from 'wagmi/actions';
import { formatEther, parseEther, Address } from 'viem';
import { LAYERZERO_LENDING_ABI, ERC20_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts';
import { toast } from "sonner";
import { ArrowDown, CheckCircle, XCircle, Loader, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getBlockExplorer } from '@/lib/utils';
import { Button } from './ui/button';

const assetsConfig = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000' as Address,
    logo: '/ethereum-logo.png',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xF61f5C31f1b453b3639BB22fd49b6027FC341Dd9' as Address, // LayerZero synthetic USDC
    logo: '/USDC.png',
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    address: '0x39CdAe9f7Cb7e06A165f8B4C6864850cCef5CC44' as Address,
    logo: '/ethereum-logo.png',
  }
];

interface BorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = 'input' | 'confirm' | 'sending' | 'success' | 'error';

export function BorrowModal({ isOpen, onClose }: BorrowModalProps) {
  const [selectedAsset, setSelectedAsset] = useState(assetsConfig[1]); // Default to USDC
  const [borrowAmount, setBorrowAmount] = useState('');
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>('input');
  const [txHash, setTxHash] = useState<Address | undefined>();

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContract, isPending: isSubmitting } = useWriteContract();
  
  const contractInfo = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  const lendingPoolAddress = contractInfo ? contractInfo.layerZeroLending as Address : undefined;

  const { data: userPosition, isLoading: positionLoading } = useReadContract({
    address: lendingPoolAddress,
    abi: LAYERZERO_LENDING_ABI,
    functionName: 'getUserPosition',
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
        enabled: !!address && !!lendingPoolAddress,
        refetchInterval: 5000,
    }
  });

  const [totalCollateralValue, totalBorrowValue, healthFactor] = userPosition || [0n, 0n, 0n];

  const { data: receipt, isLoading: isConfirming, isSuccess, isError, error } = useWaitForTransactionReceipt({ hash: txHash });

  const maxBorrowable = totalCollateralValue > totalBorrowValue 
    ? (totalCollateralValue - totalBorrowValue) * 75n / 100n // 75% LTV
    : 0n;

  useEffect(() => {
    if (isSuccess && receipt) {
      if (receipt.status === 'success') {
          setStep('success');
          toast.success("Transaction successful!");
      } else {
          setStep('error');
          toast.error("Transaction failed on-chain.");
      }
    }
    if (isError && error) {
        setStep('error');
        toast.error(error.message);
    }
  }, [isSuccess, isError, error, receipt, isConfirming]);

  useEffect(() => {
    if (!isOpen && !isConfirming) {
      // Reset state when modal is closed
      setTimeout(() => {
        setStep('input');
        setBorrowAmount('');
        setTxHash(undefined);
      }, 300)
    }
  }, [isOpen, isConfirming]);

  const handleBorrow = async () => {
    if (!borrowAmount || !lendingPoolAddress || !address) return;
    setStep('sending');
    try {
      const amountWei = parseEther(borrowAmount);
      const destChainSelector = 0; // For same-chain borrows for now
      const options = "0x"; // Placeholder for LayerZero options

      await writeContract({
        address: lendingPoolAddress,
        abi: LAYERZERO_LENDING_ABI,
        functionName: 'borrowCrossChain',
        args: [selectedAsset.address, amountWei, destChainSelector, address, options],
      });

      toast.success('Borrow transaction submitted!');
    } catch (error) {
        setStep('error');
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        toast.error(`Submission failed: ${errorMessage}`);
    }
  };

  const formatBorrowable = () => {
     if (positionLoading) return '...';
      return Number.parseFloat(formatEther(maxBorrowable)).toFixed(4);
  };

  const renderContent = () => {
    switch (step) {
      case 'input':
  return (
        <div className="py-4 space-y-6">
          {/* Asset Selector */}
          <div className="relative">
              <button onClick={() => setIsAssetSelectorOpen(!isAssetSelectorOpen)} className="w-full flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <Image src={selectedAsset.logo} alt={selectedAsset.name} width={32} height={32} className="rounded-full" />
              <div>
                    <p className="text-gray-900 font-semibold">{selectedAsset.symbol}</p>
                    <p className="text-gray-500 text-sm">{selectedAsset.name}</p>
                  </div>
                </div>
                <ArrowDown className={`w-5 h-5 text-gray-500 transition-transform ${isAssetSelectorOpen ? 'rotate-180' : ''}`} />
              </button>
            {isAssetSelectorOpen && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl">
                {assetsConfig.filter(a => a.symbol !== 'ETH').map(asset => (
                    <div key={asset.symbol} onClick={() => { setSelectedAsset(asset); setIsAssetSelectorOpen(false); setBorrowAmount(''); }} className="flex items-center space-x-3 p-4 hover:bg-gray-100 cursor-pointer">
                    <Image src={asset.logo} alt={asset.name} width={32} height={32} className="rounded-full" />
                    <div>
                        <p className="text-gray-900 font-semibold">{asset.symbol}</p>
                        <p className="text-gray-500 text-sm">{asset.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
                  </div>

                  {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
                <label className="text-sm font-medium text-gray-600">Amount</label>
                <p className="text-sm text-gray-500">Available to borrow: {formatBorrowable()} {selectedAsset.symbol}</p>
            </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={borrowAmount}
                        onChange={(e) => setBorrowAmount(e.target.value)}
                placeholder="0.0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-2xl font-mono text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/50"
                      />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                  <span className="text-gray-800 font-semibold">{selectedAsset.symbol}</span>
                  <Button onClick={() => setBorrowAmount(formatEther(maxBorrowable))} size="sm" variant="secondary">MAX</Button>
                </div>
              </div>
            </div>
  
            {/* Continue Button */}
            <Button
              onClick={() => setStep('confirm')}
              disabled={!borrowAmount || Number.parseFloat(borrowAmount) <= 0 || parseEther(borrowAmount) > maxBorrowable}
              className="w-full"
            >
              {borrowAmount && parseEther(borrowAmount) > maxBorrowable ? 'Insufficient Collateral' : 'Continue'}
            </Button>
          </div>
        );
      case 'confirm':
        return (
            <div className="py-4 space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className='flex items-center'>
                        <Image src={selectedAsset.logo} alt={selectedAsset.name} width={40} height={40} className="rounded-full" />
                        <div className="ml-3">
                            <p className="font-bold text-xl text-gray-900">{borrowAmount} {selectedAsset.symbol}</p>
                            <p className="text-gray-500">Amount to Borrow</p>
                      </div>
                    </div>
                  </div>

                <div className="border-t border-gray-200 my-4" />

                <h3 className="text-lg font-semibold text-gray-800">Transaction Details</h3>
                
                <div className="border-t border-gray-200 my-4" />

                <Button onClick={handleBorrow} className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Confirming in wallet...' : 'Confirm Borrow'}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep('input')}>Back</Button>
          </div>
        )
    case 'sending':
        return (
            <div className="py-12 flex flex-col items-center justify-center text-center">
                <Loader className="w-16 h-16 text-blue-600 animate-spin mb-4" />
                <h3 className="text-xl font-semibold text-gray-800">Processing Transaction</h3>
                <p className="text-gray-500">Waiting for confirmation on the blockchain...</p>
            </div>
        )
    case 'success':
        return (
            <div className="py-12 flex flex-col items-center justify-center text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800">Borrow Successful</h3>
                <p className="text-gray-500">Your funds will be available shortly.</p>
                {txHash && (
                    <a href={`${getBlockExplorer(chainId)}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="mt-4 text-blue-600 hover:underline">
                        View on Explorer
                    </a>
                )}
                <Button onClick={onClose} className="mt-6">Close</Button>
            </div>
        )
    case 'error':
        return (
            <div className="py-12 flex flex-col items-center justify-center text-center">
                <XCircle className="w-16 h-16 text-red-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800">Transaction Failed</h3>
                <p className="text-gray-500 max-w-sm">{error?.message || "An unknown error occurred."}</p>
                 {txHash && (
                    <a href={`${getBlockExplorer(chainId)}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="mt-4 text-blue-600 hover:underline">
                        View on Explorer
                    </a>
                )}
                <Button onClick={() => setStep('input')} className="mt-6">Try Again</Button>
            </div>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrow</DialogTitle>
          <DialogDescription>
            Borrow assets against your deposited collateral.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
} 
