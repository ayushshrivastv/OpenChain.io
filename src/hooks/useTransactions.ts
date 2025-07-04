import { useLayerZero } from "./useLayerZero";

// A simple wrapper hook that uses LayerZero for all transaction logic.
// This ensures that all components calling `useTransactions` are using
// the updated, correct LayerZero functionality.

export function useTransactions() {
  const layerZeroHook = useLayerZero();

  return {
    ...layerZeroHook,
    isLoading: layerZeroHook.isLoading,
    error: layerZeroHook.error,
  };
}
