import theme from "@/config/theme";
import {
    markAllNotificationsRead,
    markNotificationRead,
    subscribeToNotifications,
} from "@/services/notifications";
import { getUserProfile } from "@/services/userService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import BottomNav from "../components/BottomNav";
import { auth, db } from "../config/firebase";

const HERO_HEIGHT = Dimensions.get("window").height * 0.1;

const formatDateTime = (value: any) => {
  let date: Date;
  if (value && typeof value.toDate === "function") {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getFirstName = (name?: string) => {
  if (!name || typeof name !== "string") return null;
  // Extract first name (first word before space, or entire string if single word)
  const trimmed = name.trim();
  if (!trimmed) return null;
  const firstPart = trimmed.split(/\s+/)[0];
  // Capitalize first letter, keep rest as-is (preserve casing like "McDonald")
  if (firstPart) {
    return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
  }
  return null;
};

const buildMessage = (notif: any) => {
  const actor = notif.actorName || "A user";
  switch (notif.type) {
    case "comment":
      return `${actor} commented: ${notif.payload?.text || ""}`;
    case "upvote":
      return `${actor} liked your post.`;
    case "downvote":
      return `${actor} disliked your post.`;
    case "verified":
      return `Great news! Your report ${notif.payload?.reportId || ""} was verified.`;
    default:
      return "You have a new notification.";
  }
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const enrichNotifications = useCallback(async (list: any[]) => {
    const enriched = await Promise.all(
        list.map(async (notif) => {
          let actorId = notif.payload?.actorId;

          // For old notifications without actorId, try to get it from the comment
          if (!actorId && notif.type === "comment" && notif.payload?.commentId && notif.payload?.reportId) {
            try {
              const commentDoc = await getDoc(
                doc(db, "reports", notif.payload.reportId, "comments", notif.payload.commentId)
              );
              if (commentDoc.exists()) {
                actorId = commentDoc.data().userId;
              }
            } catch (err) {
              console.warn("Could not fetch comment for notification:", notif.id, err);
            }
          }

          // For old vote notifications without actorId, try to get it from reportVotes
          if (!actorId && (notif.type === "upvote" || notif.type === "downvote") && notif.payload?.reportId) {
            try {
              const voteType = notif.type === "upvote" ? "up" : "down";
              const votesQuery = query(
                collection(db, "reportVotes"),
                where("reportId", "==", notif.payload.reportId),
                where("vote", "==", voteType),
                limit(1)
              );
              const votesSnapshot = await getDocs(votesQuery);
              if (!votesSnapshot.empty) {
                const voteData = votesSnapshot.docs[0].data();
                if (voteData.userId) {
                  actorId = voteData.userId;
                  console.log(`🔍 Recovered actorId from vote for ${notif.type} notification: ${actorId}`);
                }
              }
            } catch (err) {
              console.warn("Could not fetch vote for notification:", notif.id, err);
            }
          }

          if (!actorId) {
            // For verified notifications, there's no actor
            if (notif.type === "verified") {
              return { ...notif, actorName: "System" };
            }
            console.warn("Notification missing actorId:", notif.id, "type:", notif.type);
            return { ...notif, actorName: "A user" };
          }

          try {
            const profile = await getUserProfile(actorId);
            if (profile) {
              // displayName is required during signup, so it should always exist
              // Check displayName first (primary field), then name, then email
              let fullName = profile.displayName || profile.name || profile.email;

              if (fullName && typeof fullName === "string" && fullName.trim()) {
                const firstName = getFirstName(fullName.trim());
                if (firstName) {
                  console.log(`✅ Extracted firstName "${firstName}" from "${fullName}" for ${notif.type} notification, actorId: ${actorId}`);
                  return { ...notif, actorName: firstName };
                } else {
                  console.warn(`⚠️ getFirstName returned null for "${fullName}" (actorId: ${actorId}, type: ${notif.type})`);
                }
              } else {
                console.warn(`⚠️ No valid fullName found in profile (actorId: ${actorId}, type: ${notif.type})`, {
                  displayName: profile.displayName,
                  name: profile.name,
                  email: profile.email,
                  fullNameType: typeof fullName,
                  fullNameValue: fullName,
                });
              }
              // Log if we have a profile but couldn't extract a name
              console.warn(`Profile found but no valid name for actorId: ${actorId}`, {
                displayName: profile.displayName,
                name: profile.name,
                email: profile.email,
                type: notif.type,
              });
            } else {
              console.warn(`No profile found for actorId: ${actorId}, type: ${notif.type}`);
            }

            // If profile doesn't exist or has no name, try to extract from actorId if it's an email
            // (actorId is usually a Firebase UID, but check just in case)
            if (actorId.includes("@")) {
              const emailPrefix = actorId.split("@")[0];
              const firstName = getFirstName(emailPrefix);
              if (firstName) {
                return { ...notif, actorName: firstName };
              }
            }

            // This should rarely happen since displayName is required during signup
            // But if it does, we'll use a generic name
            console.error(`Could not extract name for actorId: ${actorId}`, {
              hasProfile: !!profile,
              profileKeys: profile ? Object.keys(profile) : [],
            });
            return { ...notif, actorName: "A user" };
          } catch (error) {
            console.error("Error loading actor profile:", error, "actorId:", actorId);
            // Try to extract from actorId if it's an email
            if (actorId.includes("@")) {
              const emailPrefix = actorId.split("@")[0];
              const firstName = getFirstName(emailPrefix);
              if (firstName) {
                return { ...notif, actorName: firstName };
              }
            }
            return { ...notif, actorName: "A user" };
          }
        })
      );
    return enriched;
  }, []);

  // Set up real-time listener
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/signin");
      return;
    }

    setLoading(true);

    // Subscribe to real-time notifications
    const unsubscribe = subscribeToNotifications(
      user.uid,
      async (notificationsList) => {
        try {
          // Enrich notifications with actor names
          const enriched = await enrichNotifications(notificationsList);
          setNotifications(enriched);

          // Mark all as read
          if (enriched.length > 0) {
            await markAllNotificationsRead(user.uid);
          }
        } catch (error) {
          console.error("Error enriching notifications:", error);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      100 // Limit to 100 most recent notifications
    );

    // Cleanup: unsubscribe when component unmounts
    return () => {
      console.log("🔌 Unsubscribing from notifications listener");
      unsubscribe();
    };
  }, [router, enrichNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    // The real-time listener will automatically update the data
    // Just reset the refreshing state after a brief delay
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  };

  const handleMarkRead = async (notificationId: string) => {
    await markNotificationRead(notificationId);
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.card, item.read && styles.cardRead]}
      onPress={() => handleMarkRead(item.id)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{buildMessage(item)}</Text>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.cardMeta}>{formatDateTime(item.createdAt)}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.Colors.primary} />
        <Text style={{ marginTop: 12, color: "#475569" }}>
          Loading notifications...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.Colors.primary, theme.Colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.Colors.primary]}
            tintColor={theme.Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptySubtitle}>
              We’ll let you know when there’s something new.
            </Text>
          </View>
        }
      />

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.Colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.Colors.background,
  },
  hero: {
    height: HERO_HEIGHT,
    minHeight: 70,
    paddingHorizontal: 20,
    justifyContent: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  heroTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardRead: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginRight: 8,
  },
  cardMeta: {
    fontSize: 12,
    color: "#94A3B8",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.Colors.primary,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
});

