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
  StatusBar,
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
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    if (showFilterDropdown) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [showFilterDropdown]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <TouchableOpacity
        style={styles.headerTitleContainer}
        onPress={toggleFilterDropdown}
      >
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerFilterIndicator}>
          <Feather
            name={showFilterDropdown ? "chevron-up" : "chevron-down"}
            size={16}
            color="#1DA1F2"
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
            <Feather
              name="globe"
              size={18}
              color={currentFilter === "all" ? "#1DA1F2" : "#657786"}
            />
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
            <Feather
              name="users"
              size={18}
              color={currentFilter === "friends" ? "#1DA1F2" : "#657786"}
            />
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
            <Feather
              name="users"
              size={18}
              color={currentFilter === "groups" ? "#1DA1F2" : "#657786"}
            />
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
            <Feather
              name="user"
              size={18}
              color={currentFilter === "mine" ? "#1DA1F2" : "#657786"}
            />
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.08)",
    backgroundColor: "#FFFFFF",
    zIndex: 10,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#000000",
    marginRight: 6,
  },
  headerFilterIndicator: {
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(29, 161, 242, 0.1)",
  },
  filterDropdown: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeFilterOption: {
    backgroundColor: "rgba(29, 161, 242, 0.1)",
  },
  filterOptionText: {
    color: "#657786",
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 12,
  },
  activeFilterOptionText: {
    color: "#1DA1F2",
    fontWeight: "600",
  },
});

export default Header;
