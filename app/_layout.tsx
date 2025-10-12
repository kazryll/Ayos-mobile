import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import InstallButton from "../components/InstallButton";

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

  useEffect(() => {
    if (Platform.OS === "web") {
      const existing = document.querySelector("link[rel='manifest']");
      if (!existing) {
        const link = document.createElement("link");
        link.rel = "manifest";
        // ✅ absolute path ensures it's always found at site root
        link.href = `${window.location.origin}/manifest.json`;
        document.head.appendChild(link);
        console.log("✅ Manifest manually injected:", link.href);
      }
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      let deferredPrompt: any;

      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault(); // Prevent the mini-infobar
        deferredPrompt = e;
        console.log("📥 PWA install prompt is ready");

        // Optional: Show your own install button
        const installButton = document.getElementById("install-button");
        if (installButton) {
          installButton.style.display = "block";
          installButton.addEventListener("click", () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult: any) => {
              if (choiceResult.outcome === "accepted") {
                console.log("✅ User accepted the PWA install");
              } else {
                console.log("❌ User dismissed the PWA install");
              }
              deferredPrompt = null;
            });
          });
        }
      });
    }
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <InstallButton />
    </>
  );
}
