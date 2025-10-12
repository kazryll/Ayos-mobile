// components/BottomNav.tsx
import { useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const BottomNav = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();

  const navItems = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "leaderboards", label: "Leaderboards", icon: "🏆" },
    { key: "activity", label: "Activity", icon: "📊" },
    { key: "profile", label: "Profile", icon: "👤" },
  ];

  const handleNavigation = (screenName: string) => {
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
          style={[styles.navItem, isActive(item.key) && styles.activeNavItem]}
          onPress={() => handleNavigation(item.key)}
        >
          <Text
            style={[styles.navIcon, isActive(item.key) && styles.activeNavIcon]}
          >
            {item.icon}
          </Text>
          <Text
            style={[
              styles.navLabel,
              isActive(item.key) && styles.activeNavLabel,
            ]}
          >
            {item.label}
          </Text>
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
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  activeNavIcon: {
    color: "#3498db",
  },
  navLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    fontWeight: "500",
  },
  activeNavLabel: {
    color: "#3498db",
    fontWeight: "bold",
  },
});

export default BottomNav;
