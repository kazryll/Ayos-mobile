// screens/HomeScreen.tsx
import {
  getNotificationsForUser,
  markNotificationRead,
} from "@/services/notifications";
import {
  getAllReports,
  getComments,
  getUserVoteForReport,
  voteReport,
} from "@/services/reports";
import { getUserProfile, getUserStats } from "@/services/userService";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

// Import all vote and comment icons
const arrowUpwardOutline = require("@/assets/icons/arrow-upward-outline.png");
const arrowUpwardBold = require("@/assets/icons/arrow-upward-bold.png");
const arrowDownwardOutline = require("@/assets/icons/arrow-downward-outline.png");
const arrowDownwardBold = require("@/assets/icons/arrow-downward-bold.png");
const commentOutline = require("@/assets/icons/comment-outline.png");
const commentBold = require("@/assets/icons/comment-bold.png");
const notificationIcon = require("@/assets/icons/notification.png");
// note: getUserProfile imported from userService above

export default function HomeScreen() {
  const router = useRouter();
  const [userStats, setUserStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    inProgressReports: 0,
    resolvedReports: 0,
  });
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [feedReports, setFeedReports] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userVotes, setUserVotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadHomeData();
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const loadHomeData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/signin");
        return;
      }

      console.log("📊 Loading home data for user:", user.uid);

      // Load user statistics
      try {
        const stats = await getUserStats(user.uid);
        console.log("✅ User stats loaded:", stats);
        setUserStats(stats);
      } catch (error) {
        console.warn("⚠️ Could not load user stats, using defaults", error);
        setUserStats({
          totalReports: 0,
          pendingReports: 0,
          inProgressReports: 0,
          resolvedReports: 0,
        });
      }

      // Load user profile
      try {
        const profile = await getUserProfile(user.uid);
        console.log("✅ User profile loaded:", profile);
        setUserProfile(profile);
      } catch (error) {
        console.warn("⚠️ Could not load user profile", error);
        setUserProfile(null);
      }

      // Load feed (all reports)
      try {
        console.log("📍 Fetching all reports for feed...");
        const all = await getAllReports(50);
        // attach author display name (first name) where possible
        const withAuthors = await Promise.all(
          all.map(async (r) => {
            try {
              const profile = r.reportedBy
                ? await getUserProfile(r.reportedBy)
                : null;
              const displayName =
                profile?.displayName ||
                profile?.name ||
                (r.reportedBy ? r.reportedBy.split("@")[0] : "User");
              const firstName = displayName.split(" ")[0];
              return { ...r, authorFirstName: firstName };
            } catch (profileErr) {
              // If profile fetch fails for this report, just use fallback name
              console.warn(
                `Could not load profile for report ${r.id}:`,
                profileErr
              );
              const fallbackName = r.reportedBy
                ? r.reportedBy.split("@")[0]
                : "User";
              return { ...r, authorFirstName: fallbackName };
            }
          })
        );
        setFeedReports(withAuthors || []);

        // Load user's votes for all reports
        try {
          const user = auth.currentUser;
          if (user) {
            const votesMap: { [key: string]: string } = {};
            for (const report of withAuthors) {
              const userVote = await getUserVoteForReport(report.id, user.uid);
              if (userVote) {
                votesMap[report.id] = userVote;
              }
            }
            setUserVotes(votesMap);
          }
        } catch (voteErr) {
          console.warn("Could not load user votes:", voteErr);
        }
      } catch (error) {
        console.error("❌ Error loading feed reports:", error);
        setFeedReports([]);
      }

      // Load notifications for user
      try {
        const user = auth.currentUser;
        if (user) {
          const notifs = await getNotificationsForUser(user.uid);
          setNotifications(notifs || []);
        }
      } catch (error) {
        console.warn("Could not load notifications:", error);
      }
    } catch (error) {
      console.error("❌ Error loading home data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReportPress = (reportId: string) => {
    Alert.alert("Report Details", `Viewing report ${reportId}`);
  };

  const handleSeeAllMap = () => {
    Alert.alert("Coming Soon", "Full map view will be available soon!");
  };

  // SAFE data access - won't crash if data is missing
  const getDisplayName = () => {
    if (userProfile && userProfile.displayName)
      return userProfile.displayName.split(" ")[0];
    if (auth.currentUser && auth.currentUser.email)
      return auth.currentUser.email.split("@")[0];
    return "User";
  };

  const getReportTitle = (report: any) => {
    return report && report.title ? report.title : "Untitled Report";
  };

  const getReportLocation = (report: any) => {
    return report && report.location && report.location.address
      ? report.location.address
      : "Unknown location";
  };

  const getReportDate = (report: any) => {
    if (report && report.createdAt && report.createdAt.toDate) {
      return report.createdAt.toDate().toLocaleDateString();
    }
    return "Recently";
  };

  const getReportStatus = (report: any) => {
    const status = report && report.status ? report.status : "pending";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusBadgeStyle = (report: any) => {
    const status = report && report.status ? report.status : "pending";
    switch (status) {
      case "resolved":
        return styles.resolvedBadge;
      case "in-progress":
        return styles.inProgressBadge;
      default:
        return styles.pendingBadge;
    }
  };

  const getReportCategory = (report: any) => {
    return report && report.category ? report.category : "General";
  };

  const getCategoryColor = (report: any) => {
    const category = getReportCategory(report);
    switch (category.toLowerCase()) {
      case "road":
        return "#FF6B6B"; // Red
      case "nature":
        return "#51CF66"; // Green
      case "veterinary":
        return "#FFD93D"; // Yellow
      case "disturbance":
        return "#A78BFA"; // Purple
      default:
        return "#6C757D"; // Gray
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading your reports...</Text>
      </View>
    );
  }

  // Main Content
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3498db"]}
            tintColor={"#3498db"}
          />
        }
      >
        {/* Header - GRADIENT BACKGROUND */}
        <LinearGradient
          colors={[theme.Colors.primaryDark, theme.Colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text style={styles.greeting}>
                Good Morning, {getDisplayName()}!
              </Text>
              {userProfile?.verifiedReportCount !== undefined && (
                <Text style={{ color: "rgba(255,255,255,0.9)", marginTop: 6 }}>
                  Verified reports: {userProfile.verifiedReportCount}
                </Text>
              )}
            </View>
            <View>
              <TouchableOpacity
                onPress={async () => {
                  setNotifOpen(!notifOpen);
                  if (!notifOpen) {
                    const user = auth.currentUser;
                    if (user) {
                      const notifs = await getNotificationsForUser(user.uid);
                      setNotifications(notifs);
                    }
                  }
                }}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <Image
                  source={notificationIcon}
                  style={{
                    width: 24,
                    height: 24,
                    marginRight: 6,
                    tintColor: "white",
                  }}
                />
                <Text
                  style={{ color: "white", fontSize: 16, fontWeight: "600" }}
                >
                  {notifications.filter((n) => !n.read).length}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notifications dropdown */}
          {notifOpen && (
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.95)",
                padding: 10,
                marginTop: 10,
                borderRadius: 8,
              }}
            >
              {notifications.length === 0 ? (
                <Text style={{ color: "#2c3e50" }}>No notifications</Text>
              ) : (
                notifications.map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    onPress={async () => {
                      try {
                        await markNotificationRead(n.id);
                        const user = auth.currentUser;
                        if (user) {
                          const updated = await getNotificationsForUser(
                            user.uid
                          );
                          setNotifications(updated);
                        }
                      } catch (e) {
                        console.warn(e);
                      }
                    }}
                    style={{ paddingVertical: 6 }}
                  >
                    <Text style={{ fontWeight: n.read ? "normal" : "bold" }}>
                      {n.type} •{" "}
                      {n.payload?.reportId
                        ? `Report ${n.payload.reportId}`
                        : ""}
                    </Text>
                    <Text style={{ color: "#7f8c8d", fontSize: 12 }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Stats Container */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{userStats.totalReports}</Text>
              <Text style={styles.statLabel}>Reports Submitted</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>+{userStats.pendingReports}</Text>
              <Text style={styles.statLabel}>This Month</Text>
              <Text style={styles.statSubLabel}>Pending</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Report Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Report</Text>
          <View style={styles.categoryGrid}>
            {["Road", "Nature", "Veterinary", "Disturbance", "Others"].map(
              (category) => (
                <TouchableOpacity key={category} style={styles.categoryButton}>
                  <Text style={styles.categoryText}>{category}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        {/* Tip & Rewards */}
        <View style={styles.row}>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Tip of the Day</Text>
            <Text style={styles.tipText}>
              Report broken streetlights to help keep roads safe at night.
            </Text>
            <TouchableOpacity>
              <Text style={styles.learnMore}>Learn More →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rewardsCard}>
            <Text style={styles.rewardsTitle}>Rewards</Text>
            <Text style={styles.rewardsText}>
              Earn points for active reporting
            </Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>
                {userStats.totalReports * 10} pts
              </Text>
            </View>
          </View>
        </View>

        {/* Feed - All Reports (replaces Issues Near You) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}></View>

          {feedReports.length > 0 ? (
            feedReports.map((report) => (
              <View
                key={report.id}
                style={[
                  styles.reportItem,
                  { flexDirection: "column", alignItems: "flex-start" },
                ]}
              >
                <View style={{ width: "100%" }}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportTitle}>
                      {report.aiGeneratedAnalysis?.title ||
                        report.originalDescription?.slice(0, 80) ||
                        "Untitled"}
                    </Text>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: getCategoryColor(report) },
                      ]}
                    >
                      <Text style={styles.categoryBadgeText}>
                        {report.aiGeneratedAnalysis?.category || "General"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reportLocation}>
                    {report.authorFirstName} •{" "}
                    {new Date(report.createdAt).toLocaleString()}
                  </Text>
                  <Text style={{ marginTop: 8, color: "#34495e" }}>
                    {report.aiGeneratedAnalysis?.summary ||
                      report.originalDescription}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    width: "100%",
                    justifyContent: "space-between",
                    marginTop: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity
                      style={{
                        marginRight: 12,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                      onPress={async () => {
                        try {
                          if (!auth.currentUser) {
                            Alert.alert("Sign in required");
                            return;
                          }
                          await voteReport(
                            report.id,
                            auth.currentUser.uid,
                            "up"
                          );
                          await loadHomeData();
                        } catch (e) {
                          console.warn(e);
                        }
                      }}
                    >
                      <Image
                        source={
                          userVotes[report.id] === "up"
                            ? arrowUpwardBold
                            : arrowUpwardOutline
                        }
                        style={{ width: 18, height: 18, marginRight: 4 }}
                      />
                      <Text
                        style={{
                          fontWeight:
                            userVotes[report.id] === "up" ? "bold" : "normal",
                        }}
                      >
                        {report.upvotes || 0}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        marginRight: 12,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                      onPress={async () => {
                        try {
                          if (!auth.currentUser) {
                            Alert.alert("Sign in required");
                            return;
                          }
                          await voteReport(
                            report.id,
                            auth.currentUser.uid,
                            "down"
                          );
                          await loadHomeData();
                        } catch (e) {
                          console.warn(e);
                        }
                      }}
                    >
                      <Image
                        source={
                          userVotes[report.id] === "down"
                            ? arrowDownwardBold
                            : arrowDownwardOutline
                        }
                        style={{ width: 18, height: 18, marginRight: 4 }}
                      />
                      <Text
                        style={{
                          fontWeight:
                            userVotes[report.id] === "down" ? "bold" : "normal",
                        }}
                      >
                        {report.downvotes || 0}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center" }}
                      onPress={async () => {
                        const c = await getComments(report.id);
                        Alert.alert("Comments", `Found ${c.length} comments`);
                      }}
                    >
                      <Image
                        source={commentOutline}
                        style={{ width: 18, height: 18, marginRight: 4 }}
                      />
                      <Text>View Comments</Text>
                    </TouchableOpacity>
                  </View>
                  <View>
                    <View
                      style={[styles.statusBadge, getStatusBadgeStyle(report)]}
                    >
                      <Text style={styles.statusText}>
                        {getReportStatus(report)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noReportsContainer}>
              <Text style={styles.noReports}>No reports yet</Text>
              <Text style={styles.noReportsSub}>Be the first to post!</Text>
            </View>
          )}
        </View>

        {/* Removed 'You' section: verified report count will be shown in profile/dedicated page */}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

// STYLES - Updated to remove logout button styles
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
    paddingTop: 50, // Keep padding for status bar
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 15,
    borderRadius: 10,
    flex: 0.48,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  statLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 5,
  },
  statSubLabel: {
    fontSize: 12,
    color: "#3498db",
    fontWeight: "bold",
  },
  section: {
    padding: 20,
    backgroundColor: "white",
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  seeAll: {
    color: "#3498db",
    fontWeight: "bold",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryButton: {
    backgroundColor: "#ecf0f1",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    width: "18%",
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "white",
    marginTop: 10,
  },
  tipCard: {
    flex: 0.6,
    backgroundColor: "#e8f4fd",
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 5,
  },
  tipText: {
    fontSize: 14,
    color: "#34495e",
    marginBottom: 10,
    lineHeight: 20,
  },
  learnMore: {
    color: "#3498db",
    fontWeight: "bold",
  },
  rewardsCard: {
    flex: 0.4,
    backgroundColor: "#fff3cd",
    padding: 15,
    borderRadius: 10,
    justifyContent: "space-between",
  },
  rewardsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 5,
  },
  rewardsText: {
    fontSize: 12,
    color: "#856404",
    marginBottom: 10,
  },
  pointsBadge: {
    backgroundColor: "#28a745",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  pointsText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  location: {
    color: "#7f8c8d",
    marginBottom: 15,
    fontSize: 14,
  },
  reportCount: {
    fontSize: 12,
    color: "#95a5a6",
    marginTop: 2,
  },
  reportItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  reportInfo: {
    flex: 1,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "white",
  },
  reportLocation: {
    fontSize: 12,
    color: "#7f8c8d",
    marginBottom: 2,
  },
  reportDate: {
    fontSize: 10,
    color: "#bdc3c7",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  pendingBadge: {
    backgroundColor: "#fff3cd",
  },
  inProgressBadge: {
    backgroundColor: "#cce7ff",
  },
  resolvedBadge: {
    backgroundColor: "#d4edda",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  noReportsContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  noReports: {
    fontSize: 16,
    color: "#7f8c8d",
    marginBottom: 5,
  },
  noReportsSub: {
    fontSize: 14,
    color: "#bdc3c7",
  },
  statusGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statusItem: {
    alignItems: "center",
  },
  statusNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  statusLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 5,
  },
});
