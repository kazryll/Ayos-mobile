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
import { signUp } from "../services/auth";

export default function SignupScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignUp = async () => {
    console.log("🔘 [SIGNUP PAGE] Sign up button clicked!");
    const { displayName, email, password, confirmPassword } = formData;

    if (!displayName || !email || !password || !confirmPassword) {
      console.log("❌ [SIGNUP PAGE] Missing fields");
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      console.log("❌ [SIGNUP PAGE] Password too short:", password.length);
      Alert.alert(
        "Weak Password",
        "Password must be at least 6 characters long.\n\nCurrent length: " +
          password.length +
          " characters"
      );
      return;
    }

    if (password !== confirmPassword) {
      console.log("❌ [SIGNUP PAGE] Passwords don't match");
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    console.log("✅ [SIGNUP PAGE] All validations passed, calling signUp()");
    setLoading(true);

    const { user, error } = await signUp(email, password, displayName);

    console.log("📤 [SIGNUP PAGE] SignUp response:", { user, error });

    if (error) {
      console.log("❌ [SIGNUP PAGE] Signup failed:", error);
      Alert.alert("Sign Up Failed", error);
    } else {
      console.log("✅ [SIGNUP PAGE] Signup success!");
      Alert.alert("Success", "Account created successfully!");
      // Navigate to signin after successful signup
      router.replace("/signin");
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
      <Text style={styles.title}>Let's get you started!</Text>

      {/* Full Name */}
      <TextInput
        placeholder="Full Name"
        placeholderTextColor="#9c9c9cff"
        style={styles.input}
        autoCapitalize="words"
        value={formData.displayName}
        onChangeText={(text) => handleChange("displayName", text)}
        editable={!loading}
      />

      {/* Email */}
      <TextInput
        placeholder="Email"
        placeholderTextColor="#9c9c9cff"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        value={formData.email}
        onChangeText={(text) => handleChange("email", text)}
        editable={!loading}
      />

      {/* Password */}
      <TextInput
        placeholder="Password"
        placeholderTextColor="#9c9c9cff"
        style={styles.input}
        secureTextEntry
        value={formData.password}
        onChangeText={(text) => handleChange("password", text)}
        editable={!loading}
      />

      {/* Confirm Password */}
      <TextInput
        placeholder="Confirm Password"
        placeholderTextColor="#9c9c9cff"
        style={styles.input}
        secureTextEntry
        value={formData.confirmPassword}
        onChangeText={(text) => handleChange("confirmPassword", text)}
        editable={!loading}
      />

      {/* Sign up Button */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Creating Account..." : "Sign up"}
        </Text>
      </TouchableOpacity>

      {/* Link to Login */}
      <Text style={styles.loginText}>
        Already have an account?{" "}
        <Link href="/signin" style={styles.loginLink}>
          Login
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
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "#f8f8f8ff",
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
  loginText: {
    marginTop: 20,
    fontSize: 14,
  },
  loginLink: {
    fontWeight: "bold",
  },
});
