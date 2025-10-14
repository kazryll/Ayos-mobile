import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import ImageIcon from './ImageIcon';

const BottomNav = () => {
  console.log("🔵 BOTTOMNAV WITH NAVIGATION");
  const navigation = useNavigation<any>();
  const route = useRoute();
  
  // UPDATE ICON NAMES TO MATCH YOUR PNG FILES
  const navItems = [
    { key: "home", label: "Home", icon: "home" },           // ← matches home.png
    { key: "leaderboards", label: "Leaderboards", icon: "trophy" }, // ← matches trophy.png
    { key: "report", label: "", icon: "warning", isCTA: true },     // ← matches warning.png
    { key: "activity", label: "Activity", icon: "chart-bar" },      // ← matches chart-bar.png
    { key: "profile", label: "Profile", icon: "user" },             // ← matches user.png
  ];

  const handleNavigation = (screenName: string) => {
    if (screenName === "report") {
      alert("Report feature coming soon! 🚧");
      return;
    }
    navigation.navigate(screenName);
  };

  const isActive = (screenName: string) => {
    return route.name === screenName;
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
          {/* USE ImageIcon HERE */}
          <ImageIcon
            name={item.icon as any}
            size={item.isCTA ? 26 : 22}
          />
          {!item.isCTA && (
            <Text style={styles.navLabel}>{item.label}</Text>
          )}
        </TouchableOpacity>
      ))}
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
});

export default BottomNav;