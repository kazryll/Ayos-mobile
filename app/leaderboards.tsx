import { Stack } from "expo-router";
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
import theme from "../config/theme";
import { getLeaderboard } from "../services/userService";

const Leaderboards: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const data = await getLeaderboard(100);
      if (!mounted) return;
      setEntries(data);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = entries.filter((e) =>
    e.displayName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Community Leaderboard",
          headerStyle: { backgroundColor: theme.Colors.primary },
          headerTintColor: theme.Colors.background,
        }}
      />

      <View style={styles.headerGradient}>
        <Text style={styles.headerTitle}>Community Leaderboard</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search for contributors"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, styles.tabActive]}>
          <Text style={styles.tabTextActive}>All Time</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Monthly</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Weekly</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {filtered.map((item, idx) => (
            <View key={item.userId} style={styles.card}>
              <View style={styles.left}>
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
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.name}>{item.displayName}</Text>
                  <Text style={styles.meta}>
                    {item.verifiedReports} verified reports
                  </Text>
                </View>
              </View>
              <View style={styles.right}>
                <Text style={styles.points}>{item.points}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
              </View>
            </View>
          ))}
          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No contributors found.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.Colors.background },
  headerGradient: {
    padding: 18,
    backgroundColor: theme.Colors.primary,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTitle: {
    color: theme.Colors.background,
    fontSize: 20,
    fontWeight: "700",
  },
  searchContainer: { padding: 12 },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f2f4f3",
    borderRadius: 20,
  },
  tabActive: { backgroundColor: "#fff" },
  tabText: { color: "#657274" },
  tabTextActive: { color: theme.Colors.primary, fontWeight: "600" },
  list: { padding: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  left: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#ddd" },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: { color: theme.Colors.primary, fontWeight: "700" },
  name: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 12, color: "#7f8c8d" },
  right: { alignItems: "flex-end" },
  points: { fontSize: 18, fontWeight: "800", color: theme.Colors.primary },
  pointsLabel: { fontSize: 12, color: "#7f8c8d" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: "#7f8c8d" },
});

export default Leaderboards;
