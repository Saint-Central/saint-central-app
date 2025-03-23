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
} from "react-native";
import { useRouter } from "expo-router";

interface CategoryItem {
  name: string;
  route: string;
  image: ImageSourcePropType;
}

interface HeaderProps {
  title: string;
  currentRoute?: string;
}

const Header: React.FC<HeaderProps> = ({ title, currentRoute }) => {
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
      route: "/Donations",
      image: require("../../../../assets/images/desertChurch.webp"),
    },
  ];

  const navigateToPage = (route: string) => {
    router.push(route as any); // Type assertion since we know these routes are valid
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.headerTitle}>{title}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.name}
            style={[
              styles.categoryButton,
              currentRoute === category.route && styles.activeCategoryButton,
            ]}
            onPress={() => navigateToPage(category.route)}
          >
            <Image
              source={category.image}
              style={styles.categoryImage}
              resizeMode="cover"
            />
            <View style={styles.textOverlay}>
              <Text
                style={[
                  styles.categoryButtonText,
                  currentRoute === category.route &&
                    styles.activeCategoryButtonText,
                ]}
              >
                {category.name}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.08)",
    backgroundColor: "#FFFFFF",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 12,
  },
  categoriesContainer: {
    paddingVertical: 4,
    paddingRight: 16,
  },
  categoryButton: {
    width: 150,
    height: 100,
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  activeCategoryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

export default Header;
