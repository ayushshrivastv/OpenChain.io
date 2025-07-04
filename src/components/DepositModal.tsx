"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAccount, useBalance, useWriteContract, useChainId, useEstimateGas, useWaitForTransactionReceipt } from 'wagmi';
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

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = 'input' | 'confirm' | 'sending' | 'success' | 'error';

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [selectedAsset, setSelectedAsset] = useState(assetsConfig[0]);
  const [depositAmount, setDepositAmount] = useState('');
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>('input');
  const [txHash, setTxHash] = useState<Address | undefined>();

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { writeContract, isPending: isSubmitting } = useWriteContract();
  
  const contractInfo = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  const lendingPoolAddress = contractInfo ? contractInfo.layerZeroLending as Address : undefined;

  const { data: balance, isLoading: balanceLoading } = useBalance({
    address: address,
    token: selectedAsset.symbol === 'ETH' ? undefined : selectedAsset.address,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 5000,
    }
  });

  const { data: estimatedGas } = useEstimateGas({
    to: lendingPoolAddress,
    value: selectedAsset.symbol === 'ETH' ? parseEther(depositAmount || '0') : 0n,
    query: {
        enabled: !!lendingPoolAddress && !!depositAmount && Number.parseFloat(depositAmount) > 0,
    }
  })

  const { data: receipt, isLoading: isConfirming, isSuccess, isError, error } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess && receipt) {
      if (receipt.status === 'success') {
          setStep('success');
          toast.success("Deposit successful!");
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
      // Reset state when modal is closed, but not if a transaction is confirming
      setTimeout(() => {
        setStep('input');
        setDepositAmount('');
        setTxHash(undefined);
      }, 300)
    }
  }, [isOpen, isConfirming]);

  const handleDeposit = () => {
    if (!depositAmount || !lendingPoolAddress) return;
    setStep('sending');
    const amount = parseEther(depositAmount);
      
    const isNative = selectedAsset.address === '0x0000000000000000000000000000000000000000';
    
    const config: WriteContractParameters = {
      address: lendingPoolAddress,
      abi: LAYERZERO_LENDING_ABI,
      functionName: 'deposit',
      args: [selectedAsset.address, amount],
      value: isNative ? amount : 0n,
    };

    writeContract(config, {
      onSuccess: setTxHash,
      onError: (error) => {
        setStep('error');
        toast.error(`Submission failed: ${error.message}`);
      }
    });
  };

  const formatBalance = () => {
    if (balanceLoading) return '...';
    if (!balance?.value) return '0.0000';
    return Number.parseFloat(formatEther(balance.value)).toFixed(4);
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
                {assetsConfig.map(asset => (
                    <div key={asset.symbol} onClick={() => { setSelectedAsset(asset); setIsAssetSelectorOpen(false); setDepositAmount(''); }} className="flex items-center space-x-3 p-4 hover:bg-gray-100 cursor-pointer">
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
                <p className="text-sm text-gray-500">Balance: {formatBalance()}</p>
            </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-2xl font-mono text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/50"
                      />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                  <span className="text-gray-800 font-semibold">{selectedAsset.symbol}</span>
                  <Button onClick={() => setDepositAmount(formatBalance())} size="sm" variant="secondary">MAX</Button>
                </div>
              </div>
            </div>
  
            {/* Continue Button */}
            <Button
              onClick={() => setStep('confirm')}
              disabled={!depositAmount || Number.parseFloat(depositAmount) <= 0 || (balance && parseEther(depositAmount) > balance.value)}
              className="w-full"
            >
              {balance && depositAmount && parseEther(depositAmount) > balance.value ? 'Insufficient Balance' : 'Continue'}
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
                            <p className="font-bold text-xl text-gray-900">{depositAmount} {selectedAsset.symbol}</p>
                            <p className="text-gray-500">Amount to Deposit</p>
                      </div>
                    </div>
                  </div>

                <div className="border-t border-gray-200 my-4" />

                <h3 className="text-lg font-semibold text-gray-800">Transaction Details</h3>
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                        <span>Collateral Fee</span>
                        <span className="font-mono">0.10 %</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Gas Fee</span>
                        <span className="font-mono">~{estimatedGas ? formatEther(estimatedGas) : '0.00'} ETH</span>
                    </div>
                </div>

                <div className="border-t border-gray-200 my-4" />

                <Button onClick={handleDeposit} className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Confirming in wallet...' : 'Confirm Deposit'}
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
                <h3 className="text-xl font-semibold text-gray-800">Deposit Successful!</h3>
                <p className="text-gray-500">Your {depositAmount} {selectedAsset.symbol} has been deposited.</p>
                {txHash && (
                    <a 
                        href={`${getBlockExplorer(chainId)}/tx/${txHash}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline mt-4"
          >
                        View on Block Explorer
                    </a>
                )}
                <Button onClick={onClose} className="mt-6 w-full">Done</Button>
            </div>
        )
    case 'error':
        return (
            <div className="py-12 flex flex-col items-center justify-center text-center">
                <XCircle className="w-16 h-16 text-red-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800">Transaction Failed</h3>
                <p className="text-gray-500">Something went wrong with your deposit.</p>
                <Button onClick={() => setStep('input')} className="mt-6 w-full">Try Again</Button>
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
            {step === 'input' && 'Deposit Collateral'}
            {step === 'confirm' && 'Confirm Deposit'}
            {step === 'sending' && 'Processing'}
            {step === 'success' && 'Success'}
            {step === 'error' && 'Error'}
          </DialogTitle>
          <DialogDescription className="text-center text-gray-500">
            {step === 'input' && 'Supply assets to the OpenChain protocol to earn interest.'}
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
} 
