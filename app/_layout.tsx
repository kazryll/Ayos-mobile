import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

export default function Layout() {
  useEffect(() => {
    console.log("📢 Layout mounted. Platform:", Platform.OS);

    if (Platform.OS === "web") {
      console.log("🌐 Web detected");
    }

    if (Platform.OS === "web" && "serviceWorker" in navigator) {
      console.log("🧪 Service worker supported. Attempting to register...");
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((reg) => console.log("✅ Service worker registered:", reg))
        .catch((err) => console.error("❌ Service worker failed:", err));
    } else {
      console.warn("🚫 Service worker not supported or not web");
    }
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
