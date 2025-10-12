// app/home.tsx
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BottomNav from "../components/BottomNav";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [userStats, setUserStats] = useState({
    totalReports: 2,
    pendingReports: 1,
    inProgressReports: 0,
    resolvedReports: 1,
  });
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Mock data for now - will replace with real Firebase data
      setRecentReports([
        {
          id: 1,
          title: "Pothole on Main Street",
          status: "pending",
          location: "Bakekeng, Baguio City",
          date: "2 hours ago",
        },
        {
          id: 2,
          title: "Broken Streetlight",
          status: "resolved",
          location: "Bakekeng, Baguio City",
          date: "3 days ago",
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReport = (category: string) => {
    // Navigate to submit report screen with preset category
    navigation.navigate("SubmitReport", { presetCategory: category });
  };

  const handleReportPress = (reportId: number) => {
    // Navigate to report details
    navigation.navigate("ReportDetail", { reportId });
  };

  const handleSeeAllMap = () => {
    // Navigate to full map view
    Alert.alert("Coming Soon", "Full map view will be available soon!");
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good Morning, Papi Kurt!</Text>

          {/* Your Impact */}
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
        </View>

        {/* Quick Report Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Report</Text>
          <View style={styles.categoryGrid}>
            {["Road", "Nature", "Veterinary", "Disturbance", "Others"].map(
              (category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.categoryButton}
                  onPress={() => handleQuickReport(category)}
                >
                  <Text style={styles.categoryText}>{category}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        {/* Tip of the Day & Rewards Row */}
        <View style={styles.row}>
          {/* Tip Card */}
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Tip of the Day</Text>
            <Text style={styles.tipText}>
              Report broken streetlights to help keep roads safe at night.
            </Text>
            <TouchableOpacity>
              <Text style={styles.learnMore}>Learn More →</Text>
            </TouchableOpacity>
          </View>

          {/* Rewards Card */}
          <View style={styles.rewardsCard}>
            <Text style={styles.rewardsTitle}>Rewards</Text>
            <Text style={styles.rewardsText}>
              Earn points for active reporting
            </Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>50 pts</Text>
            </View>
          </View>
        </View>

        {/* Issues Near You */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Issues Near You</Text>
            <TouchableOpacity onPress={handleSeeAllMap}>
              <Text style={styles.seeAll}>Full Map →</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.location}>Bakekeng, Baguio City</Text>

          {/* Recent Reports List */}
          {recentReports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={styles.reportItem}
              onPress={() => handleReportPress(report.id)}
            >
              <View style={styles.reportInfo}>
                <Text style={styles.reportTitle}>{report.title}</Text>
                <Text style={styles.reportLocation}>{report.location}</Text>
                <Text style={styles.reportDate}>{report.date}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  report.status === "resolved"
                    ? styles.resolvedBadge
                    : report.status === "in-progress"
                    ? styles.inProgressBadge
                    : styles.pendingBadge,
                ]}
              >
                <Text style={styles.statusText}>
                  {report.status.charAt(0).toUpperCase() +
                    report.status.slice(1)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>You</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>
                {userStats.pendingReports}
              </Text>
              <Text style={styles.statusLabel}>Pending</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>
                {userStats.inProgressReports}
              </Text>
              <Text style={styles.statusLabel}>In-Progress</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>
                {userStats.resolvedReports}
              </Text>
              <Text style={styles.statusLabel}>Resolved</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: "#2c3e50",
    padding: 20,
    paddingTop: 50,
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
  reportTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4,
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
  statusGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
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
