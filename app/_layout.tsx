import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initDatabase } from '../database/db';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // Khởi tạo database
        await initDatabase();
        console.log('✅ Database initialized successfully');
        setIsReady(true);
      } catch (e) {
        console.error('❌ Database initialization error:', e);
        setError('Failed to initialize database');
      }
    }

    prepare();
  }, []);

  // Hiển thị loading screen khi đang khởi tạo DB
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Initializing database...</Text>
      </View>
    );
  }

  // Hiển thị error nếu có
  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
      </View>
    );
  }

  // Render app khi DB đã sẵn sàng
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: '📚 Reading List',
          headerTitleAlign: 'center',
        }} 
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#f44336',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});