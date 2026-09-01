import * as Location from 'expo-location';

let locationSubscription = null;

export async function requestLocationPermissions() {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    throw new Error('Foreground location permission was denied');
  }

  return true;
}

export async function getCurrentGPSPosition() {
  await requestLocationPermissions();
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    speed: position.coords.speed,
    altitude: position.coords.altitude,
    timestamp: position.timestamp
  };
}

export async function startContinuousLocationTracking(onLocationPing) {
  await requestLocationPermissions();
  if (locationSubscription) {
    locationSubscription.remove();
  }

  locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000, // 5 seconds
      distanceInterval: 5 // 5 meters
    },
    (location) => {
      onLocationPing({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
        altitude: location.coords.altitude,
        timestamp: location.timestamp
      });
    }
  );

  return locationSubscription;
}

export function stopContinuousLocationTracking() {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
}
