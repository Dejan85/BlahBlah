import { useState, useEffect, useCallback } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";
import { supabase } from "@/utils/supabase";

interface LocationState {
  coords: {
    latitude: number;
    longitude: number;
    [key: string]: number;
  };
  timestamp: number;
}

export function useLocation(userId?: string) {
  const [isLocationEnabled, setIsLocationEnabled] = useState<boolean>(false);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch initial location state from profile
  useEffect(() => {
    const fetchLocationState = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("location_enabled")
          .eq("id", userId)
          .single();

        if (error) throw error;

        if (data) {
          setIsLocationEnabled(data.location_enabled || false);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error("Error fetching location state:", error);
        setIsInitialized(true);
      }
    };

    fetchLocationState();

    // Subscribe to profile changes
    const channel = supabase
      .channel("location-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && "location_enabled" in payload.new) {
            setIsLocationEnabled(payload.new.location_enabled);
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const toggleLocationSharing = useCallback(async () => {
    if (!userId) return;

    const newState = !isLocationEnabled;

    try {
      if (newState) {
        // Request permissions before enabling
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission denied",
            "Location permissions are required to share your location.",
          );
          return;
        }
      }

      // Update database first
      const { error } = await supabase
        .from("profiles")
        .update({
          location_enabled: newState,
          // Clear location data if disabling
          ...(newState ? {} : { latitude: null, longitude: null }),
        })
        .eq("id", userId);

      if (error) throw error;

      // Update local state after successful database update
      setIsLocationEnabled(newState);

      // Clear location data if disabling
      if (!newState) {
        setLocation(null);
      }
    } catch (error) {
      console.error("Error toggling location:", error);
      Alert.alert("Error", "Failed to update location settings");
    }
  }, [userId, isLocationEnabled]);

  const startLocationUpdates = useCallback(async (): Promise<
    Location.LocationSubscription | undefined
  > => {
    if (!userId) return undefined;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setIsLocationEnabled(false);
        return undefined;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 100,
        },
        async (loc) => {
          if (!loc?.coords) return;
          const { latitude, longitude } = loc.coords;

          setLocation({
            coords: {
              latitude,
              longitude,
            },
            timestamp: loc.timestamp,
          });

          try {
            const { error } = await supabase
              .from("profiles")
              .update({
                latitude,
                longitude,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);

            if (error) {
              console.error("Error updating location in Supabase:", error);
            }
          } catch (err) {
            console.error("Error while updating location:", err);
          }
        },
      );

      return subscription;
    } catch (error) {
      console.error("Error starting location updates:", error);
      return undefined;
    }
  }, [userId]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;

    const setupLocation = async () => {
      if (isLocationEnabled && isInitialized) {
        const newSubscription = await startLocationUpdates();
        subscription = newSubscription;
      } else if (subscription) {
        subscription.remove();
        subscription = undefined;
      }
    };

    setupLocation();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isLocationEnabled, isInitialized, startLocationUpdates]);

  return {
    isLocationEnabled,
    location,
    toggleLocationSharing,
    startLocationUpdates,
  };
}
