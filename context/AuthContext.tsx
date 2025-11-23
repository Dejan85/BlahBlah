import React, { createContext, useContext, useState, useEffect } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase";
import { Alert, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  updateUsername: (username: string) => Promise<void>;
  updateFullName: (full_name: string) => Promise<void>;
  updateAvatar: (filePath: string) => Promise<string>;
  loading: boolean;
}

interface Profile {
  id: string;
  username?: string;
  avatar_url?: string;
  updated_at?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Initialize auth state
  useEffect(() => {
    const initialize = async () => {
      try {
        // Get current session
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        setSession(data.session);
        setUser(data.session?.user ?? null);

        // Setup auth state change listener
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setInitialized(true);
      }
    };

    initialize();
  }, []);

  // Handle app state changes for session refresh
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      Alert.alert("Error", error.message);
    }
    setLoading(false);
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "blahblah://",
          data: {
            isNewSignUp: true,
          },
        },
      });

      if (error) {
        Alert.alert("Error", error.message);
        throw error;
      }

      if (!data.session) {
        // Remove the Alert and just update the step
        await AsyncStorage.setItem("signUpStep", "3");
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Error", "An unexpected error occurred");
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Error", error.message);
    }
    setLoading(false);
  };

  const updateFullName = async (full_name: string) => {
    try {
      setLoading(true);

      if (!user) {
        throw new Error("No user logged in");
      }

      // Update profile
      const { error: updateError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      );

      if (updateError) throw updateError;

      // Update metadata in auth.users
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { full_name },
      });

      if (metadataError) throw metadataError;
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Error", "An unexpected error occurred");
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUsername = async (username: string) => {
    try {
      setLoading(true);

      if (!user) {
        throw new Error("No user logged in");
      }

      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        throw new Error(
          "Username must be 3-20 characters long and can only contain letters, numbers, and underscores",
        );
      }

      // Check if username already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .neq("id", user.id);

      if (checkError) {
        throw new Error("Error checking username availability");
      }

      if (existingUsers && existingUsers.length > 0) {
        throw new Error("Username already taken");
      }

      // Update profile
      const updates: Profile = {
        id: user.id,
        username,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert(updates, {
          onConflict: "id",
          ignoreDuplicates: false,
        });

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Update metadata in auth.users
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { username },
      });

      if (metadataError) {
        throw new Error(metadataError.message);
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Error", "An unexpected error occurred");
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateAvatar = async (filePath: string): Promise<string> => {
    try {
      setLoading(true);

      if (!user) {
        throw new Error("No user logged in");
      }

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update profile
      const updates: Profile = {
        id: user.id,
        avatar_url: filePath,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert(updates, {
          onConflict: "id",
          ignoreDuplicates: false,
        });

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Update metadata in auth.users
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { avatar_url: filePath },
      });

      if (metadataError) {
        throw new Error(metadataError.message);
      }

      return publicUrl;
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Error", "An unexpected error occurred");
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        signIn,
        signUp,
        signOut,
        updateUsername,
        updateAvatar,
        loading,

        updateFullName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
