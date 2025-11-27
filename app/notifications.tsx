import theme from "@/config/theme";
import {
    getNotificationsForUser,
    markAllNotificationsRead,
    markNotificationRead,
} from "@/services/notifications";
import { getUserProfile } from "@/services/userService";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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
import { auth } from "../config/firebase";

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

const getFallbackName = (id?: string) => {
  if (!id) return "Someone";
  return id.includes("@") ? id.split("@")[0] : id;
};

const buildMessage = (notif: any) => {
  const actor = notif.actorName || "Someone";
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

  const loadNotifications = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/signin");
        return;
      }
      const list = await getNotificationsForUser(user.uid, 100);
      const enriched = await Promise.all(
        list.map(async (notif) => {
          const actorId = notif.payload?.actorId;
          if (!actorId) {
            return { ...notif, actorName: "Someone" };
          }
          try {
            const profile = await getUserProfile(actorId);
            const actorName =
              profile?.displayName ||
              profile?.name ||
              getFallbackName(actorId);
            return { ...notif, actorName };
          } catch (error) {
            console.warn("Could not load actor profile:", error);
            return { ...notif, actorName: getFallbackName(actorId) };
          }
        })
      );
      setNotifications(enriched);
      await markAllNotificationsRead(user.uid);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadNotifications();
    }, [loadNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
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
            <Text style={styles.backButtonText}>←</Text>
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

