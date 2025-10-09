import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current; // opacity (0 -> 1)
  const slideAnim = useRef(new Animated.Value(30)).current; // vertical offset (30px -> 0)

  useEffect(() => {
    // Run both fade and slide animations in parallel
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    // Redirect after a delay
    const timer = setTimeout(() => {
      router.replace('/signin');
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Logo */}
        <Image
          source={require('../assets/Ayos-logo.png')} // 🖼 your logo path
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Ayos!</Text>
        {/* Tagline */}
        <Text style={styles.tagline}>
          Contribute to your city by reporting issues and tracking their progress.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  animatedContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 20,
  },
  title: {
    marginTop: 0,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c9b3aff',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    margin: 20,
    marginTop: 10
  },
});
