import { formatUnits } from "@/lib/contracts";
import { LAYERZERO_LENDING_ABI } from "@/lib/contracts";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import type { PriceData, UserPosition } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount, useChainId, usePublicClient } from "wagmi";

export function useUserPosition() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserPosition = useCallback(async () => {
    if (!address || !publicClient || !chainId) return;

    const contractAddresses =
      CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
    if (!contractAddresses) {
      setError("Unsupported chain");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch user position data from the lending pool
      const [totalCollateralValue, totalBorrowValue, healthFactor] =
        (await publicClient.readContract({
          address: contractAddresses.layerZeroLending as `0x${string}`,
          abi: LAYERZERO_LENDING_ABI,
          functionName: "getUserPosition",
          args: [address],
        })) as [bigint, bigint, bigint];

      // Fetch supported assets and their detailed balances
      const supportedAssets = ["USDC", "WETH", "SOL"];
      const collateralBalances: Record<string, bigint> = {};
      const borrowBalances: Record<string, bigint> = {};
      
      const userPosition: UserPosition = {
        user: address,
        totalCollateralValue,
        totalBorrowValue,
        healthFactor,
        lastUpdateTimestamp: BigInt(Date.now()),
        collateralBalances,
        borrowBalances,
      };

      setPosition(userPosition);
    } catch (err) {
      console.error("Error fetching user position:", err);
      if (err instanceof Error && err.message.includes("execution reverted")) {
        // User might not have any positions yet - this is normal
        setPosition({
          user: address,
          totalCollateralValue: 0n,
          totalBorrowValue: 0n,
          healthFactor: 0n,
          lastUpdateTimestamp: BigInt(Date.now()),
          collateralBalances: {
            USDC: 0n,
            WETH: 0n,
            SOL: 0n,
          },
          borrowBalances: {
            USDC: 0n,
            WETH: 0n,
            SOL: 0n,
          },
        });
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to fetch position",
        );
        toast.error("Failed to fetch user position");
      }
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient, chainId]);

  // Auto-refresh every 30 seconds for real-time updates
  useEffect(() => {
    if (!address || !publicClient) {
      // Clear position when wallet disconnected or client unavailable
      setPosition(null);
      return;
    }

    let isActive = true;

    const safelyFetchPosition = async () => {
      if (!isActive) return;
      
      try {
        await fetchUserPosition();
      } catch (error) {
        console.warn('Error in position polling:', error);
        // Continue polling despite errors
      }
    };

    // Initial fetch
    safelyFetchPosition();

    // Set up polling interval with error handling
    const interval = setInterval(() => {
      if (isActive && address && publicClient) {
        safelyFetchPosition();
      }
    }, 30000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [address, publicClient, chainId, fetchUserPosition]);

  // Calculate position health status
  const getHealthStatus = useCallback(() => {
    if (!position || position.healthFactor === 0n) return "unknown";

    const healthFactor = Number(position.healthFactor) / 1e18; // Convert from wei

    if (healthFactor >= 2) return "healthy";
    if (healthFactor >= 1.2) return "warning";
    if (healthFactor >= 1) return "danger";
    return "liquidatable";
  }, [position]);

  // Calculate available borrowing power
  const getAvailableBorrowPower = useCallback(() => {
    if (!position || position.totalCollateralValue === 0n) return 0n;

    // Calculate based on LTV ratios - using 80% LTV for conservative estimation
    const maxBorrowValue = (position.totalCollateralValue * 80n) / 100n;
    const availableBorrow =
      maxBorrowValue > position.totalBorrowValue
        ? maxBorrowValue - position.totalBorrowValue
        : 0n;

    return availableBorrow;
  }, [position]);

  return {
    position,
    isLoading,
    error,
    healthStatus: getHealthStatus(),
    availableBorrowPower: getAvailableBorrowPower(),
    refetch: fetchUserPosition,
  };
}
