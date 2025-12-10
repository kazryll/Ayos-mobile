// screens/HomeScreen.tsx
import {
    subscribeToActivityNotifications,
    subscribeToNotifications,
} from "@/services/notifications";
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
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { GoogleMap, OverlayView, useJsApiLoader } from "@react-google-maps/api";
import * as Location from "expo-location";
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

const ayosLogo = require("@/assets/Ayos-logo.png");
// Google Maps API key (used for web map rendering)
const GOOGLE_MAPS_API_KEY = "AIzaSyBRV1JEt_qSWZPxpvouEUNzuPbW5gWW4yc";
// note: getUserProfile imported from userService above

export default function HomeScreen() {
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { isLoaded: homeMapLoaded, loadError: homeMapLoadError } =
    useJsApiLoader({
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
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    loadHomeData();
    requestUserLocation();
  }, []);

  // Set up real-time notification listener
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Subscribe to real-time notifications
    const unsubscribeNotifications = subscribeToNotifications(
      user.uid,
      (notificationsList) => {
        // Update notifications state with real-time data
        setNotifications(notificationsList || []);
      },
      50 // Limit to 50 most recent notifications
    );

    // Subscribe to activity logs to automatically create notifications
    const unsubscribeActivity = subscribeToActivityNotifications(user.uid);

    // Cleanup: unsubscribe when component unmounts
    return () => {
      console.log("🔌 Unsubscribing from home notifications listener");
      unsubscribeNotifications();
      unsubscribeActivity();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setMapReloadKey((prev) => prev + 1);
    }, [])
  );

  const requestUserLocation = async () => {
    try {
      setLocationLoading(true);

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Please enable location access to see issues near you.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Settings",
              onPress: () => {
                if (Platform.OS === "ios") {
                  Linking.openURL("app-settings:");
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        setLocationLoading(false);
        return;
      }

      // Get current position with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Reverse geocode to get address
      let address = "Your Location";
      try {
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geocode) {
          const parts = [];
          if (geocode.district || geocode.subregion) parts.push(geocode.district || geocode.subregion);
          if (geocode.city) parts.push(geocode.city);
          address = parts.join(", ") || "Your Location";
        }
      } catch (geocodeError) {
        console.warn("Geocoding failed:", geocodeError);
      }

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address,
      });
    } catch (error) {
      console.error("Error getting user location:", error);
      Alert.alert(
        "Location Error",
        "Unable to get your current location. Please check your device settings."
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    await requestUserLocation();
    setRefreshing(false);
  };

  // Map center and markers (use user location if available, else first report, else fallback)
  const mapDefaultCenter = { lat: 16.4023, lng: 120.596 };
  const firstGeo = feedReports.find(
    (r) => r.location && (r.location.latitude || r.location.lat)
  );
  const mapCenter = userLocation
    ? {
        lat: userLocation.latitude,
        lng: userLocation.longitude,
      }
    : firstGeo
    ? {
        lat: firstGeo.location.latitude || firstGeo.location.lat,
        lng: firstGeo.location.longitude || firstGeo.location.lng,
      }
    : mapDefaultCenter;

  const getStatusColor = (status: string) => {
    const normalizedStatus = (status || "for_approval")
      .toString()
      .toLowerCase()
      .replace(/_/g, "-");
    switch (normalizedStatus) {
      case "resolved":
        return "#51CF66"; // Green
      case "in-progress":
        return "#3498db"; // Blue
      case "approved":
        return "#00B894"; // Teal
      case "rejected":
        return "#E74C3C"; // Red
      default:
        return "#FFD93D"; // Yellow for pending/for_approval
    }
  };

  const mapMarkers = feedReports
    .filter((r) => r.location && (r.location.latitude || r.location.lat))
    .map((r) => ({
      id: r.id,
      position: {
        lat: r.location.latitude || r.location.lat,
        lng: r.location.longitude || r.location.lng,
      },
      title: r.aiGeneratedAnalysis?.title || r.originalDescription || "Report",
      status: r.status || "for_approval",
      color: getStatusColor(r.status),
    }));

  // Top reports derived by total votes (up + down), top 3 — only Approved reports
  const topReports = [...feedReports]
    .filter((r) => {
      const status = (r.status || "")
        .toString()
        .toLowerCase()
        .replace(/_/g, "-");
      return status === "approved";
    })
    .sort(
      (a, b) =>
        (b.upvotes || 0) +
        (b.downvotes || 0) -
        ((a.upvotes || 0) + (a.downvotes || 0))
    )
    .slice(0, 3);

  const mapHtml = useMemo(() => {
    const markers = JSON.stringify(mapMarkers);
    const userLoc = userLocation ? JSON.stringify(userLocation) : 'null';
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
            @keyframes pulse {
              0% {
                transform: scale(1);
                opacity: 1;
              }
              50% {
                transform: scale(1.2);
                opacity: 0.7;
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }
            .pulse-marker {
              animation: pulse 2s ease-in-out infinite;
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
              zoom: 14,
              disableDefaultUI: true
            });
            const markers = ${markers};
            const userLocation = ${userLoc};

            // Add user location marker if available
            if (userLocation) {
              const userMarker = document.createElement('div');
              userMarker.style.width = '24px';
              userMarker.style.height = '24px';
              userMarker.style.borderRadius = '50%';
              userMarker.style.backgroundColor = '#FF4444';
              userMarker.style.border = '4px solid white';
              userMarker.style.boxShadow = '0 2px 8px rgba(255, 68, 68, 0.6)';
              userMarker.style.cursor = 'pointer';
              userMarker.style.display = 'flex';
              userMarker.style.alignItems = 'center';
              userMarker.style.justifyContent = 'center';

              const innerDot = document.createElement('div');
              innerDot.style.width = '8px';
              innerDot.style.height = '8px';
              innerDot.style.borderRadius = '50%';
              innerDot.style.backgroundColor = 'white';
              userMarker.appendChild(innerDot);

              class UserOverlay extends google.maps.OverlayView {
                constructor(position, element) {
                  super();
                  this.position = position;
                  this.element = element;
                }

                onAdd() {
                  const panes = this.getPanes();
                  panes.overlayMouseTarget.appendChild(this.element);

                  this.element.addEventListener('click', () => {
                    const infoWindow = new google.maps.InfoWindow({
                      content: '<div style=\"padding: 8px; font-family: sans-serif;\"><strong>You are here</strong></div>',
                      position: this.position
                    });
                    infoWindow.open(map);
                  });
                }

                draw() {
                  const projection = this.getProjection();
                  const point = projection.fromLatLngToDivPixel(this.position);
                  if (point) {
                    this.element.style.position = 'absolute';
                    this.element.style.left = (point.x - 12) + 'px';
                    this.element.style.top = (point.y - 12) + 'px';
                  }
                }

                onRemove() {
                  if (this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                  }
                }
              }

              const userOverlay = new UserOverlay(
                new google.maps.LatLng(userLocation.latitude, userLocation.longitude),
                userMarker
              );
              userOverlay.setMap(map);
            }

            markers.forEach(marker => {
              // Create custom circle marker with pulsing animation
              const circleMarker = document.createElement('div');
              circleMarker.className = 'pulse-marker';
              circleMarker.style.width = '16px';
              circleMarker.style.height = '16px';
              circleMarker.style.borderRadius = '50%';
              circleMarker.style.backgroundColor = marker.color;
              circleMarker.style.border = '3px solid white';
              circleMarker.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
              circleMarker.style.cursor = 'pointer';

              // Create overlay
              class CircleOverlay extends google.maps.OverlayView {
                constructor(position, element) {
                  super();
                  this.position = position;
                  this.element = element;
                }

                onAdd() {
                  const panes = this.getPanes();
                  panes.overlayMouseTarget.appendChild(this.element);

                  // Add click listener
                  this.element.addEventListener('click', () => {
                    const infoWindow = new google.maps.InfoWindow({
                      content: '<div style="padding: 8px; font-family: sans-serif;"><strong>' + marker.title + '</strong></div>',
                      position: this.position
                    });
                    infoWindow.open(map);
                  });
                }

                draw() {
                  const projection = this.getProjection();
                  const point = projection.fromLatLngToDivPixel(this.position);
                  if (point) {
                    this.element.style.position = 'absolute';
                    this.element.style.left = (point.x - 8) + 'px';
                    this.element.style.top = (point.y - 8) + 'px';
                  }
                }

                onRemove() {
                  if (this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                  }
                }
              }

              const overlay = new CircleOverlay(
                new google.maps.LatLng(marker.position.lat, marker.position.lng),
                circleMarker
              );
              overlay.setMap(map);
            });
          </script>
        </body>
      </html>
    `;
  }, [mapCenter, mapMarkers, userLocation]);

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
    // Check both aiGeneratedAnalysis.category and top-level category
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
      "Waste Management & Sanitation": "#A0826D", // Soft Brown
      "Water Supply & Drainage": "#6BB6FF", // Sky Blue
      "Electricity & Street Lighting": "#E8B339", // Warm Gold
      "Public Infrastructure & Facilities": "#8B9DAF", // Soft Slate
      "Transportation & Traffic Management": "#FF7F6E", // Coral
      "Community Amenities & Environmental Concerns": "#6BCF7F", // Mint Green
      "Public Health & Safety (Non-Emergency)": "#E85D6B", // Rose
      "Animal & Veterinary Concerns": "#FF8BBF", // Soft Pink
      "Public Order & Minor Disturbances": "#FFA347", // Peach
      "Social Welfare & Accessibility": "#B090E0", // Lavender
      "Governance & Transparency Reports": "#6B9FD4", // Soft Blue
    };
    return colorMap[category] || "#8B94A1"; // Soft Gray
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
              <View style={styles.notificationIconWrapper}>
                <Ionicons
                  name={notifications.filter((n) => !n.read).length > 0 ? "notifications" : "notifications-outline"}
                  size={24}
                  color={theme.Colors.primary}
                />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {notifications.filter((n) => !n.read).length}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Your Impact Card - Redesigned */}
        <View style={[styles.section, { paddingTop: 20 }]}>
          <View style={styles.yourImpactCard}>
            <View style={styles.yourImpactContent}>
              <View style={styles.yourImpactLeft}>
                <View style={styles.yourImpactIcon}>
                  <Ionicons
                    name="document-text"
                    size={20}
                    color="white"
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={styles.issuesSubtitle}>
                  {locationLoading
                    ? "Getting your location..."
                    : userLocation?.address || "Baguio City"}
                </Text>
                {!locationLoading && (
                  <TouchableOpacity onPress={requestUserLocation}>
                    <Ionicons
                      name="locate"
                      size={14}
                      color={theme.Colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>
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
                  zoom={14}
                  options={{ disableDefaultUI: true }}
                >
                  {/* User location marker */}
                  {userLocation && (
                    <OverlayView
                      position={{
                        lat: userLocation.latitude,
                        lng: userLocation.longitude,
                      }}
                      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                    >
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          backgroundColor: "#FF4444",
                          border: "4px solid white",
                          boxShadow: "0 2px 8px rgba(255, 68, 68, 0.6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transform: "translate(-50%, -50%)",
                          position: "relative",
                        }}
                        title="You are here"
                      >
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "white",
                          }}
                        />
                      </div>
                    </OverlayView>
                  )}

                  {/* Report markers */}
                  {mapMarkers.map((m) => (
                    <OverlayView
                      key={m.id}
                      position={m.position}
                      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                    >
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          backgroundColor: m.color,
                          border: "3px solid white",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                          cursor: "pointer",
                          animation: "pulse 2s ease-in-out infinite",
                          transform: "translate(-50%, -50%)",
                        }}
                        title={m.title}
                      />
                    </OverlayView>
                  ))}
                  <style>{`
                    @keyframes pulse {
                      0% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                      }
                      50% {
                        transform: translate(-50%, -50%) scale(1.2);
                        opacity: 0.7;
                      }
                      100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                      }
                    }
                  `}</style>
                </GoogleMap>
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: 220,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 12,
                    backgroundColor: "#fff",
                  }}
                >
                  <ActivityIndicator
                    size="small"
                    color={theme.Colors.primary}
                  />
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
            {userLocation && (
              <View style={styles.legendItem}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#FF4444",
                    borderWidth: 2,
                    borderColor: "white",
                    marginRight: 6,
                  }}
                />
                <Text style={styles.legendText}>You</Text>
              </View>
            )}
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
            <MaterialIcons
              name="bar-chart"
              size={20}
              color={theme.Colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.sectionTitle}>Top Reports</Text>
            <TouchableOpacity
              style={{ marginLeft: "auto" }}
              onPress={() => router.push("/reports" as any)}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {topReports.map((report, idx) => {
            const category = getReportCategory(report);
            return (
              <View
                key={report.id}
                style={[
                  styles.reportItem,
                  { flexDirection: "column", alignItems: "flex-start" },
                ]}
              >
                <View style={{ width: "100%" }}>
                  <View style={styles.reportAuthorRow}>
                    <View style={styles.reportAuthorAvatar}>
                      <Text style={styles.reportAuthorAvatarText}>
                        {(report.authorFirstName || "A").slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportAuthor}>
                        {report.authorFirstName || "Anonymous"}
                      </Text>
                      <View style={styles.reportMetaRow}>
                        <Text style={styles.reportMeta}>
                          {report.location?.barangay || report.location?.city || "Baguio City"}
                        </Text>
                        <Text style={styles.reportMetaDivider}>•</Text>
                        <Text style={styles.reportMeta}>
                          {(() => {
                            const date = report.createdAt?.toDate?.() || new Date(report.createdAt);
                            const now = new Date();
                            const diffMs = now.getTime() - date.getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMs / 3600000);
                            const diffDays = Math.floor(diffMs / 86400000);

                            if (diffMins < 60) return `${diffMins}m ago`;
                            if (diffHours < 24) return `${diffHours}h ago`;
                            if (diffDays < 7) return `${diffDays}d ago`;
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          })()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportTitle}>
                      {report.aiGeneratedAnalysis?.title ||
                        report.originalDescription?.slice(0, 80) ||
                        "Untitled"}
                    </Text>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: getCategoryColor(category) },
                      ]}
                    >
                      <Ionicons
                        name={getCategoryIcon(category) as any}
                        size={12}
                        color="white"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.categoryBadgeText}>
                        {getCategoryDisplayName(category)}
                      </Text>
                    </View>
                </View>
                <Text style={styles.reportSummary}>
                  {report.aiGeneratedAnalysis?.summary ||
                    report.originalDescription?.slice(0, 120) + "..."}
                </Text>
                {report.images && report.images.length > 0 && (
                  <View style={styles.reportImagesContainer}>
                    {report.images.slice(0, 2).map((imageUrl: string, imgIdx: number) => (
                      <Image
                        key={imgIdx}
                        source={{ uri: imageUrl }}
                        style={[
                          styles.reportImage,
                          report.images.length === 1 && styles.reportImageSingle
                        ]}
                        resizeMode="cover"
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
            );
          })}
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
            <Ionicons
              name="trophy"
              size={20}
              color={theme.Colors.primary}
              style={{ marginRight: 8 }}
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
  notificationIconWrapper: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#E74C3C",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
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
  reportAuthorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  reportAuthorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#167048",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  reportAuthorAvatarText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 11,
  },
  reportAuthor: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2c3e50",
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
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
  reportSummary: {
    marginTop: 8,
    fontSize: 13,
    color: "#34495e",
    lineHeight: 20,
  },
  reportMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  reportMeta: {
    fontSize: 11,
    color: "#95a5a6",
  },
  reportMetaDivider: {
    fontSize: 11,
    color: "#95a5a6",
    marginHorizontal: 6,
  },
  reportImagesContainer: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  reportImage: {
    flex: 1,
    height: 180,
    borderRadius: 8,
    backgroundColor: "#ecf0f1",
  },
  reportImageSingle: {
    flex: 0,
    width: "100%",
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
