import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ImageBackground,
  Dimensions,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// Import local images
import lentImage from "../../assets/images/lent.jpg";
import reflectionImage from "../../assets/images/reflection.jpg";
import intentionsImage from "../../assets/images/intentions.jpg";
import heroImage from "../../assets/images/hero-image.jpg";
// Using require for background
const backgroundImageRequire = require("../../assets/images/home-image.jpg");

const { width } = Dimensions.get("window");

// Define allowed Feather icon names for the featured cards.
type FeatherIconName = "heart" | "book-open" | "globe";

// Define the type for the featured cards.
interface Card {
  id: number;
  title: string;
  description: string;
  icon: FeatherIconName;
  route: string;
  image: any;
}

// Define a type for quick link icons.
type QuickLinkIconName = "calendar" | "play" | "book" | "heart";

// Define the type for quick links.
interface QuickLink {
  id: number;
  title: string;
  icon: QuickLinkIconName;
  route: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  const featuredCards: Card[] = [
    {
      id: 1,
      title: "Lent 2025",
      description: "Do Lent with your friends and grow together in faith.",
      icon: "heart",
      route: "/Lent2025",
      image: lentImage,
    },
    {
      id: 2,
      title: "Daily Reflection",
      description: "Begin your day with prayer and scripture.",
      icon: "book-open",
      route: "/reflection",
      image: reflectionImage,
    },
    {
      id: 3,
      title: "Intentions",
      description: "Add your friends on Saint Central and share goals.",
      icon: "globe",
      route: "/community",
      image: intentionsImage,
    },
  ];

  const quickLinks: QuickLink[] = [
    { id: 1, title: "Events", icon: "calendar", route: "/events" },
    { id: 2, title: "Sermons", icon: "play", route: "/sermons" },
    { id: 3, title: "Bible", icon: "book", route: "/bible" },
    { id: 4, title: "Donations", icon: "heart", route: "/donate" },
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
          {/* Enhanced Hero Banner */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <Feather name="sunrise" size={36} color="#FAC898" />
            </View>
            <Text style={styles.heroTitle}>Saint Central</Text>
            <Text style={styles.heroSubtitle}>
              Let's begin the journey to your spiritual life
            </Text>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => router.push("/discover" as any)}
            >
              <Text style={styles.heroButtonText}>DISCOVER</Text>
              <Feather name="arrow-right" size={16} color="#513C28" />
            </TouchableOpacity>
          </View>

          {/* Featured Cards Section */}
          <View style={styles.featuredSection}>
            <Text style={styles.sectionTitle}>Explore Your Journey</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
            >
              {featuredCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.featuredCard}
                  onPress={() => {
                    if (card.title === "Daily Reflection") {
                      Alert.alert("this page is not set up yet");
                    } else {
                      router.push(card.route as any);
                    }
                  }}
                >
                  <View style={styles.cardImageContainer}>
                    <Image
                      source={card.image}
                      style={styles.featuredCardImage}
                    />
                    <View style={styles.cardImageOverlay} />
                  </View>
                  <View style={styles.featuredCardContent}>
                    <View style={styles.featuredCardHeader}>
                      <Feather name={card.icon} size={20} color="#E9967A" />
                      <Text style={styles.featuredCardTitle}>{card.title}</Text>
                    </View>
                    <Text style={styles.featuredCardDescription}>
                      {card.description}
                    </Text>
                    <View style={styles.featuredCardFooter}>
                      <Text style={styles.featuredCardLink}>Explore</Text>
                      <Feather name="arrow-right" size={16} color="#E9967A" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Quick Links Grid */}
          <View style={styles.quickLinksSection}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.quickLinksGrid}>
              {quickLinks.map((link) => (
                <TouchableOpacity
                  key={link.id}
                  style={styles.quickLinkCard}
                  onPress={() => {
                    if (link.route === "/donate") {
                      router.push(link.route as any);
                    } else {
                      Alert.alert("this page is not set up yet");
                    }
                  }}
                >
                  <Feather name={link.icon as any} size={24} color="#E9967A" />
                  <Text style={styles.quickLinkText}>{link.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
  heroSection: {
    height: 400,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "300",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 1,
  },
  heroSubtitle: {
    fontSize: 18,
    color: "#FFF",
    textAlign: "center",
    marginBottom: 30,
    opacity: 0.9,
    letterSpacing: 0.5,
    maxWidth: 280,
  },
  heroButton: {
    flexDirection: "row",
    backgroundColor: "#FAC898",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  heroButtonText: {
    fontSize: 16,
    color: "#513C28",
    fontWeight: "600",
    marginRight: 8,
  },

  featuredSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "400",
    color: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  featuredScroll: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  featuredCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    width: 250,
    marginRight: 15,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  cardImageContainer: {
    position: "relative",
    height: 140,
  },
  featuredCardImage: {
    width: "100%",
    height: "100%",
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  featuredCardContent: {
    padding: 15,
  },
  featuredCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featuredCardTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFFFFF",
    marginLeft: 10,
  },
  featuredCardDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 10,
    lineHeight: 20,
  },
  featuredCardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  featuredCardLink: {
    fontSize: 14,
    color: "#E9967A",
    marginRight: 4,
  },
  quickLinksSection: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  quickLinksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickLinkCard: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    height: 100,
  },
  quickLinkText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginTop: 10,
    opacity: 0.9,
  },
});
