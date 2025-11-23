// DeepLinkHandler.tsx
import React, { useEffect } from "react";
import { Linking } from "react-native";
import { supabase } from "@/utils/supabase";

const DeepLinkHandler: React.FC = () => {
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      if (url) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          console.error("Error exchanging code for session:", error.message);
        } else {
          console.log("Email confirmed successfully!");
          // Navigate to your main app screen or update your app state
        }
      }
    };

    // Listen for deep link events
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check if the app was opened via a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      // Clean up the event listener
      subscription.remove();
    };
  }, []);

  return null; // Or your app's main content
};

export default DeepLinkHandler;
