import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated as RNAnimated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import theme from "@/theme";

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
    gradientColors: [`${theme.primary}15`, `${theme.primary}10`],
    route: "ServiceTimes",
  },
  {
    id: "2", 
    title: "Bible Study Times",
    icon: "book-open-variant",
    iconType: "MaterialCommunityIcons",
    gradientColors: [`${theme.secondary}15`, `${theme.secondary}10`],
    route: "biblestudy",
  },
  {
    id: "3",
    title: "Youth Group", 
    icon: "account-group",
    iconType: "MaterialCommunityIcons",
    gradientColors: [`${theme.accent1}15`, `${theme.accent1}10`],
    route: "YouthGroupSchedulePage",
  },
  {
    id: "4",
    title: "Prayer",
    icon: "heart",
    iconType: "FontAwesome5",
    gradientColors: [`${theme.tertiary}15`, `${theme.tertiary}10`],
    route: "Prayer",
  },
];

const ActivityCardComponent = ({ activity }: { activity: ActivityCard }) => {
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
    const iconSize = 16;
    
    if (activity.iconType === "FontAwesome5") {
      return <FontAwesome5 name={activity.icon as any} size={iconSize} color={iconColor} />;
    } else {
      return <MaterialCommunityIcons name={activity.icon as any} size={iconSize} color={iconColor} />;
    }
  };

  return (
    <TouchableOpacity
      onPress={activity.onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.cardWrapper}
    >
      <RNAnimated.View style={[styles.card, { transform: [{ scale: pressAnim }] }]}>
        <LinearGradient
          colors={activity.gradientColors}
          style={styles.cardGradient}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}20` }]}>
            {renderIcon()}
          </View>
          <Text style={styles.cardTitle}>{activity.title}</Text>
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
      <View style={styles.verticalContainer}>
        {activities.map((activity) => (
          <ActivityCardComponent 
            key={activity.id} 
            activity={{
              ...activity,
              onPress: () => handleActivityPress(activity)
            }} 
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textWhite,
    marginLeft: 8,
  },
  verticalContainer: {
    gap: 12,
  },
  cardWrapper: {
    width: '100%',
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  cardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    minHeight: 60,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.textWhite,
    flex: 1,
  },
});