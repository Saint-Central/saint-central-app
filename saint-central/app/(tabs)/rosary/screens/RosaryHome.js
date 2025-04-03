import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  FlatList,
} from "react-native";
import { AntDesign, FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

// Mystery types
const MYSTERY_TYPES = {
  JOYFUL: "Joyful Mysteries",
  SORROWFUL: "Sorrowful Mysteries",
  GLORIOUS: "Glorious Mysteries",
  LUMINOUS: "Luminous Mysteries",
};

// Get day of the week mystery
const getDayMystery = () => {
  const day = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  switch (day) {
    case 0: // Sunday
      return { type: MYSTERY_TYPES.GLORIOUS, key: "GLORIOUS" };
    case 1: // Monday
      return { type: MYSTERY_TYPES.JOYFUL, key: "JOYFUL" };
    case 2: // Tuesday
      return { type: MYSTERY_TYPES.SORROWFUL, key: "SORROWFUL" };
    case 3: // Wednesday
      return { type: MYSTERY_TYPES.GLORIOUS, key: "GLORIOUS" };
    case 4: // Thursday
      return { type: MYSTERY_TYPES.LUMINOUS, key: "LUMINOUS" };
    case 5: // Friday
      return { type: MYSTERY_TYPES.SORROWFUL, key: "SORROWFUL" };
    case 6: // Saturday
      return { type: MYSTERY_TYPES.JOYFUL, key: "JOYFUL" };
    default:
      return { type: MYSTERY_TYPES.GLORIOUS, key: "GLORIOUS" };
  }
};

// Get mystery theme color
const getMysteryTheme = (mysteryKey) => {
  switch (mysteryKey) {
    case "JOYFUL":
      return {
        primary: "#0ACF83",
        secondary: "#07A866",
        accent: "#E8FFF4",
        gradientStart: "#0ACF83",
        gradientEnd: "#07A866",
        icon: "leaf",
      };
    case "SORROWFUL":
      return {
        primary: "#FF4757", 
        secondary: "#D63031",
        accent: "#FFE9EB",
        gradientStart: "#FF4757",
        gradientEnd: "#D63031",
        icon: "heart-broken",
      };
    case "GLORIOUS":
      return {
        primary: "#7158e2",
        secondary: "#5F45C2",
        accent: "#F0ECFF",
        gradientStart: "#7158e2",
        gradientEnd: "#5F45C2",
        icon: "crown",
      };
    case "LUMINOUS":
      return {
        primary: "#18DCFF",
        secondary: "#0ABDE3",
        accent: "#E4F9FF",
        gradientStart: "#18DCFF",
        gradientEnd: "#0ABDE3",
        icon: "star",
      };
    default:
      return {
        primary: "#7158e2",
        secondary: "#5F45C2",
        accent: "#F0ECFF",
        gradientStart: "#7158e2",
        gradientEnd: "#5F45C2",
        icon: "crown",
      };
  }
};

// Format date
const formatDate = (date = new Date()) => {
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
};

export default function RosaryHome() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const dayMystery = getDayMystery();
  const theme = getMysteryTheme(dayMystery.key);
  
  // State management
  const [userName, setUserName] = useState("Friend");
  const [lastPrayed, setLastPrayed] = useState(null);
  const [streakDays, setStreakDays] = useState(0);
  const [totalPrayers, setTotalPrayers] = useState(0);
  const [favoriteIntentions, setFavoriteIntentions] = useState([]);
  const [recentMysteries, setRecentMysteries] = useState([]);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Load user data on mount
  useEffect(() => {
    loadUserData();
    
    // Animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  // Load user data from AsyncStorage
  const loadUserData = async () => {
    try {
      // Load user profile
      const userProfile = await AsyncStorage.getItem('userProfile');
      if (userProfile) {
        const profile = JSON.parse(userProfile);
        if (profile.name) setUserName(profile.name);
      }
      
      // Load prayer statistics
      const prayerStats = await AsyncStorage.getItem('prayerStatistics');
      if (prayerStats) {
        const stats = JSON.parse(prayerStats);
        if (stats.lastPrayed) setLastPrayed(new Date(stats.lastPrayed));
        if (stats.streakDays) setStreakDays(stats.streakDays);
        if (stats.totalPrayers) setTotalPrayers(stats.totalPrayers);
      }
      
      // Load favorite intentions
      const intentions = await AsyncStorage.getItem('rosaryIntentions');
      if (intentions) {
        const allIntentions = JSON.parse(intentions);
        const favorites = allIntentions.filter(intention => intention.favorite).slice(0, 3);
        setFavoriteIntentions(favorites);
      }
      
      // Load recent mysteries
      const history = await AsyncStorage.getItem('prayerHistory');
      if (history) {
        const prayerHistory = JSON.parse(history);
        setRecentMysteries(prayerHistory.slice(0, 5));
      }
      
      // Check if first time user
      const isFirstTimeUser = await AsyncStorage.getItem('isFirstTimeUser');
      if (isFirstTimeUser === null) {
        setShowWelcomeMessage(true);
        await AsyncStorage.setItem('isFirstTimeUser', 'false');
      } else {
        setShowWelcomeMessage(false);
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  };
  
  // Start praying today's mystery
  const startTodayRosary = () => {
    router.push({
      pathname: "/rosary/prayer-screens/RosaryPrayer",
      params: {
        mysteryType: dayMystery.type,
        mysteryKey: dayMystery.key,
      }
    });
  };
  
  // Navigate to mystery selection
  const navigateToMysterySelection = () => {
    router.push('/rosary/screens/MysterySelection');
  };
  
  // Navigate to intentions screen
  const navigateToIntentions = () => {
    router.push('/rosary/screens/RosaryIntentions');
  };
  
  // Navigate to settings screen
  const navigateToSettings = () => {
    router.push("/rosary/screens/RosarySettings");
  };
  
  // Navigate to statistics screen
  const navigateToStatistics = () => {
    router.push("/rosary/screens/PrayerStatistics");
  };
  
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };
  
  // Render welcome message for first-time users
  const renderWelcomeMessage = () => {
    if (!showWelcomeMessage) return null;
    
    return (
      <Animated.View 
        style={[
          styles.welcomeCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <View style={styles.welcomeHeader}>
          <Image 
            source={require('../../../../assets/images/rosary-icon.png')} 
            style={styles.welcomeIcon}
            resizeMode="contain"
          />
          <Text style={styles.welcomeTitle}>Welcome to Rosary</Text>
        </View>
        
        <Text style={styles.welcomeDescription}>
          This app will guide you through praying the Holy Rosary with beautiful audio, scripture readings, and meditations.
        </Text>
        
        <TouchableOpacity
          style={[styles.welcomeButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowWelcomeMessage(false)}
        >
          <Text style={styles.welcomeButtonText}>Get Started</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  // Render daily mystery card
  const renderDailyMysteryCard = () => (
    <Animated.View 
      style={[
        styles.dailyMysteryCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientEnd]}
        style={styles.mysteryGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.mysteryCardContent}>
          <View style={styles.mysteryIconContainer}>
            <View style={styles.mysteryIconCircle}>
              <FontAwesome5 name={theme.icon} size={26} color="#FFFFFF" />
            </View>
          </View>
          
          <View style={styles.mysteryTextContainer}>
            <Text style={styles.todayText}>Today's Mystery</Text>
            <Text style={styles.mysteryTitle}>{dayMystery.type}</Text>
            <Text style={styles.dateText}>{formatDate()}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.startButton}
          onPress={startTodayRosary}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Begin Praying</Text>
          <AntDesign name="arrowright" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
  
  // Render quick action buttons
  const renderQuickActions = () => (
    <Animated.View 
      style={[
        styles.quickActionsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={navigateToIntentions}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: `${theme.primary}20` }]}>
          <FontAwesome5 name="pray" size={24} color={theme.primary} />
        </View>
        <Text style={styles.quickActionText}>Intentions</Text>
      </TouchableOpacity>
      
      <View style={styles.quickActionButton}>
        <Image
          source={require('../../../../assets/images/rosary-mascot.png')}
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </View>
      
      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={navigateToStatistics}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: `${theme.primary}20` }]}>
          <AntDesign name="barschart" size={24} color={theme.primary} />
        </View>
        <Text style={styles.quickActionText}>Statistics</Text>
      </TouchableOpacity>
    </Animated.View>
  );
  
  // Render prayer statistics
  const renderPrayerStats = () => (
    <Animated.View 
      style={[
        styles.statsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <Text style={styles.sectionTitle}>Your Prayer Journey</Text>
      
      <View style={styles.statsCards}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{streakDays}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
          <FontAwesome5 name="fire" size={20} color="#FF9500" style={styles.statIcon} />
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalPrayers}</Text>
          <Text style={styles.statLabel}>Rosaries Prayed</Text>
          <FontAwesome5 name="hand-holding" size={20} color="#5856D6" style={styles.statIcon} />
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{lastPrayed ? formatDate(lastPrayed).split(',')[0] : "Never"}</Text>
          <Text style={styles.statLabel}>Last Prayed</Text>
          <AntDesign name="calendar" size={20} color="#34C759" style={styles.statIcon} />
        </View>
      </View>
    </Animated.View>
  );
  
  // Render favorite intentions
  const renderFavoriteIntentions = () => {
    if (favoriteIntentions.length === 0) return null;
    
    return (
      <Animated.View 
        style={[
          styles.intentionsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Intentions</Text>
          <TouchableOpacity onPress={navigateToIntentions}>
            <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {favoriteIntentions.map((intention, index) => (
          <View key={intention.id} style={styles.intentionItem}>
            <View style={[styles.intentionIcon, { backgroundColor: `${theme.primary}20` }]}>
              <FontAwesome5 
                name={intention.category === "Family" ? "users" : "heart"} 
                size={16} 
                color={theme.primary} 
              />
            </View>
            <Text style={styles.intentionText} numberOfLines={1}>{intention.title}</Text>
          </View>
        ))}
      </Animated.View>
    );
  };
  
  // Render recent mysteries
  const renderRecentMysteries = () => {
    if (recentMysteries.length === 0) return null;
    
    return (
      <Animated.View 
        style={[
          styles.recentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently Prayed</Text>
          <TouchableOpacity onPress={navigateToStatistics}>
            <Text style={[styles.seeAllText, { color: theme.primary }]}>History</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={recentMysteries}
          keyExtractor={(item, index) => `${item.mysteryKey}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentList}
          renderItem={({ item }) => {
            const mysteryTheme = getMysteryTheme(item.mysteryKey);
            
            return (
              <TouchableOpacity 
                style={styles.recentItem}
                onPress={() => {
                  router.push({
                    pathname: "../prayer-screens/RosaryPrayer",
                    params: {
                      mysteryType: item.mysteryType,
                      mysteryKey: item.mysteryKey,
                    }
                  });
                }}
              >
                <LinearGradient
                  colors={[mysteryTheme.gradientStart, mysteryTheme.gradientEnd]}
                  style={styles.recentGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.recentIconContainer}>
                    <FontAwesome5 name={mysteryTheme.icon} size={20} color="#FFFFFF" />
                  </View>
                  <Text style={styles.recentItemTitle}>{item.mysteryType}</Text>
                  <Text style={styles.recentItemDate}>{formatDate(new Date(item.date)).split(',')[0]}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          }}
        />
      </Animated.View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Overlay for scrolling header effect */}
      <Animated.View
        style={[
          styles.headerOverlay,
          {
            opacity: scrollY.interpolate({
              inputRange: [0, 100],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FFFFFF']}
          style={styles.headerGradient}
        />
      </Animated.View>
      
      {/* Header - Removed profile icon */}
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          scrollY.setValue(offsetY);
        }}
      >
        {/* Welcome message for first-time users */}
        {renderWelcomeMessage()}
        
        {/* Daily mystery card */}
        {renderDailyMysteryCard()}
        
        {/* Quick action buttons */}
        {renderQuickActions()}
        
        {/* Prayer statistics */}
        {renderPrayerStats()}
        
        {/* Favorite intentions */}
        {renderFavoriteIntentions()}
        
        {/* Recent mysteries */}
        {renderRecentMysteries()}
        
        {/* Catholic Quote of the Day */}
        <Animated.View 
          style={[
            styles.quoteContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.quoteContent}>
            <Text style={styles.quoteText}>
              "The Rosary is the most excellent form of prayer and the most efficacious means of attaining eternal life."
            </Text>
            <Text style={styles.quoteAuthor}>- Pope St. Pius X</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 100,
  },
  headerGradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 10,
  },
  greetingContainer: {
    // Updated to take full width without the profile button
    width: '100%',
  },
  greeting: {
    fontSize: 16,
    color: "#666666",
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#242424",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    margin: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  welcomeIcon: {
    width: 36,
    height: 36,
    marginRight: 12,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#242424",
  },
  welcomeDescription: {
    fontSize: 16,
    color: "#666666",
    lineHeight: 24,
    marginBottom: 16,
  },
  welcomeButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  welcomeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  dailyMysteryCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mysteryGradient: {
    padding: 20,
  },
  mysteryCardContent: {
    flexDirection: "row",
    marginBottom: 20,
  },
  mysteryIconContainer: {
    marginRight: 16,
  },
  mysteryIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  mysteryTextContainer: {
    flex: 1,
  },
  todayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    opacity: 0.8,
    marginBottom: 4,
  },
  mysteryTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: "#FFFFFF",
    opacity: 0.8,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 12,
    borderRadius: 12,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginRight: 8,
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionButton: {
    alignItems: "center",
    width: (width - 60) / 3,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  mascotImage: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#242424",
    marginBottom: 16,
  },
  statsCards: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    width: (width - 56) / 3,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#242424",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
    marginBottom: 8,
  },
  statIcon: {
    opacity: 0.8,
  },
  intentionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  intentionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  intentionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  intentionText: {
    fontSize: 16,
    color: "#333333",
    flex: 1,
  },
  recentContainer: {
    marginBottom: 24,
  },
  recentList: {
    paddingHorizontal: 20,
  },
  recentItem: {
    width: 120,
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recentGradient: {
    padding: 16,
    height: 150,
    justifyContent: "space-between",
  },
  recentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  recentItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  recentItemDate: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.8,
  },
  quoteContainer: {
    margin: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  quoteContent: {
    padding: 20,
    alignItems: "center",
  },
  quoteText: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#333333",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 24,
  },
  quoteAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
  },
});