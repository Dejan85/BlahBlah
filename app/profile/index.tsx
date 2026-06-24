import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  SafeAreaView,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Dimensions,
  Linking,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Eye, ProfileBackButton, ProfileOptions } from '@/assets/images';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import Avatar from '@/components/Avatar';
import { IconButton } from '@/components/IconButton';
import BottomModal from '@/components/BottomModal';
import { DeleteAccount } from '@/components/DeleteAccount';
import { InviteUser } from '@/components/InviteUser';
import { Profile, ProfileState, EditFormState } from '@/types';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { GridPost } from '@/components/ProfilePosts';

import PremiumModal from '@/components/PremiumModal';
import { usePost } from '@/context/PostContext';
import GridPosts from '@/components/GridPost';
import { calculateBlahScore } from '@/lib/blahScore';
import { currentStreakDay, type StreakState } from '@/lib/streak';
import { formatCount } from '@/lib/formatCount';
import {
  getRecoveryStatus,
  msUntilOfferExpires,
  formatRecoveryCountdown,
  applyRecovery,
  streakLostAt,
  shouldNotifyStreakLost,
} from '@/lib/blahRecovery';
import { purchaseRecovery } from '@/services/recoveryPurchase';

const { height: windowHeight } = Dimensions.get('window');

/**
 * Kreira "Blah Streak Lost" notifikaciju (D6, T3.9) ako treba — odluku donosi čista
 * `shouldNotifyStreakLost` (lib/blahRecovery), ovde je samo I/O. Sistemska notifikacija
 * nema pravog pošiljaoca → `sender_id = recipient_id = userId` (kolona je NOT NULL FK na
 * profiles; Push.tsx render za tip 'BLAHS' ionako prikazuje "blahblah", ne pošiljaoca).
 * Dedup: gleda created_at zadnje 'BLAHS' notif. korisnika (>= lostAt → već javljeno).
 */
async function maybeCreateStreakLostNotification(
  userId: string,
  streakDay: number,
  lostAt: number | null
) {
  try {
    const { data: last } = await supabase
      .from('notifications')
      .select('created_at')
      .eq('recipient_id', userId)
      .eq('type', 'BLAHS')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastNotifiedAt = last?.created_at
      ? new Date(last.created_at).getTime()
      : null;

    if (
      !shouldNotifyStreakLost({
        recoveryStatus: 'recoverable',
        streakDay,
        lostAt,
        lastNotifiedAt,
      })
    ) {
      return;
    }

    const { error } = await supabase.from('notifications').insert({
      recipient_id: userId,
      sender_id: userId, // sistemska notif. — bez pravog pošiljaoca (vidi gore)
      type: 'BLAHS',
      payload: { kind: 'streak_lost', lostDay: streakDay },
      is_read: false,
    });
    if (error) {
      console.error('Error creating streak-lost notification:', error);
    }
  } catch (err) {
    console.error('Error creating streak-lost notification:', err);
  }
}

const ProfileSkeleton = () => (
  <View style={styles.skeletonContainer}>
    <View style={styles.avatarSkeleton} />
    <View style={styles.contentSkeleton} />
  </View>
);

// Update initial state to include two count properties:
const initialState: ProfileState = {
  loading: true,
  profile: null,
  followersCount: 0,
  followingCount: 0,
  blahScore: 0,
  loggingOut: false,
  savingProfile: false,
};

const initialEditForm: EditFormState = {
  username: '',
  fullName: '',
  bio: '',
  avatarUrl: null,
  websiteUrl: '',
  locationEnabled: false, // Initialize with false
};

