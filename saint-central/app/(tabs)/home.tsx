import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// Import local images
import lentImage from "../../assets/images/lent.jpg";
import reflectionImage from "../../assets/images/reflection.jpg";
import intentionsImage from "../../assets/images/intentions.jpg";
import heroImage from "../../assets/images/hero-image.jpg";

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
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Hero Banner */}
        <View style={styles.heroSection}>
          <Image source={heroImage} style={styles.heroImage} />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Welcome to Saint Central</Text>
            <Text style={styles.heroSubtitle}>
              Experience faith, community, and inspiration.
            </Text>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => router.push("/discover" as any)}
            >
              <Text style={styles.heroButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Cards Section */}
        <View style={styles.featuredSection}>
          <Text style={styles.sectionTitle}>Featured</Text>
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
                <Image source={card.image} style={styles.featuredCardImage} />
                <View style={styles.featuredCardContent}>
                  <View style={styles.featuredCardHeader}>
                    <Feather name={card.icon} size={20} color="#FFD700" />
                    <Text style={styles.featuredCardTitle}>{card.title}</Text>
                  </View>
                  <Text style={styles.featuredCardDescription}>
                    {card.description}
                  </Text>
                  <View style={styles.featuredCardFooter}>
                    <Text style={styles.featuredCardLink}>Explore</Text>
                    <Feather name="chevron-right" size={16} color="#FFD700" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Links Grid */}
        <View style={styles.quickLinksSection}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
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
                <Feather name={link.icon as any} size={24} color="#FFD700" />
                <Text style={styles.quickLinkText}>{link.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1917",
  },
  heroSection: {
    position: "relative",
    height: 250,
    marginBottom: 20,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(28, 25, 23, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF9C4",
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 16,
    color: "rgba(255, 215, 0, 0.8)",
    marginTop: 8,
    textAlign: "center",
  },
  heroButton: {
    marginTop: 16,
    backgroundColor: "rgba(147, 51, 234, 0.8)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  heroButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  featuredSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFF9C4",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  featuredScroll: {
    paddingLeft: 16,
  },
  featuredCard: {
    backgroundColor: "rgba(41, 37, 36, 0.7)",
    width: 250,
    marginRight: 16,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  featuredCardImage: {
    width: "100%",
    height: 140,
  },
  featuredCardContent: {
    padding: 12,
  },
  featuredCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featuredCardTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFF9C4",
    marginLeft: 8,
  },
  featuredCardDescription: {
    fontSize: 14,
    color: "rgba(255, 249, 196, 0.8)",
    marginBottom: 10,
  },
  featuredCardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  featuredCardLink: {
    fontSize: 14,
    color: "rgba(255, 215, 0, 0.8)",
    marginRight: 4,
  },
  quickLinksSection: {
    marginBottom: 30,
    paddingHorizontal: 16,
  },
  quickLinksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickLinkCard: {
    width: "47%",
    backgroundColor: "rgba(41, 37, 36, 0.7)",
    paddingVertical: 20,
    borderRadius: 15,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLinkText: {
    fontSize: 16,
    color: "#FFF9C4",
    marginTop: 8,
  },
  bottomSpacer: {
    height: 80,
  },
});
