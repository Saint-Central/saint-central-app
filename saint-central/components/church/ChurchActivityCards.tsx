import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useRef, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated as RNAnimated, Dimensions, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { useCRUD } from "@/utils/crudClient";
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
  requiresChurch?: boolean; // New property to indicate if route needs churchId
};

const activities: ActivityCard[] = [
  {
    id: "1",
    title: "Church Service Times",
    icon: "church",
    iconType: "FontAwesome5",
    gradientColors: [`${theme.primary}25`, `${theme.primary}10`],
    route: "ServiceTimes",
    requiresChurch: true, // This route needs churchId
  },
  {
    id: "2", 
    title: "Bible Study Times",
    icon: "book-open-variant",
    iconType: "MaterialCommunityIcons",
    gradientColors: [`${theme.secondary}25`, `${theme.secondary}10`],
    route: "biblestudy",
    requiresChurch: true, // This route needs churchId
  },
  {
    id: "3",
    title: "Youth Group", 
    icon: "account-group",
    iconType: "MaterialCommunityIcons",
    gradientColors: [`${theme.accent1}25`, `${theme.accent1}10`],
    route: "YouthGroupSchedulePage",
    requiresChurch: true, // This route needs churchId
  },
  {
    id: "4",
    title: "Prayer",
    icon: "heart",
    iconType: "FontAwesome5",
    gradientColors: [`${theme.tertiary}25`, `${theme.tertiary}10`],
    route: "Prayer",
    requiresChurch: false, // This route doesn't need churchId
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

// Interface for user churches
interface UserChurch {
  id: string;
  name: string;
  role: string;
}

export default function ChurchActivityCards() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { select, selectOne } = useCRUD();
  
  // State for user's churches
  const [userChurches, setUserChurches] = useState<UserChurch[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Debug: Log the activities to make sure they're all there
  console.log("Activities count:", activities.length);
  console.log("Activity titles:", activities.map(a => a.title));

  // Fetch user's churches when component mounts
  useEffect(() => {
    if (user) {
      fetchUserChurches();
    }
  }, [user]);

  const fetchUserChurches = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get churches where the user is a member using CRUD client
      const churchMemberships = await select("church_members", {
        where: { user_id: user.id },
        select: "church_id, role"
      });

      if (churchMemberships && churchMemberships.length > 0) {
        // Get church details for each membership
        const churchPromises = churchMemberships.map(async (membership) => {
          const church = await selectOne("churches", {
            where: { id: membership.church_id },
            select: "id, name"
          });
          
          return church ? {
            id: church.id,
            name: church.name,
            role: membership.role,
          } : null;
        });

        const churches = (await Promise.all(churchPromises)).filter(Boolean) as UserChurch[];

        setUserChurches(churches);
        console.log("User churches found:", churches);

        // Select the first church by default if none is selected
        if (!selectedChurchId && churches.length > 0) {
          setSelectedChurchId(churches[0].id);
          console.log("Auto-selected church:", churches[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching user churches:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityPress = (activity: ActivityCard) => {
    if (activity.route) {
      try {
        console.log(`Navigating to: ${activity.route}`);
        
        // Check if this route requires a church and we have one selected
        if (activity.requiresChurch) {
          if (!selectedChurchId) {
            Alert.alert(
              "No Church Selected", 
              "Please make sure you're a member of a church to access this feature.",
              [{ text: "OK" }]
            );
            return;
          }
          
          // Navigate with churchId parameter
          console.log(`Navigating to ${activity.route} with churchId: ${selectedChurchId}`);
          (navigation as any).navigate(activity.route, { churchId: selectedChurchId });
        } else {
          // Navigate without parameters
          navigation.navigate(activity.route as never);
        }
      } catch (error) {
        console.error(`Failed to navigate to ${activity.route}:`, error);
        Alert.alert("Navigation Error", `Failed to open ${activity.title}. Please try again.`);
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
        {selectedChurchId && userChurches.length > 0 && (
          <Text style={styles.churchIndicator}>
            • {userChurches.find(c => c.id === selectedChurchId)?.name}
          </Text>
        )}
      </View>
      
      {/* Show loading or church info */}
      {loading && user && (
        <Text style={styles.loadingText}>Loading church information...</Text>
      )}
      
      {!loading && user && userChurches.length === 0 && (
        <Text style={styles.noChurchText}>
          Join a church to access church-specific activities
        </Text>
      )}
      
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
    flexWrap: "wrap",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.textWhite,
    marginLeft: 8,
  },
  churchIndicator: {
    fontSize: 12,
    color: theme.primary,
    marginLeft: 8,
    fontWeight: "500",
  },
  loadingText: {
    fontSize: 12,
    color: theme.textMedium,
    paddingHorizontal: 16,
    marginBottom: 8,
    fontStyle: "italic",
  },
  noChurchText: {
    fontSize: 12,
    color: theme.accent3,
    paddingHorizontal: 16,
    marginBottom: 8,
    fontStyle: "italic",
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