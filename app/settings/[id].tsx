import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import Header from "@/components/Header";
import {
  BlahRecovery,
  GroupSettings,
  Help,
  Logout,
  Notifications,
  Privacy,
  RedBunny,
  TermsSettings,
  TrashSettings,
} from "@/assets/images";
import SettingItem from "@/components/SettingItem";
import Avatar from "@/components/Avatar";
import { supabase } from "@/utils";
import { useAuth } from "@/context/AuthContext";
const Settings = () => {
  const [privateProfile, setPrivateProfile] = useState(false);
  const [lastSeen, setLastSeen] = useState(false);
  const [locationShare, setLocationShare] = useState(false);
  const [muteNewFollowers, setMuteNewFollowers] = useState(false);
  const [muteMessages, setMuteMessages] = useState(false);
  const [mutePostLikesAndTags, setMutePostLikesAndTags] = useState(false);
  const [profileData, setProfileData] = useState({ id: "", avatar_url: "" });
  const [loggingOut, setLoggingOut] = useState(false);

  const { signOut } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  const handleTogglePrivateProfile = () => {
    setPrivateProfile(!privateProfile);
  };
  const handleToggleLastSeen = () => {
    setLastSeen(!lastSeen);
  };
  const handleToggleLocationShare = () => {
    setLocationShare(!locationShare);
  };
  const handleToggleMuteNewFollowers = () => {
    setMuteNewFollowers(!muteNewFollowers);
  };
  const handleToggleMuteMessages = () => {
    setMuteMessages(!muteMessages);
  };
  const handleToggleMutePostLikesAndTags = () => {
    setMutePostLikesAndTags(!mutePostLikesAndTags);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, avatar_url")
          .eq("id", id)
          .single();

        if (error) throw error;
        if (data) {
          setProfileData(data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();
  }, [id]);

  const handleLogout = useCallback(async () => {
    try {
      setLoggingOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await signOut();
      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "An error occurred while signing out",
      );
    } finally {
      setLoggingOut(false);
    }
  }, [signOut, router]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={50}
    >
      <Header title="Settings & Privacy" onBackPress={handleGoBack} />

      <View style={styles.mainContent}>
        <View style={styles.titleContainer}>
          <Privacy style={styles.icon} />
          <Text style={styles.title}>Privacy Settings</Text>
        </View>

        <SettingItem
          value={privateProfile}
          onValueChange={handleTogglePrivateProfile}
          title="Private profile"
          hasIcon={false}
          isSwitch={true}
          style={styles.item}
          labelStyle={styles.label}
        />
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: "#B3B3B3",
            marginLeft: 12,
          }}
        />
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: "#B3B3B3",
            marginLeft: 12,
            paddingVertical: 12,
          }}
        >
          <Text style={styles.label} onPress={() => {}}>
            Who can message me
          </Text>
        </View>

        <SettingItem
          value={lastSeen}
          onValueChange={handleToggleLastSeen}
          title="Last seen status"
          hasIcon={false}
          isSwitch={true}
          style={styles.item}
          labelStyle={styles.label}
        />
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: "#B3B3B3",
            marginLeft: 12,
          }}
        />

        <SettingItem
          value={locationShare}
          onValueChange={handleToggleLocationShare}
          title="Share my location"
          hasIcon={false}
          isSwitch={true}
          style={styles.item}
          labelStyle={styles.label}
        />

        <View style={[styles.titleContainer, { marginVertical: 6 }]}>
          <Notifications style={styles.icon} width={20} height={20} />
          <Text style={styles.title}>Notifications</Text>
        </View>

        <SettingItem
          value={muteNewFollowers}
          onValueChange={handleToggleMuteNewFollowers}
          title="Mute new followers"
          hasIcon={false}
          isSwitch={true}
          style={styles.item}
          labelStyle={styles.label}
        />

        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: "#B3B3B3",
            marginLeft: 12,
          }}
        />

        <SettingItem
          value={muteMessages}
          onValueChange={handleToggleMuteMessages}
          title="Mute messages"
          hasIcon={false}
          isSwitch={true}
          style={styles.item}
          labelStyle={styles.label}
        />
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: "#B3B3B3",
            marginLeft: 12,
          }}
        />

        <SettingItem
          value={mutePostLikesAndTags}
          onValueChange={handleToggleMutePostLikesAndTags}
          title="Mute post likes/tags"
          hasIcon={false}
          isSwitch={true}
          style={styles.item}
          labelStyle={styles.label}
        />

        <View style={[styles.titleContainer, { marginVertical: 6 }]}>
          <RedBunny style={styles.icon} width={24} height={24} />
          <Text style={styles.titleBold}>Blah +</Text>
        </View>
        <Text
          onPress={() => {}}
          style={[styles.label, { paddingVertical: 12, paddingLeft: 12 }]}
        >
          View subscription details
        </Text>
        <View style={[styles.titleContainer, { marginVertical: 6 }]}>
          <BlahRecovery style={styles.icon} />
          <Text style={styles.titleBold}>Blah Recovery</Text>
        </View>
        <Text
          onPress={() => {}}
          style={[styles.label, { paddingVertical: 12, paddingLeft: 12 }]}
        >
          Buy Recovery
        </Text>
        <View style={styles.titleContainer}>
          <TermsSettings style={styles.icon} />
          <Text style={styles.title}>Terms & Privacy Policy</Text>
        </View>
        <Text
          onPress={() => {}}
          style={[styles.label, { paddingVertical: 12, paddingLeft: 12 }]}
        >
          Terms of service
        </Text>
        <View
          style={{
            borderBottomColor: "#B3B3B3",
            borderBottomWidth: 1,
            marginLeft: 12,
            marginRight: 12,
          }}
        />

        <Text
          onPress={() => {}}
          style={[styles.label, { paddingVertical: 12, paddingLeft: 12 }]}
        >
          Privacy policy
        </Text>

        <View style={styles.titleContainer}>
          <GroupSettings style={styles.icon} />
          <Text style={styles.title}>Community Guidelines</Text>
        </View>
        <Text
          onPress={() => {}}
          style={[styles.label, { paddingVertical: 12, paddingLeft: 12 }]}
        >
          Harassment & hate speech
        </Text>
        <View
          style={{
            borderBottomColor: "#B3B3B3",
            borderBottomWidth: 1,
            marginHorizontal: 12,
          }}
        />
        <Text
          onPress={() => {}}
          style={[styles.label, { paddingVertical: 12, paddingLeft: 12 }]}
        >
          Spam & fake profiles
        </Text>
        <Text
          onPress={() => {}}
          style={[styles.label, { paddingVertical: 12, paddingLeft: 12 }]}
        >
          Nudity & illegal content
        </Text>
        <View style={styles.titleContainer}>
          <Help style={styles.icon} />
          <Text style={styles.title}>Help & Support</Text>
        </View>
        <Text
          onPress={() => {}}
          style={[styles.label, { paddingVertical: 12, paddingLeft: 12 }]}
        >
          Contact Support
        </Text>
        <View style={styles.titleContainer}>
          <Logout style={styles.icon} />
          <Text style={styles.title}>Logout</Text>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          disabled={loggingOut}
          style={[
            styles.logoutButton,
            loggingOut && styles.logoutButtonDisabled,
          ]}
        >
          <Text
            style={[
              styles.label,
              { paddingVertical: 12, paddingLeft: 12 },
              loggingOut && { opacity: 0.7 },
            ]}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => {}} style={styles.buttonContainer}>
          <Text
            style={[styles.label, { paddingVertical: 12, paddingLeft: 12 }]}
          >
            Switch Account
          </Text>
          <Avatar
            size={24}
            url={profileData.avatar_url}
            style={{ top: 10, left: 20 }}
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <TrashSettings style={styles.icon} />
          <Text style={styles.title}>Delete Account</Text>
        </View>
        <Text
          onPress={() => {}}
          style={[styles.label, { paddingVertical: 12, paddingLeft: 12 }]}
        >
          Permanently delete account
        </Text>
      </View>
    </ScrollView>
  );
};

export default Settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 50,
  },
  logoutButton: {
    width: "100%",
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  buttonContainer: {
    flexDirection: "row",
  },
  mainContent: {
    marginLeft: 37,
    marginRight: 30,
    marginTop: 20,
  },
  item: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  titleContainer: {
    flexDirection: "row",
  },
  title: {
    fontFamily: "InterBold",
    fontSize: 18,
    color: "#111",
  },
  titleBold: {
    fontFamily: "InterBold",
    fontSize: 18,
    color: "#FF325E",
  },
  icon: {
    marginHorizontal: 12,
  },
  label: {
    fontFamily: "InterRegular",
    fontSize: 18,
    color: "#111",
  },
});
