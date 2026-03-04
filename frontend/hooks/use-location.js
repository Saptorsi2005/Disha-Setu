import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

export const PRESET_LOCATIONS = [
  { label: 'Hebbal', lat: 13.0358, lng: 77.5970 },
  { label: 'Koramangala', lat: 12.9352, lng: 77.6245 },
  { label: 'MG Road', lat: 12.9756, lng: 77.6095 },
  { label: 'Whitefield', lat: 12.9698, lng: 77.7499 },
  { label: 'Yelahanka', lat: 13.1007, lng: 77.5963 },
  { label: 'Rajajinagar', lat: 12.9915, lng: 77.5530 },
  { label: 'Marathahalli', lat: 12.9591, lng: 77.6974 },
  { label: 'Electronic City', lat: 12.8454, lng: 77.6610 },
  { label: 'Jayanagar', lat: 12.9252, lng: 77.5938 },
];

/**
 * useLocation hook
 *
 * Returns:
 *   coords   { lat, lng } — active location coordinates
 *   label    string      — human-readable location name
 *   mode     'gps' | 'manual'
 *   accuracy number | null — GPS accuracy in metres (GPS mode only)
 *   loading  boolean
 *   error    string | null
 *   startGPS ()           — request permission and begin GPS tracking
 *   setManual({ lat, lng, label }) — switch to manual mode
 */
export function useLocation() {
  const [mode, setMode] = useState('manual');
  const [coords, setCoords] = useState({ lat: 13.0358, lng: 77.5970 }); // default: Hebbal
  const [label, setLabel] = useState('Hebbal');
  const [accuracy, setAccuracy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);

  // Clean up GPS watcher on unmount or mode change
  useEffect(() => {
    return () => {
      if (subscription) subscription.remove();
    };
  }, [subscription]);

  const startGPS = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Remove any previous watcher
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please enable it in Settings.');
        setLoading(false);
        return false;
      }

      // Get a quick initial fix
      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: initial.coords.latitude, lng: initial.coords.longitude });
      setAccuracy(initial.coords.accuracy);
      setLabel('Current Location');
      setMode('gps');
      setLoading(false);

      // Then watch for updates
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 20 },
        (loc) => {
          setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          setAccuracy(loc.coords.accuracy);
        }
      );
      setSubscription(sub);
      return true;
    } catch (e) {
      setError('Could not get your location. Please try again.');
      setLoading(false);
      return false;
    }
  }, [subscription]);

  const setManual = useCallback(({ lat, lng, label: lbl }) => {
    // Stop any GPS watcher
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }
    setCoords({ lat, lng });
    setLabel(lbl);
    setMode('manual');
    setError(null);
  }, [subscription]);

  return { coords, label, mode, accuracy, loading, error, startGPS, setManual };
}
