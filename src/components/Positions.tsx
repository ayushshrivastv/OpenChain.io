"use client";

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, usePublicClient, useChainId } from 'wagmi';
import { formatEther, type Address } from 'viem';
import { LAYERZERO_LENDING_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts';
import { getBlockExplorer } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

// We need a mapping from asset address to symbol for display
const assetAddressToSymbol: { [key: Address]: string } = {
    '0x0000000000000000000000000000000000000000': 'ETH',
    '0xF61f5C31f1b453b3639BB22fd49b6027FC341Dd9': 'USDC', // LayerZero synthetic USDC
    '0x39CdAe9f7Cb7e06A165f8B4C6864850cCef5CC44': 'WETH',
}

interface Transaction {
    type: 'Deposit' | 'Borrow';
    asset: string;
    amount: string;
    transactionHash: string;
    blockNumber: bigint;
}

export default function Positions() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const publicClient = usePublicClient();

    const contractInfo = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
    const lendingPoolAddress = contractInfo ? contractInfo.layerZeroLending as Address : undefined;

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    useEffect(() => {
        const fetchTransactions = async () => {
            if (!publicClient || !address || !lendingPoolAddress) return;

            setIsLoading(true);

            try {
                const depositLogs = await publicClient.getLogs({
                    address: lendingPoolAddress,
                    event: {
                        type: 'event',
                        name: 'Deposit',
                        inputs: [
                          { indexed: true, name: 'user', type: 'address' },
                          { indexed: true, name: 'asset', type: 'address' },
                          { indexed: false, name: 'amount', type: 'uint256' }
                        ],
                    },
                    args: {
                        user: address,
                    },
                    fromBlock: 0n,
                    toBlock: 'latest',
                });

                const borrowLogs = await publicClient.getLogs({
                    address: lendingPoolAddress,
                    event: {
                        type: 'event',
                        name: 'Borrow',
                        inputs: [
                          { indexed: true, name: 'user', type: 'address' },
                          { indexed: true, name: 'asset', type: 'address' },
                          { indexed: false, name: 'amount', type: 'uint256' }
                        ]
                      },
                    args: {
                        user: address,
                    },
                    fromBlock: 0n,
                    toBlock: 'latest',
                });

                const formattedDeposits: Transaction[] = depositLogs.map(log => ({
                    type: 'Deposit',
                    asset: assetAddressToSymbol[log.args.asset as Address] || 'Unknown',
                    amount: formatEther(log.args.amount as bigint),
                    transactionHash: log.transactionHash,
                    blockNumber: log.blockNumber,
                }));

                const formattedBorrows: Transaction[] = borrowLogs.map(log => ({
                    type: 'Borrow',
                    asset: assetAddressToSymbol[log.args.asset as Address] || 'Unknown',
                    amount: formatEther(log.args.amount as bigint),
                    transactionHash: log.transactionHash,
                    blockNumber: log.blockNumber,
                }));

                const allTransactions = [...formattedDeposits, ...formattedBorrows];
                allTransactions.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

                setTransactions(allTransactions);
            } catch (error) {
                console.error("Failed to fetch transaction logs:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactions();
    }, [address, publicClient, lendingPoolAddress]);

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl font-semibold">Please connect your wallet</h2>
                <p className="text-gray-500">Connect your wallet to see your positions and transaction history.</p>
            </div>
        )
    }

    const [totalCollateralValue, totalBorrowValue, healthFactor] = userPosition || [0n, 0n, 0n];

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-bold text-gray-900">Your Positions</h1>
            
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Collateral</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">${Number.parseFloat(formatEther(totalCollateralValue)).toFixed(2)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Total Borrows</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">${Number.parseFloat(formatEther(totalBorrowValue)).toFixed(2)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Health Factor</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{healthFactor > 0 ? (Number(healthFactor) / 1e18).toFixed(2) : 'N/A'}</p>
                    </CardContent>
                </Card>
            </div>

            <div>
                <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Asset</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Transaction</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center">Loading history...</TableCell></TableRow>
                            ) : transactions.length > 0 ? (
                                transactions.map((tx) => (
                                    <TableRow key={tx.transactionHash}>
                                        <TableCell>
                                            <Badge variant={tx.type === 'Deposit' ? 'default' : 'secondary'}>{tx.type}</Badge>
                                        </TableCell>
                                        <TableCell>{tx.asset}</TableCell>
                                        <TableCell>{Number.parseFloat(tx.amount).toFixed(4)}</TableCell>
                                        <TableCell>
                                            <a 
                                                href={`${getBlockExplorer(chainId)}/tx/${tx.transactionHash}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                            >
                                                View on Explorer
                                            </a>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="text-center">No transactions found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </div>
    )
} 
 