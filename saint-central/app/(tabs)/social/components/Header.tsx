import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Platform,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

interface HeaderProps {
  title: string;
  scrollY?: Animated.Value;
  showMenuIcon?: boolean;
  onMenuPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  scrollY = new Animated.Value(0),
  showMenuIcon = false,
  onMenuPress,
}) => {
  const router = useRouter();

  // Animation values for header collapse/expand
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [140, 80],
    extrapolate: "clamp",
  });

  const headerTitleSize = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [28, 20],
    extrapolate: "clamp",
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60, 120],
    outputRange: [1, 0.8, 1],
    extrapolate: "clamp",
  });

  // Modified to make tabs completely disappear on scroll
  const tabContainerHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [50, 0],
    extrapolate: "clamp",
  });

  // Complete fade out of tabs
  const tabContainerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View
        style={[
          styles.container,
          {
            height: headerHeight,
            opacity: headerOpacity,
          },
        ]}
      >
        <StatusBar barStyle="dark-content" />

        <View style={styles.headerMain}>
          {showMenuIcon && (
            <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
              <Feather name="menu" size={24} color="#1DA1F2" />
            </TouchableOpacity>
          )}
          <Animated.Text
            style={[styles.headerTitle, { fontSize: headerTitleSize }]}
          >
            {title}
          </Animated.Text>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton}>
              <Feather name="search" size={20} color="#4A5568" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Feather name="bell" size={20} color="#4A5568" />
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View
          style={[
            styles.tabContainer,
            {
              height: tabContainerHeight,
              opacity: tabContainerOpacity,
              // Hide overflow to prevent tabs from being partially visible
              overflow: "hidden",
            },
          ]}
        >
          <TouchableOpacity style={[styles.tab, styles.activeTab]}>
            <Text style={[styles.tabText, styles.activeTabText]}>For You</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabText}>Following</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabText}>Popular</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabText}>Latest</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#FFFFFF",
    zIndex: 10,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 30 : 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
    zIndex: 10,
  },
  headerMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 8,
  },
  headerTitle: {
    fontWeight: "800",
    color: "#2D3748",
    letterSpacing: -0.8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7FAFC",
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: "row",
    paddingTop: 10,
    paddingBottom: 2,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: "#EBF8FF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#718096",
  },
  activeTabText: {
    color: "#3182CE",
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Header;
