// screens/HomeScreen.tsx
import { getNotificationsForUser } from "@/services/notifications";
import {
  getAllReports,
  getComments,
  getUserVoteForReport,
  voteReport,
} from "@/services/reports";
import {
  getLeaderboard,
  getUserProfile,
  getUserStats,
} from "@/services/userService";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
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
const paperIcon = require("@/assets/icons/paper.png");
const trophyIcon = require("@/assets/icons/trophy.png");
const chartBarIcon = require("@/assets/icons/chart-bar.png");
const ayosLogo = require("@/assets/Ayos-logo.png");
// Google Maps API key (used for web map rendering)
const GOOGLE_MAPS_API_KEY = "AIzaSyBRV1JEt_qSWZPxpvouEUNzuPbW5gWW4yc";
// note: getUserProfile imported from userService above

export default function HomeScreen() {
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { isLoaded: homeMapLoaded, loadError: homeMapLoadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    id: "google-map-script",
  });
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
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userVotes, setUserVotes] = useState<{ [key: string]: string }>({});
  const [votingReportId, setVotingReportId] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState<{
    [key: string]: boolean;
  }>({});
  const [commentingReportId, setCommentingReportId] = useState<string | null>(
    null
  );
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reportComments, setReportComments] = useState<{
    [key: string]: any[];
  }>({});
  const [mapReloadKey, setMapReloadKey] = useState(0);

  useEffect(() => {
    loadHomeData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setMapReloadKey((prev) => prev + 1);
    }, [])
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  // Map center and markers (use first available report location or fallback)
  const mapDefaultCenter = { lat: 16.4023, lng: 120.596 };
  const firstGeo = feedReports.find(
    (r) => r.location && (r.location.latitude || r.location.lat)
  );
  const mapCenter = firstGeo
    ? {
        lat: firstGeo.location.latitude || firstGeo.location.lat,
        lng: firstGeo.location.longitude || firstGeo.location.lng,
      }
    : mapDefaultCenter;

  const mapMarkers = feedReports
    .filter((r) => r.location && (r.location.latitude || r.location.lat))
    .map((r) => ({
      id: r.id,
      position: {
        lat: r.location.latitude || r.location.lat,
        lng: r.location.longitude || r.location.lng,
      },
      title: r.aiGeneratedAnalysis?.title || r.originalDescription || "Report",
    }));

  // Top reports derived by total votes (up + down), top 3
  const topReports = [...feedReports]
    .sort(
      (a, b) =>
        (b.upvotes || 0) +
        (b.downvotes || 0) -
        ((a.upvotes || 0) + (a.downvotes || 0))
    )
    .slice(0, 3);

  const mapHtml = useMemo(() => {
    const markers = JSON.stringify(mapMarkers);
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="initial-scale=1, maximum-scale=1" />
          <style>
            html, body, #map {
              height: 100%;
              margin: 0;
              padding: 0;
            }
          </style>
          <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}"></script>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const center = { lat: ${mapCenter.lat}, lng: ${mapCenter.lng} };
            const map = new google.maps.Map(document.getElementById('map'), {
              center,
              zoom: 13,
              disableDefaultUI: true
            });
            const markers = ${markers};
            markers.forEach(marker => {
              new google.maps.Marker({
                map,
                position: marker.position,
                title: marker.title
              });
            });
          </script>
        </body>
      </html>
    `;
  }, [mapCenter, mapMarkers]);

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

        // Load comments for all reports
        try {
          const commentsMap: { [key: string]: any[] } = {};
          for (const report of withAuthors) {
            try {
              const comments = await getComments(report.id);
              // Enrich comments with author names
              const enrichedComments = await Promise.all(
                comments.map(async (comment: any) => {
                  try {
                    const commentAuthor = comment.userId
                      ? await getUserProfile(comment.userId)
                      : null;
                    const authorName =
                      commentAuthor?.displayName ||
                      commentAuthor?.name ||
                      (comment.userId
                        ? comment.userId.split("@")[0]
                        : "Anonymous");
                    return { ...comment, authorName };
                  } catch (err) {
                    return {
                      ...comment,
                      authorName: comment.userId
                        ? comment.userId.split("@")[0]
                        : "Anonymous",
                    };
                  }
                })
              );
              commentsMap[report.id] = enrichedComments || [];
            } catch (commentErr) {
              console.warn(
                `Could not load comments for report ${report.id}:`,
                commentErr
              );
              commentsMap[report.id] = [];
            }
          }
          setReportComments(commentsMap);
        } catch (commentErr) {
          console.warn("Could not load report comments:", commentErr);
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
      // Load leaderboard entries (LGU-verified reports -> ranking)
      try {
        const lb = await getLeaderboard(20);
        setLeaderboard(lb || []);
      } catch (err) {
        console.warn("Could not load leaderboard:", err);
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
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapCenter.lat},${mapCenter.lng}`;
    Linking.openURL(mapUrl).catch(() => {
      Alert.alert("Unable to open Google Maps");
    });
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
    const status = report && report.status ? report.status : "for_approval";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusBadgeStyle = (report: any) => {
    const status = report && report.status ? report.status : "for_approval";
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

  const handleVote = async (reportId: string, voteType: "up" | "down") => {
    // Prevent spam clicking - if already voting on this report, ignore
    if (submittingVote[reportId]) {
      return;
    }

    try {
      if (!auth.currentUser) {
        Alert.alert("Sign in required");
        return;
      }

      // Capture previous vote to compute optimistic deltas
      const prevVote = userVotes[reportId] || null;

      // Compute new vote state (toggle behavior)
      const newVote = prevVote === voteType ? null : voteType;

      // Optimistic UI update: mark submitting and update local vote state and counts
      setSubmittingVote((prev) => ({ ...prev, [reportId]: true }));

      // Optimistically update userVotes
      setUserVotes((prev) => {
        const next = { ...prev };
        if (newVote === null) {
          delete next[reportId];
        } else {
          next[reportId] = newVote;
        }
        return next;
      });

      // Optimistically update feed counts
      setFeedReports((prev) =>
        prev.map((report) => {
          if (report.id !== reportId) return report;

          let up = report.upvotes || 0;
          let down = report.downvotes || 0;

          // Remove previous vote
          if (prevVote === "up") up = Math.max(0, up - 1);
          if (prevVote === "down") down = Math.max(0, down - 1);

          // Apply new vote
          if (newVote === "up") up += 1;
          if (newVote === "down") down += 1;

          return { ...report, upvotes: up, downvotes: down };
        })
      );

      // Call backend - if it fails, we'll revert optimistic changes
      try {
        await voteReport(reportId, auth.currentUser.uid, voteType);
      } catch (err) {
        // Revert optimistic updates
        console.error("Error voting on report (reverting):", err);
        // Revert userVotes
        setUserVotes((prev) => {
          const reverted = { ...prev };
          if (prevVote === null) {
            // we had no previous vote, so remove the optimistic one
            delete reverted[reportId];
          } else {
            // restore previous vote
            reverted[reportId] = prevVote;
          }
          return reverted;
        });

        // Revert feed counts
        setFeedReports((prev) =>
          prev.map((report) => {
            if (report.id !== reportId) return report;
            let up = report.upvotes || 0;
            let down = report.downvotes || 0;

            // Undo optimistic changes
            if (newVote === "up") up = Math.max(0, up - 1);
            if (newVote === "down") down = Math.max(0, down - 1);

            if (prevVote === "up") up += 1;
            if (prevVote === "down") down += 1;

            return { ...report, upvotes: up, downvotes: down };
          })
        );

        Alert.alert("Error", "Failed to vote on report");
      }

      setVotingReportId(null);
    } catch (error) {
      console.error("Error voting on report:", error);
      Alert.alert("Error", "Failed to vote on report");
    } finally {
      setSubmittingVote((prev) => ({ ...prev, [reportId]: false }));
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
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3498db"]}
            tintColor={"#3498db"}
          />
        }
      >
        {/* Header - White Background with Logo */}
        <View style={styles.stickyHeader}>
          <View style={styles.headerBar}>
            <View style={styles.headerLeft}>
              <Image
                source={ayosLogo}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.greetingText}>Hi, {getDisplayName()}!</Text>
            </View>

            {/* Notification on Right */}
            <TouchableOpacity
              onPress={() => router.push("/notifications" as any)}
              style={styles.notificationButton}
            >
              <Image
                source={notificationIcon}
                style={styles.notificationIcon}
              />
              <Text style={styles.notificationCount}>
                {notifications.filter((n) => !n.read).length}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Your Impact Card - Redesigned */}
        <View style={[styles.section, { paddingTop: 20 }]}>
          <View style={styles.yourImpactCard}>
            <View style={styles.yourImpactContent}>
              <View style={styles.yourImpactLeft}>
                <View style={styles.yourImpactIcon}>
                  <Image
                    source={paperIcon}
                    style={{ width: 20, height: 20, tintColor: "white" }}
                  />
                </View>
                <View>
                  <Text style={styles.yourImpactLabel}>Your Impact</Text>
                  <Text style={styles.yourImpactNumber}>
                    {userStats.totalReports} Reports Submitted
                  </Text>
                </View>
              </View>
              <View style={styles.yourImpactBadge}>
                <Text style={styles.yourImpactBadgeText}>
                  +{userStats.pendingReports} Pending
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tip of the Day & Rewards */}
        <View style={styles.twoColumnRow}>
          <View style={styles.tipCardNew}>
            <Text style={styles.tipIconTitle}>Tip of the Day</Text>
            <Text style={styles.tipTextNew}>
              Report broken streetlights to help keep roads safe at night.
            </Text>
          </View>

          <View style={styles.rewardsCardNew}>
            <Text style={styles.rewardsIconTitle}>Rewards</Text>
            <Text style={styles.rewardsSubtext}>
              Vouchers, discounts, and More!
            </Text>
            <View style={styles.rewardBadgesRow}>
              <View style={styles.rewardBadge}>
                <Image
                  source={require("@/assets/icons/foodpanda.png")}
                  style={{ width: 20, height: 20 }}
                />
              </View>
              <View style={styles.rewardBadge}>
                <Image
                  source={require("@/assets/icons/grab.png")}
                  style={{ width: 20, height: 20 }}
                />
              </View>
              <View style={styles.rewardBadge}>
                <Image
                  source={require("@/assets/icons/sm.png")}
                  style={{ width: 20, height: 20 }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Issues Near You Section */}
        <View style={styles.section}>
          <View style={styles.issuesHeader}>
            <View>
              <Text style={styles.issuesTitle}>Issues Near You</Text>
              <Text style={styles.issuesSubtitle}>Bakakeng, Baguio City</Text>
            </View>
            <TouchableOpacity style={styles.fullMapButton}>
              <Text style={styles.fullMapButtonText}>Full Map</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mapWrapper}>
            {isWeb ? (
              homeMapLoaded ? (
                <GoogleMap
                  mapContainerStyle={{
                    width: "100%",
                    height: 220,
                    borderRadius: 12,
                  }}
                  center={mapCenter}
                  zoom={13}
                  options={{ disableDefaultUI: true }}
                >
                  {mapMarkers.map((m) => (
                    <Marker key={m.id} position={m.position} title={m.title} />
                  ))}
                </GoogleMap>
              ) : (
                <View style={{
                  width: "100%",
                  height: 220,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 12,
                  backgroundColor: '#fff'
                }}>
                  <ActivityIndicator size="small" color={theme.Colors.primary} />
                </View>
              )
            ) : (
              <WebView
                key={`map-webview-${mapReloadKey}`}
                originWhitelist={["*"]}
                source={{ html: mapHtml }}
                style={styles.mapWebView}
                scrollEnabled={false}
                javaScriptEnabled
                domStorageEnabled
              />
            )}
          </View>
          <View style={styles.issuesLegend}>
            <View style={styles.legendItem}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#167048",
                  marginRight: 6,
                }}
              />
              <Text style={styles.legendText}>You</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#FFD93D",
                  marginRight: 6,
                }}
              />
              <Text style={styles.legendText}>Pending</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#3498db",
                  marginRight: 6,
                }}
              />
              <Text style={styles.legendText}>In-Progress</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#51CF66",
                  marginRight: 6,
                }}
              />
              <Text style={styles.legendText}>Resolved</Text>
            </View>
          </View>
        </View>

        {/* Top Reports Section */}
        <View style={styles.section}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Image
              source={chartBarIcon}
              style={{
                width: 20,
                height: 20,
                marginRight: 8,
                tintColor: theme.Colors.primary,
              }}
            />
            <Text style={styles.sectionTitle}>Top Reports</Text>
            <TouchableOpacity
              style={{ marginLeft: "auto" }}
              onPress={() => router.push("/reports" as any)}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {topReports.map((report, idx) => (
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
            </View>
          ))}
        </View>

        {/* Removed 'You' section: verified report count will be shown in profile/dedicated page */}
        {/* Leaderboard Section (database-driven) */}
        <View style={styles.section}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Image
              source={trophyIcon}
              style={{
                width: 20,
                height: 20,
                marginRight: 8,
                tintColor: theme.Colors.primary,
              }}
            />
            <Text style={styles.leaderboardTitle}>Leaderboard</Text>
          </View>
          {leaderboard.length === 0 ? (
            <View style={styles.leaderboardCard}>
              <Text style={{ color: "#7f8c8d" }}>No ranked users yet</Text>
            </View>
          ) : (
            leaderboard.map((entry: any, idx: number) => (
              <View
                key={entry.userId}
                style={[styles.leaderboardCard, { marginBottom: 12 }]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={styles.leaderboardAvatar}>
                      <Text style={styles.leaderboardAvatarText}>
                        {(entry.displayName || "?").slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.leaderboardUserName}>
                        {entry.displayName}
                      </Text>
                      <Text style={styles.leaderboardPoints}>
                        {entry.verifiedReports} verified reports •{" "}
                        {entry.points} pts
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.leaderboardRankText}>#{idx + 1}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
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
  stickyHeader: {
    backgroundColor: "white",
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
    zIndex: 100,
    position: Platform.OS === "web" ? "sticky" : "relative",
    top: 0,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "white",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
  },
  notificationButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationIcon: {
    width: 24,
    height: 24,
    marginRight: 6,
    tintColor: theme.Colors.primary,
  },
  notificationCount: {
    color: theme.Colors.primary,
    fontSize: 14,
    fontWeight: "600",
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
    width: "100%",
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
  inlineCommentContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
    width: "100%",
  },
  inlineCommentInput: {
    borderWidth: 1,
    borderColor: "#bdc3c7",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    color: "#2c3e50",
    textAlignVertical: "top",
    minHeight: 80,
    width: "100%",
  },
  inlineCommentButtons: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  inlineCommentCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#ecf0f1",
  },
  inlineCommentCancelText: {
    color: "#2c3e50",
    fontWeight: "600",
    fontSize: 14,
  },
  inlineCommentSubmit: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#3498db",
  },
  inlineCommentSubmitDisabled: {
    backgroundColor: "#bdc3c7",
  },
  inlineCommentSubmitText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  commentsSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
    width: "100%",
  },
  commentsSectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 10,
  },
  commentItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  commentAuthor: {
    fontWeight: "600",
    color: "#2c3e50",
    fontSize: 13,
  },
  commentDate: {
    fontSize: 11,
    color: "#95a5a6",
  },
  commentText: {
    color: "#34495e",
    fontSize: 13,
    lineHeight: 18,
  },
  // Your Impact Card Styles
  yourImpactCard: {
    backgroundColor: "#167048",
    padding: 16,
    borderRadius: 12,
  },
  yourImpactContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  yourImpactLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  yourImpactIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  yourImpactIconText: {
    fontSize: 20,
  },
  yourImpactLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  yourImpactNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    marginTop: 2,
  },
  yourImpactBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  yourImpactBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  // Two Column Row
  twoColumnRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "white",
  },
  tipCardNew: {
    flex: 0.5,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8f5e9",
  },
  tipIconTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  tipTextNew: {
    fontSize: 12,
    color: "#34495e",
    lineHeight: 18,
  },
  rewardsCardNew: {
    flex: 0.5,
    backgroundColor: "#1a3a52",
    padding: 16,
    borderRadius: 12,
  },
  rewardsIconTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  rewardsSubtext: {
    fontSize: 12,
    color: "#b0bec5",
    marginBottom: 12,
  },
  rewardBadgesRow: {
    flexDirection: "row",
    gap: 8,
  },
  rewardBadge: {
    backgroundColor: "white",
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 12,
    fontWeight: "bold",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  // Issues Near You Styles
  issuesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  issuesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  issuesSubtitle: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 4,
  },
  fullMapButton: {
    borderWidth: 1.5,
    borderColor: "#167048",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  fullMapButtonText: {
    color: "#167048",
    fontWeight: "600",
    fontSize: 13,
  },
  mapWrapper: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ecf0f1",
    backgroundColor: "#fff",
  },
  mapWebView: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  issuesLegend: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendText: {
    fontSize: 12,
    color: "#2c3e50",
    fontWeight: "500",
  },
  // Leaderboard Styles
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  leaderboardCard: {
    backgroundColor: "#e8f5e9",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#167048",
  },
  leaderboardUserRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leaderboardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#167048",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  leaderboardAvatarText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  leaderboardUserInfo: {
    flex: 1,
  },
  leaderboardUserName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  leaderboardPoints: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 2,
  },
  leaderboardRank: {
    alignItems: "flex-end",
  },
  leaderboardRankText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  leaderboardRankChange: {
    fontSize: 12,
    color: "#167048",
    fontWeight: "600",
    marginTop: 2,
  },
  viewAllText: {
    color: "#3498db",
    fontWeight: "600",
    fontSize: 13,
  },
});
