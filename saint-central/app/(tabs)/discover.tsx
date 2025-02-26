import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";

export default function DiscoverScreen() {
  type FeatherIconName = "heart" | "users" | "book-open" | "globe";

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
    <SafeAreaView style={styles.container}>
      <ScrollView>
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
              Check out what's happening this month
            </Text>
          </View>
          <TouchableOpacity style={styles.eventsButton}>
            <Text style={styles.buttonText}>View All</Text>
            <Feather name="arrow-right" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.cardsContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.card}
              onPress={() => console.log(`Navigating to ${category.title}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Feather name={category.icon} size={24} color="#FFD700" />
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
                <Feather name="chevron-right" size={16} color="#FFD700" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Extra padding for nav bar */}
        <View style={styles.navBarSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1917",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF9C4",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "rgba(255, 215, 0, 0.7)",
    fontSize: 14,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    backgroundColor: "rgba(41, 37, 36, 0.5)",
    borderColor: "rgba(255, 215, 0, 0.2)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFF9C4",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "rgba(255, 249, 196, 0.7)",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  exploreText: {
    fontSize: 14,
    color: "rgba(255, 215, 0, 0.7)",
    marginRight: 4,
  },
  eventsBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "rgba(147, 51, 234, 0.2)",
    borderColor: "rgba(147, 51, 234, 0.4)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  eventsSubtitle: {
    fontSize: 12,
    color: "rgba(255, 249, 196, 0.8)",
  },
  eventsButton: {
    backgroundColor: "rgba(147, 51, 234, 0.8)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginRight: 4,
  },
  navBarSpacer: {
    height: 80, // Add extra space at bottom to account for Expo nav bar
  },
});
