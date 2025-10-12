import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import InstallButton from "../components/InstallButton";
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const [user, setUser] = useState<User | null>(null); // ← FIX: Add proper type
  const [authLoading, setAuthLoading] = useState(true);
  const [initialRouteChecked, setInitialRouteChecked] = useState(false);

  // Auth State Listener
  useEffect(() => {
    console.log("🔥 Setting up auth state listener");
    
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => { // ← FIX: Add type here too
      console.log("🔥 Auth state changed:", user ? `User: ${user.email}` : "No user");
      setUser(user);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  // Navigation logic
  useEffect(() => {
    if (authLoading) {
      console.log("⏳ Still loading auth...");
      return;
    }

    if (!initialRouteChecked) {
      console.log("📍 Initial route check. Segments:", segments, "User:", user ? "yes" : "no");
      
      // Initial route determination
      if (!user) {
        // No user - redirect to signin if not already there
        if (segments[0] !== 'signin' && segments[0] !== 'signup') {
          console.log("🔒 No user - redirecting to signin");
          router.replace('/signin');
        }
      } else {
        // User exists - redirect to home if not already there
        if (segments[0] !== 'home') {
          console.log("🚀 User found - redirecting to home");
          router.replace('/home');
        }
      }
      
      setInitialRouteChecked(true);
    }
  }, [authLoading, user, segments, initialRouteChecked]);

  // Your existing PWA setup effects
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
        e.preventDefault();
        deferredPrompt = e;
        console.log("📥 PWA install prompt is ready");

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

  // Show nothing while checking auth state
  if (authLoading) {
    console.log("🔄 Auth loading...");
    return null;
  }

  console.log("🎯 Rendering app with user:", user ? "yes" : "no");

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <InstallButton />
    </>
  );
}