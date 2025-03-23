import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  ImageSourcePropType,
  Animated,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

interface CategoryItem {
  name: string;
  route: string;
  image: ImageSourcePropType;
}

interface HeaderProps {
  title: string;
  currentRoute?: string;
  scrollY?: Animated.Value;
}

const Header: React.FC<HeaderProps> = ({
  title,
  currentRoute,
  scrollY = new Animated.Value(0),
}) => {
  const router = useRouter();

  // Replace these image sources with your actual image assets
  const categories: CategoryItem[] = [
    {
      name: "Lent 2025",
      route: "/Lent2025",
      image: require("../../../../assets/images/mountainChurch.webp"),
    },
    {
      name: "Rosary",
      route: "/Rosary",
      image: require("../../../../assets/images/hands.webp"),
    },
    {
      name: "Events",
      route: "/events",
      image: require("../../../../assets/images/seasideChurch.webp"),
    },
    {
      name: "Bible",
      route: "/bible",
      image: require("../../../../assets/images/boatWithCross.webp"),
    },
    {
      name: "Donations",
      route: "/donate",
      image: require("../../../../assets/images/desertChurch.webp"),
    },
  ];

  const navigateToPage = (route: string) => {
    router.push(route as any); // Type assertion since we know these routes are valid
  };

  // Animation values for header collapse/expand
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [200, 140], // Adjusted to leave room for smaller buttons
    extrapolate: "clamp",
  });

  const headerTitleSize = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [24, 20],
    extrapolate: "clamp",
  });

  // Scale down category buttons instead of fading them out
  const categoryButtonHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [100, 60],
    extrapolate: "clamp",
  });

  const categoryButtonWidth = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [150, 90],
    extrapolate: "clamp",
  });

  const categoryFontSize = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [14, 12],
    extrapolate: "clamp",
  });

  return (
    <Animated.View style={[styles.container, { height: headerHeight }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerTopRow}>
        <Animated.Text
          style={[styles.headerTitle, { fontSize: headerTitleSize }]}
        >
          {title}
        </Animated.Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="search" size={20} color="#1DA1F2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationButton}>
            <Feather name="bell" size={20} color="#1DA1F2" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map((category) => (
          <Animated.View
            key={category.name}
            style={{
              width: categoryButtonWidth,
              height: categoryButtonHeight,
              marginRight: 12,
            }}
          >
            <TouchableOpacity
              style={[
                styles.categoryButton,
                currentRoute === category.route && styles.activeCategoryButton,
                { width: "100%", height: "100%" },
              ]}
              onPress={() => navigateToPage(category.route)}
            >
              <Image
                source={category.image}
                style={styles.categoryImage}
                resizeMode="cover"
              />
              {Platform.OS === "ios" ? (
                <BlurView intensity={60} style={styles.textOverlay} tint="dark">
                  <Animated.Text
                    style={[
                      styles.categoryButtonText,
                      currentRoute === category.route &&
                        styles.activeCategoryButtonText,
                      { fontSize: categoryFontSize },
                    ]}
                  >
                    {category.name}
                  </Animated.Text>
                </BlurView>
              ) : (
                <View style={styles.textOverlay}>
                  <Animated.Text
                    style={[
                      styles.categoryButtonText,
                      currentRoute === category.route &&
                        styles.activeCategoryButtonText,
                      { fontSize: categoryFontSize },
                    ]}
                  >
                    {category.name}
                  </Animated.Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 0,
    backgroundColor: "#FFFFFF",
    zIndex: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontWeight: "700",
    color: "#1A202C",
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(29, 161, 242, 0.1)",
    marginRight: 8,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(29, 161, 242, 0.1)",
  },
  categoriesContainer: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  categoryButton: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  activeCategoryButton: {
    borderWidth: 2,
    borderColor: "#1DA1F2",
  },
  categoryImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  textOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  categoryButtonText: {
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  activeCategoryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

export default Header;
