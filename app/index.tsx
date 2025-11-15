import { Redirect } from 'expo-router';

export default function RootIndex() {
  // Tự động chuyển người dùng đến màn hình chính bên trong (tabs)
  return <Redirect href="/(tabs)" />;
}