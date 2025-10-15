// components/BottomNav.tsx - Fix the ImageIcon usage
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { auth } from "../config/firebase";
import { signOut } from "../services/auth";
import ImageIcon from './ImageIcon';
import IssueReportingWizard from './IssueReportingWizard';

const BottomNav = () => {
  console.log("🔵 BOTTOMNAV WITH NAVIGATION");
  const navigation = useNavigation<any>();
  const route = useRoute();
  const [showReportingWizard, setShowReportingWizard] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const navItems = [
    { key: "home", label: "Home", icon: "home" },
    { key: "leaderboards", label: "Leaderboards", icon: "trophy" },
    { key: "report", label: "", icon: "warning", isCTA: true },
    { key: "activity", label: "Activity", icon: "chart-bar" },
    { key: "profile", label: "Profile", icon: "user", isProfile: true },
  ];

  const handleNavigation = (screenName: string) => {
    if (screenName === "report") {
      // This is the CTA button - open reporting wizard
      console.log("🚨 CTA BUTTON PRESSED - OPENING REPORTING WIZARD");
      setShowReportingWizard(true);
      return;
    }

    if (screenName === "profile") {
      // Show profile menu instead of navigating
      setShowProfileMenu(true);
      return;
    }

    navigation.navigate(screenName);
  };

  const handleLogout = async () => {
    try {
      setShowProfileMenu(false);
      await signOut();
      // Navigation will be handled by auth state change
    } catch (error) {
      Alert.alert("Error", "Failed to sign out");
    }
  };

  const handleProfile = () => {
    setShowProfileMenu(false);
    navigation.navigate("profile");
  };

  const handleSettings = () => {
    setShowProfileMenu(false);
    Alert.alert("Coming Soon", "Settings feature coming soon!");
  };

  const isActive = (screenName: string) => {
    return route.name === screenName;
  };

  const handleCloseWizard = () => {
    console.log("🔴 CLOSING REPORTING WIZARD");
    setShowReportingWizard(false);
  };

  const handleCloseProfileMenu = () => {
    setShowProfileMenu(false);
  };

  return (
    <View style={styles.container}>
      {navItems.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[
            styles.navItem,
            isActive(item.key) && styles.activeNavItem,
            item.isCTA && styles.ctaButton,
          ]}
          onPress={() => handleNavigation(item.key)}
        >
          <ImageIcon
            name={item.icon as any}
            size={item.isCTA ? 26 : 22}
            // REMOVED the color prop since ImageIcon doesn't support it
          />
          {!item.isCTA && (
            <Text style={[
              styles.navLabel,
              isActive(item.key) && styles.activeNavLabel
            ]}>
              {item.label}
            </Text>
          )}
        </TouchableOpacity>
      ))}

      {/* Reporting Wizard Modal - Controlled by BottomNav */}
      <Modal
        visible={showReportingWizard}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseWizard}
      >
        <IssueReportingWizard onClose={handleCloseWizard} />
      </Modal>

      {/* Profile Menu Modal */}
      <Modal
        visible={showProfileMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseProfileMenu}
      >
        <View style={styles.profileMenuOverlay}>
          <View style={styles.profileMenu}>
            <Text style={styles.profileMenuTitle}>Account</Text>
            
            <TouchableOpacity style={styles.profileMenuItem} onPress={handleProfile}>
              <Text style={styles.profileMenuText}>Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.profileMenuItem} onPress={handleSettings}>
              <Text style={styles.profileMenuText}>Settings</Text>
            </TouchableOpacity>
            
            <View style={styles.profileMenuDivider} />
            
            <TouchableOpacity style={styles.profileMenuItem} onPress={handleLogout}>
              <Text style={styles.profileMenuLogout}>Logout</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.profileMenuCancel} 
              onPress={handleCloseProfileMenu}
            >
              <Text style={styles.profileMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
    paddingVertical: 8,
    paddingHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeNavItem: {
    backgroundColor: "#e8f4fd",
  },
  ctaButton: {
    backgroundColor: "#22c55e",
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: "white",
  },
  navLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    fontWeight: "500",
    marginTop: 4,
  },
  activeNavLabel: {
    color: "#3498db",
    fontWeight: "600",
  },
  // Profile Menu Styles
  profileMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  profileMenu: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  profileMenuTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 20,
    textAlign: "center",
  },
  profileMenuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  profileMenuText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  profileMenuLogout: {
    fontSize: 16,
    color: "#e74c3c",
    fontWeight: "bold",
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: "#ecf0f1",
    marginVertical: 10,
  },
  profileMenuCancel: {
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  profileMenuCancelText: {
    fontSize: 16,
    color: "#3498db",
    fontWeight: "bold",
  },
});

export default BottomNav;