const ProfileScreen = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [state, setState] = useState<ProfileState>(initialState);
  const [modalStates, setModalStates] = useState({
    main: false,
    edit: false,
  });
  const [editForm, setEditForm] = useState<EditFormState>(initialEditForm);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Blah Recovery (T3.8): kad streak padne ali je ponuda još živa ('recoverable'),
  // čuvamo poslednji Blah + dan za vraćanje i prikazujemo popup (MyProfile 8.8).
  const [recovery, setRecovery] = useState<{
    lastBlahAt: number | null;
    restoredDay: number;
  }>({ lastBlahAt: null, restoredDay: 0 });
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryProcessing, setRecoveryProcessing] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  // Auto-otvori popup samo jednom po mount-u (da se ne otvara na svaki refetch).
  const recoveryPromptShownRef = useRef(false);

  const [, setPosts] = useState<GridPost[]>([]);
  const [, setLoadingPosts] = useState(true);
  const { getUserPosts } = usePost(); // Import from PostContext
  const fetchUserPosts = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingPosts(true);
      const fetchedPosts = await getUserPosts(user.id);

      // Transform posts to GridPost format
      const transformedPosts: GridPost[] = fetchedPosts.map((post) => ({
        id: post.id,
        image: post.main_media_url,
        timestamp: new Date(post.created_at).getTime(),
        type: post.media_type,
        uri: post.main_media_url,
        user: post.profile
          ? {
              id: post.profile.id,
              username: post.profile.username,
              profilePhoto: post.profile.avatar_url,
            }
          : undefined,
        images: post.additional_media,
        music: post.music,
        hashtags: post.hashtags,
      }));

      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  }, [user, getUserPosts]);

  useEffect(() => {
    fetchUserPosts();

    // Subscribe to post changes
    const subscription = supabase
      .channel('posts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: user ? `user_id=eq.${user.id}` : undefined,
        },
        () => {
          fetchUserPosts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, fetchUserPosts]);
  const handleContinue = () => {
    // Handle continue button click
    setShowPremiumModal(false);
  };
  const displayValues = useMemo(
    () => ({
      username: state.profile?.username ?? 'Guest',
      fullName: state.profile?.full_name ?? '',
      bio: state.profile?.bio ?? 'wowish',
      url: state.profile?.website_url ?? 'https://blahblah.com',
    }),
    [state.profile]
  );

  const fetchProfileData = useCallback(async () => {
    if (!user) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      // Run three queries in parallel:
      const [profileResponse, followersResponse, followingResponse] =
        await Promise.all([
          supabase
            .from('profiles')
            .select(
              'username, full_name, avatar_url, bio, website_url, location_enabled, latitude, longitude, blah_score, blahs_sent, streak_day, last_blah_at, streak_tz_offset'
            )
            .eq('id', user.id)
            .single(),
          // Count rows where the current user is being followed
          supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('followed_id', user.id),
          // Count rows where the current user is following others
          supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', user.id),
        ]);

      if (profileResponse.error) {
        throw profileResponse.error;
      }

      // Get current location if enabled
      let currentLocation: Location.LocationObject | null = null;
      if (profileResponse.data?.location_enabled) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            currentLocation = await Location.getCurrentPositionAsync({});
            if (currentLocation) {
              await supabase
                .from('profiles')
                .update({
                  latitude: currentLocation.coords.latitude,
                  longitude: currentLocation.coords.longitude,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);
            }
          }
        } catch (error) {
          console.error('Error getting location:', error);
        }
      }

      // Streak (T3.6): rekonstruiši stanje iz DB i izvedi tekući dan preko lib/.
      // currentStreakDay → 0 ako je pao; to je vrednost koja ide u Blah Score.
      const streakState: StreakState = {
        day: profileResponse.data.streak_day ?? 0,
        lastBlahAt: profileResponse.data.last_blah_at
          ? new Date(profileResponse.data.last_blah_at).getTime()
          : null,
      };
      const tz = profileResponse.data.streak_tz_offset ?? 0;
      const now = Date.now();
      const streakDay = currentStreakDay(streakState, now, tz);

      // Blah Recovery (T3.8): rolling 26h/39h prozor (lib/blahRecovery), nezavisno od
      // kalendarskog brojanja u streak.ts. Status određuje i popup i (anti-drift) reset.
      const recoveryStatus = getRecoveryStatus(streakState.lastBlahAt, now);

      // On-read lazy reset (backup pg_cron sweep-u) — SADA gejtovan recovery-jem:
      // dok je ponuda ŽIVA ('recoverable') NE nuliramo streak_day (čuvamo ga da ga
      // recovery može vratiti); nuliramo tek kad ponuda istekne ('expired').
      if (recoveryStatus === 'expired' && streakState.day > 0) {
        await supabase
          .from('profiles')
          .update({ streak_day: 0 })
          .eq('id', user.id);
      }

      // Streak pao ali ponuda živa → zapamti dan za vraćanje i otvori popup (jednom).
      if (recoveryStatus === 'recoverable' && streakState.day > 0) {
        setRecovery({
          lastBlahAt: streakState.lastBlahAt,
          restoredDay: streakState.day,
        });
        if (!recoveryPromptShownRef.current) {
          recoveryPromptShownRef.current = true;
          setNowTick(now);
          setShowRecoveryModal(true);
        }
        // "Blah Streak Lost" notifikacija (D6, T3.9). Odluka u lib/ (shouldNotifyStreakLost);
        // dedup preko created_at zadnje takve notif. (>= lostAt → već javljeno za OVAJ pad).
        // On-read kreiranje, kao i ostatak streak/recovery wiringa (pravi push je T4.3).
        await maybeCreateStreakLostNotification(
          user.id,
          streakState.day,
          streakLostAt(streakState.lastBlahAt)
        );
      } else {
        setRecovery({ lastBlahAt: streakState.lastBlahAt, restoredDay: 0 });
      }

      // Blah Score: logika u lib/ (T3.2) — sad sa pravim streak danom (bonus 8/20/28/48).
      const followersCount = followersResponse.count || 0;
      const blahScore = calculateBlahScore(
        profileResponse.data.blahs_sent ?? 0,
        followersCount,
        streakDay
      );

      // DB samo skladišti keširani skor (T3.3) — app ga računa i upisuje.
      // Upiši samo kad se promenio, da ne pravimo suvišne write-ove.
      if (blahScore !== profileResponse.data.blah_score) {
        await supabase
          .from('profiles')
          .update({ blah_score: blahScore })
          .eq('id', user.id);
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        profile: {
          ...profileResponse.data,
          latitude:
            currentLocation?.coords.latitude ?? profileResponse.data.latitude,
          longitude:
            currentLocation?.coords.longitude ?? profileResponse.data.longitude,
        } as Profile,
        followersCount,
        followingCount: followingResponse.count || 0,
        blahScore,
      }));
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [user]);

  const handlePlanSelection = (plan: 'monthly' | 'yearly') => {
    // Handle the plan selection here
    console.log('Selected plan:', plan);
  };

  useEffect(() => {
    if (!user) return;

    // Subscribe to changes on the "follows" table for changes where the current user
    // is either following someone or is being followed.
    const subscription = supabase
      .channel('follows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          // Using the 'or' filter to capture changes for both columns:
          filter: `or(follower_id.eq.${user.id},followed_id.eq.${user.id})`,
        },
        fetchProfileData
      )
      .subscribe();

    fetchProfileData();
    return () => {
      subscription.unsubscribe();
    };
  }, [user, fetchProfileData]);

  const handleLogout = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loggingOut: true }));
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await signOut();
      setModalStates((prev) => ({ ...prev, main: false }));
      router.replace('/');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'An error occurred while signing out'
      );
    } finally {
      setState((prev) => ({ ...prev, loggingOut: false }));
    }
  }, [signOut, router]);

  const handleEditProfile = useCallback(() => {
    setModalStates((prev) => ({ ...prev, main: false, edit: true }));
    if (state.profile) {
      setEditForm({
        username: state.profile.username,
        fullName: state.profile.full_name,
        bio: state.profile.bio ?? '',
        avatarUrl: state.profile.avatar_url,
        websiteUrl: state.profile.website_url ?? '',
        locationEnabled: state.profile.location_enabled ?? false,
      });
    }
  }, [state.profile]);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    try {
      setState((prev) => ({ ...prev, savingProfile: true }));
      const updates = {
        id: user.id,
        username: editForm.username,
        full_name: editForm.fullName,
        avatar_url: editForm.avatarUrl,
        bio: editForm.bio,
        website_url: editForm.websiteUrl,
        location_enabled: editForm.locationEnabled,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates, { onConflict: 'id' });
      if (error) throw error;

      setState((prev) => ({
        ...prev,
        profile: updates,
        savingProfile: false,
      }));
      setModalStates((prev) => ({ ...prev, edit: false }));
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
      setState((prev) => ({ ...prev, savingProfile: false }));
    }
  }, [user, editForm]);

  // Live odbrojavanje ponude dok je recovery popup otvoren (minut po minut).
  useEffect(() => {
    if (!showRecoveryModal) return;
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [showRecoveryModal]);

  const handleRecoveryPurchase = useCallback(async () => {
    if (!user || recovery.restoredDay <= 0) {
      setShowRecoveryModal(false);
      return;
    }
    try {
      setRecoveryProcessing(true);
      const result = await purchaseRecovery();
      if (!result.success) {
        if (!result.cancelled) {
          Alert.alert('Blah Recovery', result.error ?? 'Plaćanje nije uspelo.');
        }
        return;
      }
      // Uspeh: vrati streak na sačuvani dan + nov 26h ciklus (lib/blahRecovery).
      const restored = applyRecovery(recovery.restoredDay, Date.now());
      const { error } = await supabase
        .from('profiles')
        .update({
          streak_day: restored.streakDay,
          last_blah_at: new Date(restored.lastBlahAt).toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      setShowRecoveryModal(false);
      recoveryPromptShownRef.current = false;
      setRecovery({ lastBlahAt: restored.lastBlahAt, restoredDay: 0 });
      await fetchProfileData(); // osveži skor sa vraćenim streak danom
    } catch (e) {
      Alert.alert(
        'Blah Recovery',
        e instanceof Error ? e.message : 'Greška pri recovery-ju.'
      );
    } finally {
      setRecoveryProcessing(false);
    }
  }, [user, recovery.restoredDay, fetchProfileData]);

  if (state.loading) {
    return <ProfileSkeleton />;
  }

  const recoveryOfferLabel = formatRecoveryCountdown(
    msUntilOfferExpires(recovery.lastBlahAt, nowTick)
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon={<ProfileBackButton fill="#000" />}
            onPress={() => router.back()}
            size={34}
          />
          <IconButton
            icon={<ProfileOptions />}
            onPress={() => setModalStates((prev) => ({ ...prev, main: true }))}
            size={34}
          />
        </View>

        <View style={styles.profileUsername}>
          <Avatar size={60} url={state.profile?.avatar_url ?? null} />
          <View style={styles.profileUsernameColumn}>
            <Text style={styles.profileUname}>{displayValues.username}</Text>
            <Text style={styles.profileStatus}>{displayValues.bio}</Text>
            <Pressable
              onPress={() => {
                const urlToOpen =
                  state.profile?.website_url || displayValues.url;
                if (urlToOpen) {
                  const fullUrl = urlToOpen.startsWith('http')
                    ? urlToOpen
                    : `https://${urlToOpen}`;
                  Linking.openURL(fullUrl).catch(() =>
                    Alert.alert('Error', 'Could not open the website')
                  );
                }
              }}
            >
              <Text
                style={[styles.website, { textDecorationLine: 'underline' }]}
              >
                {state.profile?.website_url || displayValues.url}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Updated stats row to show dynamic followers and following counts */}
        <View style={styles.blahRow}>
          <View style={styles.textContainer}>
            {/* MyProfile 8.9: aktivan Blah Score → Blahs stat u crvenom */}
            <Text
              style={[styles.blahs, state.blahScore > 0 && styles.blahsActive]}
            >
              {formatCount(state.blahScore)}
            </Text>
            <Text style={styles.subtitle}>Blahs</Text>
          </View>
          <TouchableOpacity
            style={styles.textContainer}
            onPress={() => router.push('/followers-list')}
          >
            <Text style={styles.blahs}>{state.followersCount}</Text>
            <Text style={styles.subtitle}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.textContainer}
            onPress={() => router.push('/following-list')}
          >
            <Text style={styles.blahs}>{state.followingCount}</Text>
            <Text style={styles.subtitle}>Following</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.editProfileContainer}>
          <TouchableOpacity
            onPress={handleEditProfile}
            style={styles.editProfile}
          >
            <FontAwesome5 name="edit" color="#111" size={24} width="25" />
            <Text style={[styles.fullName, styles.editName]}>Edit profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPremiumModal(true)}
          >
            <Eye />
          </TouchableOpacity>
        </View>

        <Text style={styles.fullName}>{displayValues.fullName}</Text>

        <View style={styles.postListContainer}>
          {user && <GridPosts userId={user.id} isPersonalProfile={true} />}
        </View>

        <BottomModal
          visible={modalStates.main}
          onClose={() => setModalStates((prev) => ({ ...prev, main: false }))}
          height={windowHeight * 0.9}
        >
          <View>
            <Pressable
              style={[styles.button, state.loggingOut && styles.buttonDisabled]}
              onPress={handleLogout}
              disabled={state.loggingOut}
            >
              {state.loggingOut ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>Logout</Text>
              )}
            </Pressable>
            <DeleteAccount />
            <InviteUser />
          </View>
        </BottomModal>

        <BottomModal
          visible={modalStates.edit}
          onClose={() => setModalStates((prev) => ({ ...prev, edit: false }))}
          height={windowHeight * 0.9}
        >
          <View style={styles.editContainer}>
            <Text style={styles.editTitle}>Edit Profile</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={editForm.username}
              onChangeText={(text) =>
                setEditForm((prev) => ({ ...prev, username: text }))
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={editForm.fullName}
              onChangeText={(text) =>
                setEditForm((prev) => ({ ...prev, fullName: text }))
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Bio"
              value={editForm.bio}
              onChangeText={(text) =>
                setEditForm((prev) => ({ ...prev, bio: text }))
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Website URL"
              value={editForm.websiteUrl}
              onChangeText={(text) =>
                setEditForm((prev) => ({ ...prev, websiteUrl: text }))
              }
            />

            <View style={styles.locationContainer}>
              <Text style={styles.locationText}>Location</Text>
              <Switch
                trackColor={{ false: '#B3B3B3', true: '#FF325E' }}
                thumbColor={editForm.locationEnabled ? '#fff' : '#fff'}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, locationEnabled: value }))
                }
                value={editForm.locationEnabled}
              />
            </View>

            <Avatar
              size={60}
              url={editForm.avatarUrl}
              onUpload={(path) =>
                setEditForm((prev) => ({ ...prev, avatarUrl: path }))
              }
            />
            <Pressable
              style={[
                styles.button,
                state.savingProfile && styles.buttonDisabled,
              ]}
              onPress={handleSaveProfile}
              disabled={state.savingProfile}
            >
              {state.savingProfile ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>Save</Text>
              )}
            </Pressable>
          </View>
        </BottomModal>

        <PremiumModal
          isVisible={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          onPlanSelection={handlePlanSelection}
          onContinue={handleContinue}
        />

        {/* Blah Recovery popup (MyProfile 8.8) — €1.99 jednokratno */}
        <PremiumModal
          isVisible={showRecoveryModal}
          onClose={() => setShowRecoveryModal(false)}
          onPlanSelection={handlePlanSelection}
          onContinue={handleRecoveryPurchase}
          isBlahs
          isPremium={false}
          offerSubtitle={recoveryOfferLabel}
          processing={recoveryProcessing}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  continueButton: {
    marginHorizontal: 30,
  },
  continueButtonText: {
    fontFamily: 'InterBold',
    fontSize: 26,
    color: '#fff',
  },
  subscribe: {
    fontSize: 12,
    fontFamily: 'InterRegular',
    color: '#B3B3B3',
    textAlign: 'center',
    paddingTop: 10,
  },
  headerModal: {
    alignItems: 'center',
    marginTop: 37,
    marginBottom: 37,
  },
  title: {
    fontFamily: 'InterBold',
    fontSize: 25,
    color: '#FF325E',
    textAlign: 'center',
  },
  postListContainer: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  eyeButton: {
    marginLeft: 7,
  },
  modalContainer: {
    borderWidth: 0,
  },
  website: {
    color: '#FF325E',
    fontFamily: 'InterMedium',
    fontSize: 12,
  },
  btnText: {
    fontFamily: 'InterSemiBold',
    textAlign: 'center',
    color: '#fff',
    paddingVertical: 8,
  },
  button: {
    backgroundColor: '#B3B3B3',
    borderRadius: 40,
    marginBottom: 12,
    marginHorizontal: 60,
    marginTop: 10,
  },
  profileUsernameColumn: {
    marginLeft: 12,
  },
  profileUname: {
    fontFamily: 'InterSemiBold',
    fontSize: 18,
    color: '#000',
  },
  profileStatus: {
    fontFamily: 'InterMedium',
    color: '#000',
    fontSize: 12,
  },
  container: {
    flex: 1,
  },
  header: {
    marginVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 30,
  },
  profileUsername: {
    justifyContent: 'center',
    marginVertical: 40,
    alignContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  blahRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  editName: {
    textAlign: 'left',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 5,
    top: 2,
  },
  blahs: {
    fontFamily: 'InterBold',
    fontSize: 18,
    color: '#000',
    textAlign: 'center',
  },
  blahsActive: {
    color: '#FF325E',
  },
  textContainer: {
    marginHorizontal: 12,
  },
  subtitle: {
    textAlign: 'center',
    color: '#B3B3B3',
    fontSize: 15,
    fontFamily: 'InterSemiBold',
  },
  editProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignContent: 'center',
    alignSelf: 'center',
    marginTop: 40,
  },
  editProfile: {
    flexDirection: 'row',
  },
  fullName: {
    textAlign: 'center',
    paddingTop: 40,
    paddingBottom: 10,
    fontFamily: 'InterMedium',
    fontSize: 18,
  },
  editContainer: {
    padding: 20,
  },
  editTitle: {
    fontSize: 20,
    fontFamily: 'InterSemiBold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'InterMedium',
    fontSize: 16,
    marginBottom: 15,
    color: '#000',
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 15,
  },
  locationText: {
    fontFamily: 'InterMedium',
    fontSize: 16,
    color: '#000',
  },
  skeletonContainer: {
    flex: 1,
    margin: 50,
    marginTop: 100,
  },
  avatarSkeleton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E1E1E1',
    marginBottom: 10,
  },
  contentSkeleton: {
    height: 100,
    backgroundColor: '#E1E1E1',
    borderRadius: 8,
  },
});

export default ProfileScreen;
