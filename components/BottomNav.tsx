// components/BottomNav.tsx - Fix the ImageIcon usage
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import theme from "../config/theme";
import { signOut } from "../services/auth";
import ImageIcon from "./ImageIcon";
import IssueReportingWizard from "./IssueReportingWizard";

const BottomNav = () => {
  console.log("🔵 BOTTOMNAV WITH NAVIGATION");
  const navigation = useNavigation<any>();
  const route = useRoute();
  const [showReportingWizard, setShowReportingWizard] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      console.log("🔓 [LOGOUT] User initiating logout...");
      setShowLogoutConfirm(true);
    } catch (error) {
      console.error("❌ [LOGOUT] Unexpected error:", error);
    }
  };

  const confirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      console.log("⏳ [LOGOUT] Signing out from Firebase...");
      const result = await signOut();
      if (result.error) {
        console.error("❌ [LOGOUT] Logout error:", result.error);
        setIsLoggingOut(false);
        setShowLogoutConfirm(false);
        setShowProfileMenu(false);
        // Error will be shown via auth state change or manual alert
      } else {
        console.log("✅ [LOGOUT] Logout successful, waiting for redirect...");
        // Navigation will be handled by auth state change in _layout.tsx
        setShowLogoutConfirm(false);
        setShowProfileMenu(false);
      }
    } catch (error) {
      console.error("❌ [LOGOUT] Unexpected logout error:", error);
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
      setShowProfileMenu(false);
    }
  };

  const cancelLogout = () => {
    console.log("❌ [LOGOUT] Logout cancelled");
    setShowLogoutConfirm(false);
  };

  const handleProfile = () => {
    setShowProfileMenu(false);
    navigation.navigate("profile");
  };

  const handleSettings = () => {
    setShowProfileMenu(false);
    // Just log for now, settings can be implemented later
    console.log("⚙️ Settings clicked (Coming Soon)");
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
            color={
              item.isCTA
                ? theme.Colors.background
                : (isActive(item.key) && theme.Colors.primary) ||
                  theme.Colors.muted
            }
          />
          {!item.isCTA && (
            <Text
              style={[
                styles.navLabel,
                isActive(item.key) && styles.activeNavLabel,
              ]}
            >
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

            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={handleProfile}
            >
              <Text style={styles.profileMenuText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={handleSettings}
            >
              <Text style={styles.profileMenuText}>Settings</Text>
            </TouchableOpacity>

            <View style={styles.profileMenuDivider} />

            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={handleLogout}
            >
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

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={styles.logoutConfirmOverlay}>
          <View style={styles.logoutConfirmDialog}>
            <Text style={styles.logoutConfirmTitle}>Logout</Text>
            <Text style={styles.logoutConfirmMessage}>
              Are you sure you want to logout?
            </Text>

            <View style={styles.logoutConfirmButtons}>
              <TouchableOpacity
                style={[styles.logoutConfirmButton, styles.cancelButton]}
                onPress={cancelLogout}
                disabled={isLoggingOut}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.logoutConfirmButton, styles.logoutButton]}
                onPress={confirmLogout}
                disabled={isLoggingOut}
              >
                <Text style={styles.logoutButtonText}>
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: theme.Colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.Colors.divider,
    paddingVertical: 10,
    paddingHorizontal: 8,
    // subtle top shadow to lift navbar
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.12,
    shadowRadius: 6,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeNavItem: {
    backgroundColor: "#eef8f5",
  },
  ctaButton: {
    backgroundColor: theme.Colors.primary,
    borderRadius: theme.Radii.round,
    width: 68,
    height: 68,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -34,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 4,
    borderColor: theme.Colors.background,
  },
  navLabel: {
    fontSize: theme.Typography.label,
    color: theme.Colors.muted,
    fontWeight: "500",
    marginTop: 4,
  },
  activeNavLabel: {
    color: theme.Colors.primary,
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
  // Logout Confirmation Modal Styles
  logoutConfirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutConfirmDialog: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    alignItems: "center",
  },
  logoutConfirmTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 12,
  },
  logoutConfirmMessage: {
    fontSize: 16,
    color: "#7f8c8d",
    marginBottom: 24,
    textAlign: "center",
  },
  logoutConfirmButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  logoutConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#ecf0f1",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  logoutButton: {
    backgroundColor: "#e74c3c",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});

export default BottomNav;
