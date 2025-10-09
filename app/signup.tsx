import { Link } from 'expo-router';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignupScreen() {
  return (
    <View style={styles.container}>
        
      {/* Logo */}
      <Image
        source={require('../assets/Ayos-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Title */}
      <Text style={styles.title}>Let’s get you started!</Text>

      {/* Full Name */}
      <TextInput
        placeholder="Full Name"
        placeholderTextColor="#9c9c9cff"
        style={styles.input}
        autoCapitalize="words"
      />

      {/* Email */}
      <TextInput
        placeholder="Email"
        placeholderTextColor="#9c9c9cff"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Password */}
      <TextInput
        placeholder="Password"
        placeholderTextColor="#9c9c9cff"
        style={styles.input}
        secureTextEntry
      />

      {/* Confirm Password */}
      <TextInput
        placeholder="Confirm Password"
        placeholderTextColor="#9c9c9cff"
        style={styles.input}
        secureTextEntry
      />

      {/* Sign up Button */}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Sign up</Text>
      </TouchableOpacity>

      {/* Link to Login */}
      <Text style={styles.loginText}>
        Already have an account?{' '}
        <Link href="/signin" style={styles.loginLink}>
          Login
        </Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    backgroundColor: '#f8f8f8ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    width: '100%',
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginText: {
    marginTop: 20,
    fontSize: 14,
  },
  loginLink: {
    fontWeight: 'bold',
  },
});
