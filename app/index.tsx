// app/index.tsx
import { Redirect } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  useEffect(() => {
    // Initialize Firebase lazily to avoid blocking initial render
    import('../config/firebase')
      .then(({ auth, db }) => {
        console.log('✅ Firebase initialized successfully!');
      })
      .catch((error) => {
        console.error('❌ Firebase initialization error:', error);
      });
  }, []);

  return <Redirect href="/splash" />;
}