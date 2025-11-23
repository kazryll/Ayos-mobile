import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BottomNav from "../components/BottomNav";
import { auth } from "../config/firebase";
import theme from "../config/theme";
import { getUserReports } from "../services/reports";
import { getUserStats } from "../services/userService";

export default function ActivityScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    inProgressReports: 0,
    resolvedReports: 0,
  });
  const [reports, setReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
    loadActivityData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivityData();
    setRefreshing(false);
  };

  const loadActivityData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/signin");
        return;
      }

      const stats = await getUserStats(user.uid);
      setUserStats(stats || userStats);

      const userReports = await getUserReports(user.uid);
      setReports(userReports || []);
      applyFilter(activeFilter, userReports || []);
    } catch (error) {
      console.error("Error loading activity data:", error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (filter: string, list?: any[]) => {
    const source = list ?? reports;
    let out = source;
    switch (filter) {
      case "pending":
        out = source.filter(
          (r) => (r.status || "pending").toLowerCase() === "pending"
        );
        break;
      case "in-progress":
      case "inprogress":
      case "in progress":
        out = source.filter(
          (r) => (r.status || "pending").toLowerCase() === "in-progress"
        );
        break;
      case "resolved":
        out = source.filter(
          (r) => (r.status || "pending").toLowerCase() === "resolved"
        );
        break;
      default:
        out = source; // all
    }

    setFilteredReports(out);
    setActiveFilter(filter);
  };

  const getTotalViews = () => {
    return reports.reduce((acc, r) => acc + (r.views || 0), 0);
  };

  const renderReportItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity style={styles.reportItem} onPress={() => {}}>
        <View style={styles.reportInfo}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>{item.title || "Untitled"}</Text>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: item.categoryColor || "#6C757D" },
              ]}
            >
              <Text style={styles.categoryBadgeText}>
                {item.category || "General"}
              </Text>
            </View>
          </View>

          <Text style={styles.reportLocation}>
            📍 {item.location?.address || item.location || "Unknown"}
          </Text>
          <Text style={styles.reportDate}>
            📅{" "}
            {item.createdAt?.toDate
              ? item.createdAt.toDate().toLocaleDateString()
              : new Date(item.createdAt || Date.now()).toLocaleDateString()}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            item.status === "resolved"
              ? styles.resolvedBadge
              : item.status === "in-progress"
              ? styles.inProgressBadge
              : styles.pendingBadge,
          ]}
        >
          <Text style={styles.statusText}>
            {(item.status || "pending")
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase())}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading your activity...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3498db"]}
            tintColor="#3498db"
          />
        }
      >
        <LinearGradient
          colors={[theme.Colors.primaryDark, theme.Colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Your Activity</Text>

          <View style={styles.metricsCard}>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{userStats.totalReports}</Text>
              <Text style={styles.metricLabel}>Reports</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>
                {userStats.resolvedReports}
              </Text>
              <Text style={styles.metricLabel}>Resolved</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{getTotalViews()}</Text>
              <Text style={styles.metricLabel}>
                Total Views
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Category Filter */}
        <View style={styles.filterContainer}>
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending" },
            { key: "in-progress", label: "In Progress" },
            { key: "resolved", label: "Resolved" },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterButton,
                activeFilter === f.key && styles.filterButtonActive,
              ]}
              onPress={() => applyFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterLabel,
                  activeFilter === f.key && styles.filterLabelActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reports List */}
        <View style={styles.section}>
          {filteredReports.length > 0 ? (
            <FlatList
              data={filteredReports}
              keyExtractor={(i) => i.id}
              renderItem={renderReportItem}
            />
          ) : (
            <View style={styles.noReportsContainer}>
              <Text style={styles.noReports}>
                No reports found for this filter
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 10,
    color: "#7f8c8d",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 48,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    marginBottom: 12,
    textAlign: "center",
  },
  metricsCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  metricLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.86)",
  },
  filterContainer: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    justifyContent: "space-around",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  filterButtonActive: {
    backgroundColor: theme.Colors.primary,
  },
  filterLabel: {
    color: "#1C1C1E",
    fontWeight: "600",
  },
  filterLabelActive: {
    color: "white",
  },
  section: {
    paddingHorizontal: 12,
    paddingBottom: 80,
  },
  reportItem: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportInfo: {
    flex: 1,
    marginRight: 12,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: "white",
  },
  reportLocation: {
    color: "#6C757D",
    fontSize: 13,
  },
  reportDate: {
    color: "#6C757D",
    fontSize: 13,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: "#FFD966",
  },
  inProgressBadge: {
    backgroundColor: "#D1E8FF",
  },
  resolvedBadge: {
    backgroundColor: "#DFF7E0",
  },
  statusText: {
    fontWeight: "700",
  },
  noReportsContainer: {
    padding: 20,
    alignItems: "center",
  },
  noReports: {
    color: "#6C757D",
  },
});
