import { Ionicons } from "@expo/vector-icons";
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

    // Special case: "all" filter shows everything
    if (filter === "all") {
      out = source;
    } else {
      // Normalize status by converting underscores to hyphens and lowercasing
      const normalizeStatus = (status: string) =>
        (status || "for_approval").toLowerCase().replace(/_/g, "-");

      const filterKey = normalizeStatus(filter);

      out = source.filter((r) => normalizeStatus(r.status) === filterKey);
    }

    setFilteredReports(out);
    setActiveFilter(filter);
  };

  const getTotalViews = () => {
    return reports.reduce((acc, r) => acc + (r.views || 0), 0);
  };

  const getReportCategory = (report: any) => {
    if (report?.aiGeneratedAnalysis?.category) {
      return report.aiGeneratedAnalysis.category;
    }
    if (report?.category) {
      return report.category;
    }
    return "General";
  };

  const getCategoryDisplayName = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      "Waste Management & Sanitation": "Waste & Sanitation",
      "Water Supply & Drainage": "Water & Drainage",
      "Electricity & Street Lighting": "Electricity & Lighting",
      "Public Infrastructure & Facilities": "Infrastructure",
      "Transportation & Traffic Management": "Transportation",
      "Community Amenities & Environmental Concerns": "Environment",
      "Public Health & Safety (Non-Emergency)": "Health & Safety",
      "Animal & Veterinary Concerns": "Animal Welfare",
      "Public Order & Minor Disturbances": "Public Order",
      "Social Welfare & Accessibility": "Social Welfare",
      "Governance & Transparency Reports": "Governance",
    };
    return categoryMap[category] || category;
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: string } = {
      "Waste Management & Sanitation": "trash-outline",
      "Water Supply & Drainage": "water-outline",
      "Electricity & Street Lighting": "bulb-outline",
      "Public Infrastructure & Facilities": "business-outline",
      "Transportation & Traffic Management": "car-outline",
      "Community Amenities & Environmental Concerns": "leaf-outline",
      "Public Health & Safety (Non-Emergency)": "medical-outline",
      "Animal & Veterinary Concerns": "paw-outline",
      "Public Order & Minor Disturbances": "alert-circle-outline",
      "Social Welfare & Accessibility": "people-outline",
      "Governance & Transparency Reports": "document-text-outline",
    };
    return iconMap[category] || "information-circle-outline";
  };

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      "Waste Management & Sanitation": "#A0826D",
      "Water Supply & Drainage": "#6BB6FF",
      "Electricity & Street Lighting": "#E8B339",
      "Public Infrastructure & Facilities": "#8B9DAF",
      "Transportation & Traffic Management": "#FF7F6E",
      "Community Amenities & Environmental Concerns": "#6BCF7F",
      "Public Health & Safety (Non-Emergency)": "#E85D6B",
      "Animal & Veterinary Concerns": "#FF8BBF",
      "Public Order & Minor Disturbances": "#FFA347",
      "Social Welfare & Accessibility": "#B090E0",
      "Governance & Transparency Reports": "#6B9FD4",
    };
    return colorMap[category] || "#8B94A1";
  };

  const getStatusColor = (status: string) => {
    const normalized = (status || "for_approval").toLowerCase().replace(/_/g, "-");
    const colors: Record<string, string> = {
      "for-approval": "#F5A524",
      "approved": "#00B894",
      "rejected": "#E74C3C",
      "in-progress": "#42A5F5",
      "resolved": "#2ECC71",
    };
    return colors[normalized] || "#B0BEC5";
  };

  const renderReportItem = ({ item }: { item: any }) => {
    const category = getReportCategory(item);
    const statusKey = (item.status || "for_approval").toLowerCase().replace(/_/g, "-");
    const statusColor = getStatusColor(item.status);
    const statusLabel = ((item.status || "for_approval") as string)
      .replace(/[_\-]/g, " ")
      .split(" ")
      .map((segment: string) =>
        segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : ""
      )
      .join(" ")
      .trim();

    return (
      <TouchableOpacity style={styles.reportCard} onPress={() => {}}>
        {/* Status Indicator Bar - Left edge color indicator */}
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />

        <View style={styles.cardContent}>
          {/* Date Badge - Top right corner */}
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={10} color="#6C757D" />
            <Text style={styles.dateText}>
              {(() => {
                const date =
                  item.createdAt?.toDate?.() || new Date(item.createdAt);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffDays = Math.floor(diffMs / 86400000);

                if (diffDays === 0) return "Today";
                if (diffDays === 1) return "Yesterday";
                if (diffDays < 7) return `${diffDays}d ago`;
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              })()}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.cardTitle}>
            {item.aiGeneratedAnalysis?.title ||
              item.originalDescription?.slice(0, 60) ||
              "Untitled report"}
          </Text>

          {/* Badges Row - Category + Status side by side */}
          <View style={styles.badgesRow}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: getCategoryColor(category) },
              ]}
            >
              <Ionicons
                name={getCategoryIcon(category) as any}
                size={10}
                color="white"
                style={{ marginRight: 3 }}
              />
              <Text style={styles.categoryBadgeText}>
                {getCategoryDisplayName(category)}
              </Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
            >
              <Text style={styles.statusBadgeText}>{statusLabel}</Text>
            </View>
          </View>

          {/* Location Row */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color="#6C757D" />
            <Text style={styles.locationText}>
              {item.location?.barangay || item.location?.city || "Baguio City"}
            </Text>
          </View>
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
              <Text style={styles.metricLabel}>Total Views</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Category Filter (includes LGU statuses for user's own reports) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          style={styles.filterScroll}
        >
          {[
            { key: "all", label: "All" },
            { key: "for_approval", label: "For Approval" },
            { key: "approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
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
        </ScrollView>

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
  filterScroll: {
    paddingVertical: 8,
  },
  filterScrollContent: {
    paddingHorizontal: 12,
    alignItems: "center",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
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
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  reportCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: "row",
  },
  statusIndicator: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  dateBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  dateText: {
    fontSize: 10,
    color: "#6C757D",
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
    marginRight: 80,
    lineHeight: 20,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: "#6C757D",
  },
  noReportsContainer: {
    padding: 20,
    alignItems: "center",
  },
  noReports: {
    color: "#6C757D",
  },
});
