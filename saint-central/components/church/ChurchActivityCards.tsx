import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated as RNAnimated, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import theme from "@/theme";

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 64) / 2; // 2 cards per row with padding

type ActivityCard = {
  id: string;
  title: string;
  icon: string;
  iconType: "FontAwesome5" | "MaterialCommunityIcons";
  gradientColors: string[];
  route?: string;
  onPress?: () => void;
};

const activities: ActivityCard[] = [
  {
    id: "1",
    title: "Church Service Times",
    icon: "church",
    iconType: "FontAwesome5",
    gradientColors: [`${theme.primary}25`, `${theme.primary}10`],
    route: "ServiceTimes",
  },
  {
    id: "2", 
    title: "Bible Study Times",
    icon: "book-open-variant",
    iconType: "MaterialCommunityIcons",
    gradientColors: [`${theme.secondary}25`, `${theme.secondary}10`],
    route: "biblestudy",
  },
  {
    id: "3",
    title: "Youth Group", 
    icon: "account-group",
    iconType: "MaterialCommunityIcons",
    gradientColors: [`${theme.accent1}25`, `${theme.accent1}10`],
    route: "YouthGroupSchedulePage",
  },
  {
    id: "4",
    title: "Prayer",
    icon: "heart",
    iconType: "FontAwesome5",
    gradientColors: [`${theme.tertiary}25`, `${theme.tertiary}10`],
    route: "Prayer",
  },
];

const ActivityCardComponent = ({ activity, index }: { activity: ActivityCard; index: number }) => {
  const pressAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    RNAnimated.spring(pressAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    RNAnimated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getIconColor = () => {
    switch (activity.id) {
      case "1": return theme.primary;
      case "2": return theme.secondary;
      case "3": return theme.accent1;
      case "4": return theme.tertiary;
      case "5": return theme.accent3;
      default: return theme.primary;
    }
  };

  const renderIcon = () => {
    const iconColor = getIconColor();
    const iconSize = 24;
    
    if (activity.iconType === "FontAwesome5") {
      return <FontAwesome5 name={activity.icon as any} size={iconSize} color={iconColor} />;
    } else {
      return <MaterialCommunityIcons name={activity.icon as any} size={iconSize} color={iconColor} />;
    }
  };

  const isLargeCard = index < 2; // First two cards are larger

  return (
    <TouchableOpacity
      onPress={activity.onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={[
        styles.cardWrapper,
        isLargeCard ? styles.largeCardWrapper : styles.smallCardWrapper
      ]}
    >
      <RNAnimated.View style={[
        styles.card, 
        isLargeCard ? styles.largeCard : styles.smallCard,
        { transform: [{ scale: pressAnim }] }
      ]}>
        <LinearGradient
          colors={activity.gradientColors}
          style={[styles.cardGradient, isLargeCard ? styles.largeCardGradient : styles.smallCardGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[
            styles.iconContainer, 
            { backgroundColor: `${getIconColor()}30` },
            isLargeCard ? styles.largeIconContainer : styles.smallIconContainer
          ]}>
            {renderIcon()}
          </View>
          <Text style={[
            styles.cardTitle,
            isLargeCard ? styles.largeCardTitle : styles.smallCardTitle
          ]}>
            {activity.title}
          </Text>
        </LinearGradient>
      </RNAnimated.View>
    </TouchableOpacity>
  );
};

export default function ChurchActivityCards() {
  const navigation = useNavigation();
  
  // Debug: Log the activities to make sure they're all there
  console.log("Activities count:", activities.length);
  console.log("Activity titles:", activities.map(a => a.title));

  const handleActivityPress = (activity: ActivityCard) => {
    if (activity.route) {
      try {
        console.log(`Navigating to: ${activity.route}`);
        navigation.navigate(activity.route as never);
      } catch (error) {
        console.error(`Failed to navigate to ${activity.route}:`, error);
        // You can add an Alert here if needed
        // Alert.alert("Coming Soon", `${activity.title} page is under development`);
      }
    } else if (activity.onPress) {
      activity.onPress();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="calendar-heart" size={20} color={theme.primary} />
        <Text style={styles.sectionTitle}>Quick Activities ({activities.length})</Text>
      </View>
      
      {/* Grid Layout */}
      <View style={styles.gridContainer}>
        {/* Top Row - Two large cards */}
        <View style={styles.topRow}>
          {activities.slice(0, 2).map((activity, index) => (
            <ActivityCardComponent 
              key={activity.id} 
              index={index}
              activity={{
                ...activity,
                onPress: () => handleActivityPress(activity)
              }} 
            />
          ))}
        </View>
        
        {/* Bottom Row - Two smaller cards */}
        <View style={styles.bottomRow}>
          {activities.slice(2, 4).map((activity, index) => (
            <ActivityCardComponent 
              key={activity.id} 
              index={index + 2}
              activity={{
                ...activity,
                onPress: () => handleActivityPress(activity)
              }} 
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent", // Removed the block background
    borderRadius: 0,
    padding: 0,
    borderWidth: 0,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textWhite,
    marginLeft: 8,
  },
  gridContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    gap: 12,
  },
  bottomRow: {
    flexDirection: "row",
    gap: 12,
  },
  cardWrapper: {
    flex: 1,
  },
  largeCardWrapper: {
    minHeight: 100,
  },
  smallCardWrapper: {
    minHeight: 80,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  largeCard: {
    height: 100,
  },
  smallCard: {
    height: 80,
  },
  cardGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  largeCardGradient: {
    paddingVertical: 16,
  },
  smallCardGradient: {
    paddingVertical: 12,
  },
  iconContainer: {
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  largeIconContainer: {
    width: 36,
    height: 36,
  },
  smallIconContainer: {
    width: 32,
    height: 32,
  },
  cardTitle: {
    fontWeight: "600",
    color: theme.textWhite,
    textAlign: "center",
    lineHeight: 16,
  },
  largeCardTitle: {
    fontSize: 14,
  },
  smallCardTitle: {
    fontSize: 12,
  },
});