import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { sepoliaTestnet, polygonMumbai } from "./chains";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBlockExplorer(chainId: number): string {
    if (chainId === sepoliaTestnet.id) {
        return sepoliaTestnet.blockExplorers?.default.url ?? "https://sepolia.etherscan.io";
    }
    if (chainId === polygonMumbai.id) {
        return polygonMumbai.blockExplorers?.default.url ?? "https://mumbai.polygonscan.com";
    }
    return "https://etherscan.io";
}
