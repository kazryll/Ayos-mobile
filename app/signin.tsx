import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { signIn } from "../services/auth";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    const { user, error } = await signIn(email, password);

    if (error) {
      Alert.alert("Login Failed", error);
    } else {
      Alert.alert("Success", "Logged in successfully!");
      // Router will automatically redirect due to auth state change
      router.replace("/home");
    }

    setLoading(false);
  };

  /*----------------------------------------------------- Render Function --------------------------------------------------------- */
  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require("../assets/Ayos-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Title */}
      <Text style={styles.title}>Login to your account</Text>

      {/* Email Input */}
      <TextInput
        placeholder="Email"
        placeholderTextColor="#9c9c9cff"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />

      {/* Password Input */}
      <TextInput
        placeholder="Password"
        placeholderTextColor="#9c9c9cff"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />

      {/* Login Button */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Logging in..." : "Login"}
        </Text>
      </TouchableOpacity>

      {/* Link to Signup */}
      <Text style={styles.signupText}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" style={styles.signupLink}>
          Signup
        </Link>
      </Text>
    </View>
  );
}

/*----------------------------------------------------- Styles --------------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  logo: {
    width: 100,
    height: 80,
    marginBottom: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    width: "100%",
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#666",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  signupText: {
    marginTop: 20,
    fontSize: 14,
  },
  signupLink: {
    fontWeight: "bold",
  },
});
