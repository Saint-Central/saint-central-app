import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

// Mapping gradients to category icons
const gradientMap: Record<string, { start: string; end: string }> = {
  heart: { start: "#3A86FF", end: "#4361EE" },
  users: { start: "#FF006E", end: "#FB5607" },
  "book-open": { start: "#8338EC", end: "#6A0DAD" },
  globe: { start: "#06D6A0", end: "#1A936F" },
};

interface Category {
  id: number;
  title: string;
  icon: "heart" | "users" | "book-open" | "globe";
  description: string;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  const categories: Category[] = [
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

  // Category card component with press animations
  const CategoryCard = ({ category }: { category: Category }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scale, {
        toValue: 0.97,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() =>
            router.push(`/${category.title.replace(/\s+/g, "-").toLowerCase()}` as any)
          }
        >
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={[gradientMap[category.icon].start, gradientMap[category.icon].end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Feather name={category.icon} size={24} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{category.title}</Text>
              <Text style={styles.cardDescription}>{category.description}</Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.exploreText}>Explore</Text>
            <Feather name="arrow-right" size={16} color="#3A86FF" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
      >
        {/* Full-Width Integrated Header */}
        <ImageBackground
          source={require("../../assets/images/jesus_on_cross.png")}
          style={styles.header}
          resizeMode="cover"
          imageStyle={{ opacity: 0.65 }}
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0.0)"]}
            style={styles.headerOverlay}
          />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Discover</Text>
            <Text style={styles.headerSubtitle}>
              Explore resources and connect with our community
            </Text>
          </View>
        </ImageBackground>

        {/* Upcoming Events Banner */}
        <View style={styles.eventsBanner}>
          <View style={styles.eventsTextContainer}>
            <Text style={styles.eventsTitle}>Upcoming Events</Text>
            <Text style={styles.eventsSubtitle}>Check out what's happening</Text>
          </View>
          <TouchableOpacity style={styles.eventsButton} onPress={() => router.push("/events")}>
            <Text style={styles.buttonText}>View All</Text>
            <Feather name="arrow-right" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Category Cards */}
        <View style={styles.cardsContainer}>
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </View>

        {/* Extra bottom spacing */}
        <View style={styles.navBarSpacer} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    width: "100%",
    height: 300,
    justifyContent: "flex-end",
    backgroundColor: "#F4EBD0",
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 18,
    color: "#E0E7FF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  eventsBanner: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: "#F8FAFC",
    borderColor: "#F1F5F9",
    borderWidth: 1,
    borderRadius: 15,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eventsTextContainer: {
    flex: 1,
  },
  eventsTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: "#1E293B",
    marginBottom: 4,
  },
  eventsSubtitle: {
    fontSize: 14,
    color: "#475569",
  },
  eventsButton: {
    backgroundColor: "#3A86FF",
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#F1F5F9",
    borderWidth: 1,
    borderRadius: 15,
    padding: 16,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#1E293B",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  exploreText: {
    fontSize: 14,
    color: "#3A86FF",
    marginRight: 4,
  },
  navBarSpacer: {
    height: 80,
  },
});
