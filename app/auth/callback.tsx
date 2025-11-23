import { useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { View, ActivityIndicator, Text } from "react-native";
import { supabase } from "@/utils/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Handle the OAuth callback
    const handleCallback = async () => {
      try {
        console.log("Auth callback params:", params);

        // Supabase sends tokens as URL fragments, we need to extract them
        // The URL will look like: blahblah://auth/callback#access_token=xxx&refresh_token=yyy

        // For Supabase OAuth, we need to call setSession with the tokens from URL
        // But expo-router doesn't give us URL fragments directly
        // So we'll just get the current session which should be set by Supabase

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        console.log("Session check:", { session: !!session, error });

        if (error) {
          console.error("Auth callback error:", error);
          router.replace("/auth" as any);
          return;
        }

        if (session) {
          console.log("Session received, user logged in!", session.user.id);

          // Check if user has a profile
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (profileError && profileError.code !== "PGRST116") {
            console.error("Profile check error:", profileError);
          }

          if (!profile) {
            // Create initial profile
            console.log("Creating profile for user:", session.user.id);
            const avatarUrl = session.user.user_metadata?.avatar_url || null;
            const fullName =
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              null;

            const { error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: session.user.id,
                avatar_url: avatarUrl,
                full_name: fullName,
                email: session.user.email,
              });

            if (insertError) {
              console.error("Profile creation error:", insertError);
            } else {
              console.log("Profile created successfully");
            }
          }

          // Navigate to home
          console.log("Navigating to home...");
          router.replace("/home" as any);
        } else {
          console.log("No session found, redirecting to auth");
          router.replace("/auth" as any);
        }
      } catch (error) {
        console.error("Callback handling error:", error);
        router.replace("/auth" as any);
      }
    };

    handleCallback();
  }, [params]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <ActivityIndicator size="large" color="#FF325E" />
      <Text style={{ marginTop: 16, fontSize: 16 }}>Signing you in...</Text>
    </View>
  );
}
