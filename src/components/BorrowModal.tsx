"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAccount, useBalance, useWriteContract, useChainId, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, Address } from 'viem';
import { LENDING_POOL_ABI } from '@/lib/contracts';
import { CONTRACT_ADDRESSES } from '@/lib/wagmi';
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

// Mock asset configuration - replace with dynamic fetching
const assetsToBorrow = [
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
];

interface BorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = 'input' | 'confirm' | 'sending' | 'success' | 'error';

export function BorrowModal({ isOpen, onClose }: BorrowModalProps) {
  const [selectedAsset, setSelectedAsset] = useState(assetsToBorrow[0]);
  const [borrowAmount, setBorrowAmount] = useState('');
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>('input');
  const [txHash, setTxHash] = useState<Address | undefined>();

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContract, isPending: isSubmitting } = useWriteContract();
  
  const contractInfo = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  const lendingPoolAddress = contractInfo ? contractInfo.lendingPool as Address : undefined;

  const { data: userPosition, isLoading: positionLoading } = useReadContract({
    address: lendingPoolAddress,
    abi: LENDING_POOL_ABI,
    functionName: 'getUserPosition',
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: {
        enabled: !!address && !!lendingPoolAddress,
        refetchInterval: 5000,
    }
  });

  const [totalCollateralValue, totalBorrowValue, healthFactor] = userPosition || [0n, 0n, 0n];

  const maxBorrowable = totalCollateralValue > totalBorrowValue 
    ? (totalCollateralValue - totalBorrowValue) * 80n / 100n // Assume 80% LTV for simplicity
    : 0n;

  const { data: receipt, isLoading: isConfirming, isSuccess, isError, error } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess && receipt) {
      if (receipt.status === 'success') {
          setStep('success');
          toast.success("Borrow successful!");
      } else {
          setStep('error');
          toast.error("Transaction failed on-chain.");
      }
    }
    if (isError && error) {
        setStep('error');
        toast.error(error.message);
    }
  }, [isSuccess, isError, error, receipt]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('input');
        setBorrowAmount('');
        setTxHash(undefined);
      }, 500)
    }
  }, [isOpen]);

  const handleBorrow = () => {
    if (!borrowAmount || !lendingPoolAddress || !address) return;
    setStep('sending');
    const amount = parseEther(borrowAmount);
    
    // For now, destination chain is same as source, and receiver is the user
    const destChainSelector = 16015286601757825753n; // Sepolia

    writeContract({
      address: lendingPoolAddress,
      abi: LENDING_POOL_ABI,
      functionName: 'borrow',
      args: [selectedAsset.address, amount, destChainSelector, address],
    }, {
      onSuccess: setTxHash,
      onError: (error) => {
        setStep('error');
        toast.error(`Submission failed: ${error.message}`);
      }
    });
  };

  const formatBorrowable = () => {
    if (positionLoading) return '...';
    // This is a simplification. Real calculation needs asset prices.
    return Number.parseFloat(formatEther(maxBorrowable)).toFixed(4);
  }

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
                    {assetsToBorrow.map(asset => (
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
                    <p className="text-sm text-gray-500">Available to borrow: {formatBorrowable()} ETH</p>
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
                        <Button onClick={() => setBorrowAmount(formatBorrowable())} size="sm" variant="secondary">MAX</Button>
                    </div>
                </div>
            </div>

            {/* Health Factor Info */}
            <div className="text-sm text-center text-gray-500">
                Health Factor: {healthFactor ? (Number(healthFactor) / 1e18).toFixed(2) : 'N/A'}
            </div>

            <Button
                onClick={() => setStep('confirm')}
                disabled={!borrowAmount || Number.parseFloat(borrowAmount) <= 0 || parseEther(borrowAmount) > maxBorrowable}
                className="w-full"
            >
                {borrowAmount && parseEther(borrowAmount) > maxBorrowable ? 'Amount exceeds borrow limit' : 'Continue'}
            </Button>
          </div>
        );
    case 'confirm':
        // A more complex calculation is needed for the new health factor
        const newHealthFactor = healthFactor ? (Number(healthFactor) / 1e18).toFixed(2) : 'N/A';
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
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                        <span>Origination Fee</span>
                        <span className="font-mono">0.10 %</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Borrow APY</span>
                        <span className="font-mono">2.5 %</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Cross-Chain Fee</span>
                        <span className="font-mono">~0.005 ETH</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Health Factor</span>
                        <span className="font-mono">{ (Number(healthFactor) / 1e18).toFixed(2) } {'->'} {newHealthFactor}</span>
                    </div>
                </div>

                <div className="border-t border-gray-200 my-4" />

                <Button onClick={handleBorrow} className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Confirming in wallet...' : 'Confirm Borrow'}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep('input')}>Back</Button>
            </div>
        )
    case 'sending':
    case 'success':
    case 'error':
        return (
            <div className="py-12 flex flex-col items-center justify-center text-center">
                {step === 'sending' && <Loader className="w-16 h-16 text-blue-600 animate-spin mb-4" />}
                {step === 'success' && <CheckCircle className="w-16 h-16 text-green-500 mb-4" />}
                {step === 'error' && <XCircle className="w-16 h-16 text-red-500 mb-4" />}
                
                <h3 className="text-xl font-semibold text-gray-800">
                    {step === 'sending' && 'Processing Transaction'}
                    {step === 'success' && 'Borrow Successful!'}
                    {step === 'error' && 'Transaction Failed'}
                </h3>
                
                <p className="text-gray-500">
                    {step === 'sending' && 'Waiting for confirmation on the blockchain...'}
                    {step === 'success' && `You have borrowed ${borrowAmount} ${selectedAsset.symbol}.`}
                    {step === 'error' && 'Something went wrong with your borrow request.'}
                </p>

                {step === 'success' && txHash && (
                    <a 
                        href={`${getBlockExplorer(chainId)}/tx/${txHash}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline mt-4"
                    >
                        View on Block Explorer
                    </a>
                )}

                {step === 'success' && <Button onClick={onClose} className="mt-6 w-full">Done</Button>}
                {step === 'error' && <Button onClick={() => setStep('input')} className="mt-6 w-full">Try Again</Button>}
            </div>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white text-gray-900">
        <DialogHeader>
            {step === 'confirm' && (
                <button onClick={() => setStep('input')} className="absolute left-4 top-4 text-gray-500 hover:text-gray-800">
                    <ArrowLeft className="h-6 w-6" />
                </button>
            )}
          <DialogTitle className="text-2xl font-bold text-center">
            {step === 'input' && 'Borrow Assets'}
            {step === 'confirm' && 'Confirm Borrow'}
            {step === 'sending' && 'Processing'}
            {step === 'success' && 'Success'}
            {step === 'error' && 'Error'}
          </DialogTitle>
          <DialogDescription className="text-center text-gray-500">
            {step === 'input' && 'Borrow assets against your deposited collateral.'}
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
} 
