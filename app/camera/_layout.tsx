import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        gestureEnabled: true, // Enable swipe gesture navigation
        headerShown: false, // Hide header if not needed
      }}
    />
  );
}
