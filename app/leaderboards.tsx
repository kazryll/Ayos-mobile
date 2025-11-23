import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BottomNav from "../components/BottomNav";
import theme from "../config/theme";
import { getLeaderboard } from "../services/userService";

type TimePeriod = "all-time" | "monthly" | "weekly";

const Leaderboards: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all-time");

  // Dummy data for visualization (until LGU verification is implemented)
  const dummyLeaderboard = [
    {
      userId: "user_1",
      displayName: "Papi Kurt",
      avatarUrl: null,
      verifiedReports: 47,
      points: 9.4,
    },
    {
      userId: "user_2",
      displayName: "Klark Luthor",
      avatarUrl: null,
      verifiedReports: 45,
      points: 9.0,
    },
    {
      userId: "user_3",
      displayName: "Maria Santos",
      avatarUrl: null,
      verifiedReports: 32,
      points: 6.4,
    },
    {
      userId: "user_4",
      displayName: "Juan Dela Cruz",
      avatarUrl: null,
      verifiedReports: 28,
      points: 5.6,
    },
    {
      userId: "user_5",
      displayName: "Ana Garcia",
      avatarUrl: null,
      verifiedReports: 21,
      points: 4.2,
    },
  ];

  // Filter entries by time period
  const filterByTimePeriod = (allEntries: any[], period: TimePeriod) => {
    const now = new Date();
    // For now, return dummy data regardless of period
    // This will be replaced with real filtering once backend verification is ready
    return dummyLeaderboard;
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // Try to fetch real leaderboard data
        const data = await getLeaderboard(100);
        if (!mounted) return;
        // Use real data if available, otherwise fall back to dummy
        setEntries(data.length > 0 ? data : dummyLeaderboard);
      } catch (error) {
        console.warn("Using dummy leaderboard data:", error);
        if (mounted) setEntries(dummyLeaderboard);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = filterByTimePeriod(entries, timePeriod).filter((e) =>
    e.displayName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Consistent Gradient Header with Back Button */}
      <LinearGradient
        colors={[theme.Colors.primaryDark, theme.Colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Community Leaderboard</Text>
            <Text style={styles.headerSubtitle}>Top Contributors</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search Container */}
      <View style={styles.searchContainer}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search for contributors"
          placeholderTextColor="#999"
          style={styles.searchInput}
        />
      </View>

      {/* Centered Category Filter Buttons */}
      <View style={styles.filterWrapper}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, timePeriod === "all-time" && styles.tabActive]}
            onPress={() => setTimePeriod("all-time")}
          >
            <Text
              style={[
                styles.tabText,
                timePeriod === "all-time" && styles.tabTextActive,
              ]}
            >
              All Time
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, timePeriod === "monthly" && styles.tabActive]}
            onPress={() => setTimePeriod("monthly")}
          >
            <Text
              style={[
                styles.tabText,
                timePeriod === "monthly" && styles.tabTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, timePeriod === "weekly" && styles.tabActive]}
            onPress={() => setTimePeriod("weekly")}
          >
            <Text
              style={[
                styles.tabText,
                timePeriod === "weekly" && styles.tabTextActive,
              ]}
            >
              Weekly
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Leaderboard List */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {filtered.length > 0 ? (
            filtered.map((item, idx) => (
              <View key={item.userId} style={styles.card}>
                {/* Rank Badge */}
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{idx + 1}</Text>
                </View>

                {/* User Info */}
                <View style={styles.userInfo}>
                  {item.avatarUrl ? (
                    <Image
                      source={{ uri: item.avatarUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitials}>
                        {(item.displayName || "U")
                          .split(" ")
                          .map((s) => s[0])
                          .slice(0, 2)
                          .join("")}
                      </Text>
                    </View>
                  )}
                  <View style={styles.nameContainer}>
                    <Text style={styles.name}>{item.displayName}</Text>
                    <Text style={styles.meta}>
                      {item.verifiedReports} verified reports
                    </Text>
                  </View>
                </View>

                {/* Points Display */}
                <View style={styles.pointsContainer}>
                  <Text style={styles.points}>{item.points}</Text>
                  <Text style={styles.pointsLabel}>pts</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No contributors found.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <BottomNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.Colors.background },
  headerGradient: {
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 12,
    backgroundColor: theme.Colors.primary,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  backButtonText: {
    fontSize: 20,
    color: theme.Colors.background,
    fontWeight: "600",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: theme.Colors.background,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  searchContainer: { padding: 16, paddingBottom: 12 },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    fontSize: 16,
    color: "#1C1C1E",
  },
  filterWrapper: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    alignItems: "center",
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.Colors.primary,
  },
  tabText: { color: "#657274", fontSize: 14, fontWeight: "500" },
  tabTextActive: { color: theme.Colors.primary, fontWeight: "600" },
  list: { padding: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  userInfo: { flex: 1, flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#ddd" },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarInitials: {
    color: theme.Colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  nameContainer: { marginLeft: 12, flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: "#1C1C1E", marginBottom: 2 },
  meta: { fontSize: 13, color: "#7f8c8d" },
  pointsContainer: { alignItems: "flex-end" },
  points: { fontSize: 18, fontWeight: "800", color: theme.Colors.primary },
  pointsLabel: { fontSize: 12, color: "#7f8c8d" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: "#7f8c8d" },
});

export default Leaderboards;
