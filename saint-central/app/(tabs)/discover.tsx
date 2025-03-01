import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ImageBackground,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// Use the same background image as home
const backgroundImageRequire = require("../../assets/images/discover-image.jpg");

export default function DiscoverScreen() {
  type FeatherIconName = "heart" | "users" | "book-open" | "globe";
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  const categories: {
    id: number;
    title: string;
    icon: FeatherIconName;
    description: string;
  }[] = [
    {
      id: 1,
      title: "Faith",
      icon: "heart",
      description: "Explore resources to grow in your spiritual journey",
    },
    {
      id: 2,
      title: "Womens Ministry",
      icon: "users",
      description: "Connect with our community of women supporting each other",
    },
    {
      id: 3,
      title: "Culture and Testimonies",
      icon: "book-open",
      description: "Read inspiring stories and cultural perspectives",
    },
    {
      id: 4,
      title: "News",
      icon: "globe",
      description: "Stay updated with the latest events and announcements",
    },
  ];

  return (
    <ImageBackground
      source={backgroundImageRequire}
      style={styles.backgroundImage}
    >
      <Animated.View
        style={[
          styles.backgroundOverlay,
          {
            opacity: scrollY.interpolate({
              inputRange: [0, 200],
              outputRange: [0.35, 0.6],
              extrapolate: "clamp",
            }),
          },
        ]}
      />
      <SafeAreaView style={styles.container}>
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Discover</Text>
            <Text style={styles.headerSubtitle}>
              Explore resources and connect with our community
            </Text>
          </View>

          {/* Upcoming Events Banner */}
          <View style={styles.eventsBanner}>
            <View>
              <Text style={styles.eventsTitle}>Upcoming Events</Text>
              <Text style={styles.eventsSubtitle}>
                Check out what's happening
              </Text>
            </View>
            <TouchableOpacity style={styles.eventsButton}>
              <Text style={styles.buttonText}>View All</Text>
              <Feather name="arrow-right" size={14} color="#513C28" />
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View style={styles.cardsContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.card}
                onPress={() =>
                  router.push(
                    `/${category.title
                      .replace(/\s+/g, "-")
                      .toLowerCase()}` as any
                  )
                }
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <Feather name={category.icon} size={24} color="#E9967A" />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{category.title}</Text>
                    <Text style={styles.cardDescription}>
                      {category.description}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.exploreText}>Explore</Text>
                  <Feather name="arrow-right" size={16} color="#E9967A" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Extra padding for nav bar */}
          <View style={styles.navBarSpacer} />
        </Animated.ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 1)",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "300",
    color: "#FFFFFF",
    marginBottom: 10,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 18,
    color: "#FFF",
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  exploreText: {
    fontSize: 14,
    color: "#E9967A",
    marginRight: 4,
  },
  eventsBanner: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: "rgba(250, 200, 152, 0.15)",
    borderColor: "rgba(250, 200, 152, 0.3)",
    borderWidth: 1,
    borderRadius: 15,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  eventsSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  eventsButton: {
    backgroundColor: "#FAC898",
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    color: "#513C28",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  navBarSpacer: {
    height: 80, // Extra space for Expo nav bar
  },
});
