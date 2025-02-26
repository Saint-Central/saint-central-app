import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { BlurView } from "expo-blur";

import { HapticTab } from "@/components/HapticTab";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

// Custom TabBar background component matching the Saint Central theme
const CustomTabBarBackground = () => {
  return Platform.OS === "ios" ? (
    <BlurView
      tint="dark"
      intensity={30}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 85,
        borderTopWidth: 1,
        borderTopColor: "rgba(253, 224, 71, 0.2)",
      }}
    />
  ) : (
    <BlurView
      tint="dark"
      intensity={0}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 85,
        backgroundColor: "#1F1F1F",
        borderTopWidth: 1,
        borderTopColor: "rgba(253, 224, 71, 0.2)",
      }}
    />
  );
};

// Custom themed icon component
const TabIcon = ({ name, color }: { name: string; color: string }) => {
  switch (name) {
    case "home":
      return <MaterialCommunityIcons name="home" size={24} color={color} />;
    case "discover":
      return <MaterialCommunityIcons name="compass" size={24} color={color} />;
    case "community":
      return (
        <MaterialCommunityIcons name="account-group" size={24} color={color} />
      );
    default:
      return null;
  }
};

export default function TabLayout() {
  // Saint Central theme colors
  const themeColors = {
    light: {
      tint: "#FDE047", // Yellow accent color
      tabBackground: "#1F1F1F",
      inactive: "rgba(255, 255, 255, 0.6)",
    },
    dark: {
      tint: "#FDE047", // Yellow accent color
      tabBackground: "#1F1F1F",
      inactive: "rgba(255, 255, 255, 0.6)",
    },
  };

  // Get color scheme from the system or force dark mode
  const colorScheme = "dark"; // Force dark theme to match Saint Central design

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColors[colorScheme].tint,
        tabBarInactiveTintColor: themeColors[colorScheme].inactive,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: CustomTabBarBackground,
        tabBarStyle: {
          position: "absolute",
          height: 85,
          paddingBottom: Platform.OS === "ios" ? 30 : 15,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => <TabIcon name="discover" color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color }) => <TabIcon name="community" color={color} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Lent2025"
        options={{
          // This hides the tab bar button for the lent2025 screen.
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="faith/index"
        options={{
          // This hides the tab bar button for the lent2025 screen.
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="faith/[id]"
        options={{
          // This hides the tab bar button for the lent2025 screen.
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="womens-ministry/[id]"
        options={{
          // This hides the tab bar button for the lent2025 screen.
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="womens-ministry/index"
        options={{
          // This hides the tab bar button for the lent2025 screen.
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="culture-and-testimonies/index"
        options={{
          // This hides the tab bar button for the lent2025 screen.
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="culture-and-testimonies/[id]"
        options={{
          // This hides the tab bar button for the lent2025 screen.
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="news/index"
        options={{
          // This hides the tab bar button for the lent2025 screen.
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}
