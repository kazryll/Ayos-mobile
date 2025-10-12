import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../config/firebase';
import { getUserStats, getUserProfile } from '../services/userService';
import { getNearbyReports } from '../services/reports';
import { signOut } from '../services/auth';
import BottomNav from '../components/BottomNav';

export default function HomeScreen() {
  const router = useRouter();
  const [userStats, setUserStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    inProgressReports: 0,
    resolvedReports: 0
  });
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/signin');
        return;
      }

      console.log('Loading data for user:', user.uid);
      
      // Load all data safely
      const stats = await getUserStats(user.uid);
      setUserStats(stats);

      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } catch (e) {
        console.log('No user profile found');
      }

      try {
        const nearby = await getNearbyReports();
        setRecentReports(nearby || []);
      } catch (e) {
        console.log('No reports found');
        setRecentReports([]);
      }
      
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReport = (category: string) => {
    Alert.alert('Coming Soon', `Submit ${category} report feature coming soon!`);
  };

  const handleReportPress = (reportId: string) => {
    Alert.alert('Report Details', `Viewing report ${reportId}`);
  };

  const handleSeeAllMap = () => {
    Alert.alert('Coming Soon', 'Full map view will be available soon!');
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  // SAFE data access - won't crash if data is missing
  const getDisplayName = () => {
    if (userProfile && userProfile.displayName) return userProfile.displayName;
    if (auth.currentUser && auth.currentUser.email) return auth.currentUser.email.split('@')[0];
    return 'User';
  };

  const getReportTitle = (report: any) => {
    return report && report.title ? report.title : 'Untitled Report';
  };

  const getReportLocation = (report: any) => {
    return report && report.location && report.location.address 
      ? report.location.address 
      : 'Unknown location';
  };

  const getReportDate = (report: any) => {
    if (report && report.createdAt && report.createdAt.toDate) {
      return report.createdAt.toDate().toLocaleDateString();
    }
    return 'Recently';
  };

  const getReportStatus = (report: any) => {
    const status = report && report.status ? report.status : 'pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusBadgeStyle = (report: any) => {
    const status = report && report.status ? report.status : 'pending';
    switch (status) {
      case 'resolved': return styles.resolvedBadge;
      case 'in-progress': return styles.inProgressBadge;
      default: return styles.pendingBadge;
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good Morning, {getDisplayName()}!</Text>
          
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

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
            {['Road', 'Nature', 'Veterinary', 'Disturbance', 'Others'].map((category) => (
              <TouchableOpacity 
                key={category} 
                style={styles.categoryButton}
                onPress={() => handleQuickReport(category)}
              >
                <Text style={styles.categoryText}>{category}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tip & Rewards */}
        <View style={styles.row}>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Tip of the Day</Text>
            <Text style={styles.tipText}>Report broken streetlights to help keep roads safe at night.</Text>
            <TouchableOpacity>
              <Text style={styles.learnMore}>Learn More →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rewardsCard}>
            <Text style={styles.rewardsTitle}>Rewards</Text>
            <Text style={styles.rewardsText}>Earn points for active reporting</Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>{userStats.totalReports * 10} pts</Text>
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
          
          {recentReports.length > 0 ? (
            recentReports.map((report) => (
              <TouchableOpacity 
                key={report.id} 
                style={styles.reportItem}
                onPress={() => handleReportPress(report.id)}
              >
                <View style={styles.reportInfo}>
                  <Text style={styles.reportTitle}>{getReportTitle(report)}</Text>
                  <Text style={styles.reportLocation}>{getReportLocation(report)}</Text>
                  <Text style={styles.reportDate}>{getReportDate(report)}</Text>
                </View>
                <View style={[styles.statusBadge, getStatusBadgeStyle(report)]}>
                  <Text style={styles.statusText}>{getReportStatus(report)}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noReportsContainer}>
              <Text style={styles.noReports}>No reports in your area yet</Text>
              <Text style={styles.noReportsSub}>Be the first to report an issue!</Text>
            </View>
          )}
        </View>

        {/* Status Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>You</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>{userStats.pendingReports}</Text>
              <Text style={styles.statusLabel}>Pending</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>{userStats.inProgressReports}</Text>
              <Text style={styles.statusLabel}>In-Progress</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusNumber}>{userStats.resolvedReports}</Text>
              <Text style={styles.statusLabel}>Resolved</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    color: '#7f8c8d',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 20,
    paddingTop: 50,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  logoutButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  logoutText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 10,
    flex: 0.48,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  statSubLabel: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: 'bold',
  },
  section: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAll: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryButton: {
    backgroundColor: '#ecf0f1',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '18%',
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    marginTop: 10,
  },
  tipCard: {
    flex: 0.6,
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  tipText: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 10,
    lineHeight: 20,
  },
  learnMore: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  rewardsCard: {
    flex: 0.4,
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'space-between',
  },
  rewardsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  rewardsText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 10,
  },
  pointsBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  pointsText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  location: {
    color: '#7f8c8d',
    marginBottom: 15,
    fontSize: 14,
  },
  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  reportLocation: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  reportDate: {
    fontSize: 10,
    color: '#bdc3c7',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  pendingBadge: {
    backgroundColor: '#fff3cd',
  },
  inProgressBadge: {
    backgroundColor: '#cce7ff',
  },
  resolvedBadge: {
    backgroundColor: '#d4edda',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  noReportsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noReports: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  noReportsSub: {
    fontSize: 14,
    color: '#bdc3c7',
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
  },
});