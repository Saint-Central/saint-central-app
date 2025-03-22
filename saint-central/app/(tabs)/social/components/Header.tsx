import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Feather } from "@expo/vector-icons";

// Enable LayoutAnimation for Android
if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface HeaderProps {
  title: string;
  showFilterDropdown: boolean;
  toggleFilterDropdown: () => void;
  currentFilter: "all" | "mine" | "friends" | "groups";
  onFilterChange: (filter: "all" | "mine" | "friends" | "groups") => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showFilterDropdown,
  toggleFilterDropdown,
  currentFilter,
  onFilterChange,
}) => {
  // Animation for dropdown
  const filterDropdownAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(filterDropdownAnim, {
      toValue: showFilterDropdown ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    if (showFilterDropdown) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [showFilterDropdown]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.headerTitleContainer}
        onPress={toggleFilterDropdown}
      >
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerFilterIndicator}>
          <Feather
            name={showFilterDropdown ? "chevron-up" : "chevron-down"}
            size={18}
            color="#FAC898"
          />
        </View>
      </TouchableOpacity>

      {/* Animated Filter Dropdown */}
      {showFilterDropdown && (
        <Animated.View
          style={[
            styles.filterDropdown,
            {
              opacity: filterDropdownAnim,
              transform: [
                {
                  translateY: filterDropdownAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.filterOption,
              currentFilter === "all" && styles.activeFilterOption,
            ]}
            onPress={() => {
              onFilterChange("all");
              toggleFilterDropdown();
            }}
          >
            <Text
              style={[
                styles.filterOptionText,
                currentFilter === "all" && styles.activeFilterOptionText,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterOption,
              currentFilter === "friends" && styles.activeFilterOption,
            ]}
            onPress={() => {
              onFilterChange("friends");
              toggleFilterDropdown();
            }}
          >
            <Text
              style={[
                styles.filterOptionText,
                currentFilter === "friends" && styles.activeFilterOptionText,
              ]}
            >
              Friends
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterOption,
              currentFilter === "groups" && styles.activeFilterOption,
            ]}
            onPress={() => {
              onFilterChange("groups");
              toggleFilterDropdown();
            }}
          >
            <Text
              style={[
                styles.filterOptionText,
                currentFilter === "groups" && styles.activeFilterOptionText,
              ]}
            >
              Groups
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterOption,
              currentFilter === "mine" && styles.activeFilterOption,
            ]}
            onPress={() => {
              onFilterChange("mine");
              toggleFilterDropdown();
            }}
          >
            <Text
              style={[
                styles.filterOptionText,
                currentFilter === "mine" && styles.activeFilterOptionText,
              ]}
            >
              My Posts
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(250, 200, 152, 0.1)",
    zIndex: 10,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "300",
    color: "#FFFFFF",
    letterSpacing: 1,
    marginRight: 10,
  },
  headerFilterIndicator: {
    alignItems: "center",
    justifyContent: "center",
  },
  filterDropdown: {
    position: "absolute",
    left: 15,
    right: 15,
    top: 70,
    backgroundColor: "rgba(41, 37, 36, 0.95)",
    borderRadius: 10,
    padding: 5,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  activeFilterOption: {
    backgroundColor: "rgba(250, 200, 152, 0.2)",
  },
  filterOptionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  activeFilterOptionText: {
    color: "#FAC898",
    fontWeight: "600",
  },
});

export default Header;
