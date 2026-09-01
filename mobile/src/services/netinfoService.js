import NetInfo from '@react-native-community/netinfo';

/**
 * Checks current network connectivity quality and state
 * Returns: 'ONLINE' | 'POOR' | 'OFFLINE'
 */
export async function getNetworkState() {
  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected || !state.isInternetReachable) {
      return 'OFFLINE';
    }

    // Check cellular generation or strength if available
    if (state.type === 'cellular') {
      const details = state.details;
      if (details && (details.cellularGeneration === '2g' || details.cellularGeneration === '3g')) {
        return 'POOR';
      }
    }

    return 'ONLINE';
  } catch (err) {
    console.warn('[NetInfo Error]', err);
    return 'ONLINE'; // Fallback
  }
}

/**
 * Subscribes to real-time network status changes
 */
export function subscribeToNetworkState(callback) {
  return NetInfo.addEventListener(state => {
    let mode = 'ONLINE';
    if (!state.isConnected || !state.isInternetReachable) {
      mode = 'OFFLINE';
    } else if (state.type === 'cellular' && state.details?.cellularGeneration === '2g') {
      mode = 'POOR';
    }
    callback(mode, state);
  });
}
