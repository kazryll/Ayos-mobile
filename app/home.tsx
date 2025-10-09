import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const HomeScreen = () => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Morning, Papi Kurt!</Text>
        <TouchableOpacity style={styles.notificationIcon}>
          {/* Notification bell icon here */}
        </TouchableOpacity>
      </View>

      {/* Impact Card */}
      <View style={styles.impactCard}>
        <Text style={styles.impactTitle}>Your Impact</Text>
        <View style={styles.impactRow}>
          <Text style={styles.impactText}>2 Reports Submitted</Text>
          <Text style={styles.pendingText}>+1 Pending</Text>
        </View>
      </View>

      {/* Quick Report Icons */}
      <View style={styles.quickReportContainer}>
        {['Road', 'Nature', 'Veterinary', 'Disturbance', 'Others'].map((label) => (
          <TouchableOpacity key={label} style={styles.quickReportButton}>
            {/* Replace with icon */}
            <View style={styles.iconPlaceholder} />
            <Text style={styles.quickReportText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tip of the Day + Rewards */}
      <View style={styles.infoCardRow}>
        <View style={[styles.infoCard, { backgroundColor: '#E5F5E0' }]}>
          <Text style={styles.tipTitle}>Tip of the Day</Text>
          <Text style={styles.tipText}>
            Report broken streetlights to help keep roads safe at night.
          </Text>
          <TouchableOpacity>
            <Text style={styles.tipButton}>Learn More →</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.infoCard, { backgroundColor: '#0F3559' }]}>
          <Text style={[styles.tipTitle, { color: 'white' }]}>Rewards</Text>
          {/* Logos of reward partners */}
        </View>
      </View>

      {/* Issues Near You */}
      <View style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>Issues Near You</Text>
          <TouchableOpacity>
            <Text style={styles.fullMapBtn}>Full Map</Text>
          </TouchableOpacity>
        </View>
        <Image
          source={{ uri: 'https://via.placeholder.com/300x150' }} // Temporary map placeholder
          style={styles.mapImage}
        />
        <View style={styles.legendRow}>
          <Text>🟡 Pending</Text>
          <Text>🟢 Resolved</Text>
          <Text>🔵 In-Progress</Text>
        </View>
      </View>

      {/* Bottom spacing to avoid cutting off last card */}
      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#1C8A43', // gradient alternative: use LinearGradient later
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  notificationIcon: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  impactCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -30,
    padding: 20,
    borderRadius: 15,
    elevation: 3,
  },
  impactTitle: {
    color: '#777',
    fontSize: 14,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  impactText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pendingText: {
    color: '#1C8A43',
    fontWeight: '500',
  },
  quickReportContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 25,
    paddingHorizontal: 10,
  },
  quickReportButton: {
    alignItems: 'center',
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8E8E8',
    marginBottom: 5,
  },
  quickReportText: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 25,
  },
  infoCard: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipText: {
    fontSize: 12,
    marginTop: 5,
  },
  tipButton: {
    fontSize: 12,
    marginTop: 10,
    color: '#1C8A43',
    fontWeight: '600',
  },
  mapCard: {
    marginTop: 25,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    elevation: 3,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mapTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  fullMapBtn: {
    color: '#1C8A43',
    fontWeight: '600',
  },
  mapImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
