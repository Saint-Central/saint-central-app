import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Animated,
} from "react-native";
import { AntDesign, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

// Mystery types
const MYSTERY_TYPES = {
  JOYFUL: "Joyful Mysteries",
  SORROWFUL: "Sorrowful Mysteries",
  GLORIOUS: "Glorious Mysteries",
  LUMINOUS: "Luminous Mysteries",
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
        description: "The Joyful Mysteries focus on the Incarnation and early life of Christ through the eyes of Mary.",
      };
    case "SORROWFUL":
      return {
        primary: "#FF4757", 
        secondary: "#D63031",
        accent: "#FFE9EB",
        gradientStart: "#FF4757",
        gradientEnd: "#D63031",
        icon: "heart-broken",
        description: "The Sorrowful Mysteries focus on the Passion of Christ and his suffering for our salvation.",
      };
    case "GLORIOUS":
      return {
        primary: "#7158e2",
        secondary: "#5F45C2",
        accent: "#F0ECFF",
        gradientStart: "#7158e2",
        gradientEnd: "#5F45C2",
        icon: "crown",
        description: "The Glorious Mysteries focus on the Resurrection of Jesus and the glories of heaven.",
      };
    case "LUMINOUS":
      return {
        primary: "#18DCFF",
        secondary: "#0ABDE3",
        accent: "#E4F9FF",
        gradientStart: "#18DCFF",
        gradientEnd: "#0ABDE3",
        icon: "star",
        description: "The Luminous Mysteries focus on the public ministry of Jesus and the institution of the Eucharist.",
      };
    default:
      return {
        primary: "#0ACF83",
        secondary: "#07A866",
        accent: "#E8FFF4",
        gradientStart: "#0ACF83",
        gradientEnd: "#07A866",
        icon: "leaf",
        description: "The Joyful Mysteries focus on the Incarnation and early life of Christ through the eyes of Mary.",
      };
  }
};

// Mystery content
const MYSTERIES = {
  JOYFUL: [
    { id: 1, title: "The Annunciation", description: "The Angel Gabriel announces to Mary that she shall conceive the Son of God." },
    { id: 2, title: "The Visitation", description: "Mary visits her cousin Elizabeth, who is pregnant with John the Baptist." },
    { id: 3, title: "The Nativity", description: "Jesus is born in a stable in Bethlehem." },
    { id: 4, title: "The Presentation", description: "Mary and Joseph present Jesus at the temple." },
    { id: 5, title: "Finding in the Temple", description: "After being lost for three days, Jesus is found in the temple." },
  ],
  SORROWFUL: [
    { id: 1, title: "The Agony in the Garden", description: "Jesus prays in the Garden of Gethsemane on the night of His betrayal." },
    { id: 2, title: "The Scourging at the Pillar", description: "Jesus is tied to a pillar and whipped." },
    { id: 3, title: "The Crowning with Thorns", description: "Jesus is mocked and crowned with thorns." },
    { id: 4, title: "The Carrying of the Cross", description: "Jesus carries His cross to Calvary." },
    { id: 5, title: "The Crucifixion", description: "Jesus is nailed to the cross and dies." },
  ],
  GLORIOUS: [
    { id: 1, title: "The Resurrection", description: "Jesus rises from the dead on the third day." },
    { id: 2, title: "The Ascension", description: "Jesus ascends into Heaven forty days after His resurrection." },
    { id: 3, title: "The Descent of the Holy Spirit", description: "The Holy Spirit descends upon Mary and the apostles." },
    { id: 4, title: "The Assumption", description: "Mary is assumed body and soul into Heaven." },
    { id: 5, title: "The Coronation", description: "Mary is crowned Queen of Heaven and Earth." },
  ],
  LUMINOUS: [
    { id: 1, title: "The Baptism in the Jordan", description: "Jesus is baptized by John the Baptist." },
    { id: 2, title: "The Wedding at Cana", description: "Jesus performs His first miracle, changing water into wine." },
    { id: 3, title: "The Proclamation of the Kingdom", description: "Jesus announces the Kingdom of God and calls all to conversion." },
    { id: 4, title: "The Transfiguration", description: "Jesus is transfigured on Mount Tabor." },
    { id: 5, title: "The Institution of the Eucharist", description: "Jesus institutes the Eucharist at the Last Supper." },
  ],
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

export default function MysterySelection() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const dayMystery = getDayMystery();
  
  // State management
  const [selectedMystery, setSelectedMystery] = useState(dayMystery.key);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Load settings on mount
  useEffect(() => {
    loadSettings();
    
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
  
  // Load settings from AsyncStorage
  const loadSettings = async () => {
    try {
      const settingsJson = await AsyncStorage.getItem('rosarySettings');
      if (settingsJson !== null) {
        const settings = JSON.parse(settingsJson);
        
        if (settings.guide) {
          setSelectedGuide(settings.guide);
        }
        
        if (settings.duration) {
          setSelectedDuration(settings.duration);
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };
  
  // Start praying the selected mystery
  const startPraying = () => {
    // Navigate to Rosary screen with selected mystery
    router.push({
      pathname: "/Rosary",
      params: {
        mysteryType: MYSTERY_TYPES[selectedMystery],
        mysteryKey: selectedMystery,
      }
    });
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  
  // Render mystery card
  const renderMysteryCard = (mysteryKey) => {
    const theme = getMysteryTheme(mysteryKey);
    const isSelected = selectedMystery === mysteryKey;
    
    return (
      <Animated.View 
        style={[
          styles.mysteryCard,
          isSelected && styles.selectedMysteryCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <TouchableOpacity
          style={styles.mysteryCardTouchable}
          onPress={() => {
            setSelectedMystery(mysteryKey);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={isSelected ? [theme.gradientStart, theme.gradientEnd] : ['#FFFFFF', '#FFFFFF']}
            style={styles.mysteryCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.mysteryCardContent}>
              <View style={[
                styles.mysteryIconContainer,
                { backgroundColor: isSelected ? "rgba(255, 255, 255, 0.2)" : `${theme.primary}20` }
              ]}>
                <FontAwesome5 
                  name={theme.icon} 
                  size={26} 
                  color={isSelected ? "#FFFFFF" : theme.primary} 
                />
              </View>
              
              <View style={styles.mysteryTextContainer}>
                <Text style={[
                  styles.mysteryTitle,
                  { color: isSelected ? "#FFFFFF" : "#242424" }
                ]}>
                  {MYSTERY_TYPES[mysteryKey]}
                </Text>
                
                <Text style={[
                  styles.mysteryDescription,
                  { color: isSelected ? "#FFFFFF" : "#666666" }
                ]}>
                  {theme.description}
                </Text>
              </View>
              
              {mysteryKey === dayMystery.key && (
                <View style={[
                  styles.todayBadge,
                  { backgroundColor: isSelected ? "rgba(255, 255, 255, 0.3)" : `${theme.primary}30` }
                ]}>
                  <Text style={[
                    styles.todayBadgeText,
                    { color: isSelected ? "#FFFFFF" : theme.primary }
                  ]}>
                    Today
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  // Render mystery details
  const renderMysteryDetails = () => {
    const theme = getMysteryTheme(selectedMystery);
    const mysteries = MYSTERIES[selectedMystery];
    
    return (
      <Animated.View 
        style={[
          styles.detailsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <Text style={styles.detailsTitle}>The Five Mysteries</Text>
        
        {mysteries.map((mystery, index) => (
          <View key={mystery.id} style={styles.mysteryItem}>
            <View style={[
              styles.mysteryItemNumber,
              { backgroundColor: `${theme.primary}20` }
            ]}>
              <Text style={[styles.mysteryItemNumberText, { color: theme.primary }]}>
                {mystery.id}
              </Text>
            </View>
            
            <View style={styles.mysteryItemContent}>
              <Text style={styles.mysteryItemTitle}>{mystery.title}</Text>
              <Text style={styles.mysteryItemDescription}>{mystery.description}</Text>
            </View>
          </View>
        ))}
      </Animated.View>
    );
  };
  
  // Render start button
  const renderStartButton = () => {
    const theme = getMysteryTheme(selectedMystery);
    
    return (
      <Animated.View
        style={[
          styles.startButtonContainer,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: theme.primary }]}
          onPress={startPraying}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Begin {MYSTERY_TYPES[selectedMystery]}</Text>
          <AntDesign name="arrowright" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <AntDesign name="arrowleft" size={24} color="#242424" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Select Mystery</Text>
        
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push("/RosarySettings")}
          activeOpacity={0.7}
        >
          <AntDesign name="setting" size={24} color="#242424" />
        </TouchableOpacity>
      </View>
      
      <ScrollView
  contentContainerStyle={styles.scrollContent}
  showsVerticalScrollIndicator={false}
  scrollEventThrottle={16}
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true, listener: () => {} }  // Add this empty listener function
  )}
>
        {/* Mystery cards */}
        <Text style={styles.sectionTitle}>Choose Mystery Type</Text>
        {renderMysteryCard("JOYFUL")}
        {renderMysteryCard("SORROWFUL")}
        {renderMysteryCard("GLORIOUS")}
        {renderMysteryCard("LUMINOUS")}
        
        {/* Mystery details */}
        {renderMysteryDetails()}
        
        {/* Prayer guide info */}
        <Animated.View 
          style={[
            styles.guideContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.guideCard}>
            <Text style={styles.guideTitle}>Your Prayer Settings</Text>
            
            <View style={styles.guideRow}>
              <View style={styles.guideIconContainer}>
                <AntDesign name="user" size={20} color="#666666" />
              </View>
              <Text style={styles.guideLabel}>Voice Guide:</Text>
              <Text style={styles.guideValue}>{selectedGuide ? selectedGuide.name : "Default"}</Text>
            </View>
            
            <View style={styles.guideRow}>
              <View style={styles.guideIconContainer}>
                <AntDesign name="clockcircleo" size={20} color="#666666" />
              </View>
              <Text style={styles.guideLabel}>Duration:</Text>
              <Text style={styles.guideValue}>{selectedDuration ? selectedDuration.duration : "20 min"}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.changeSettingsButton}
              onPress={() => router.push("/RosarySettings")}
            >
              <Text style={styles.changeSettingsText}>Change Settings</Text>
              <AntDesign name="right" size={14} color="#666666" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
      
      {/* Start button */}
      {renderStartButton()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#242424",
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#242424",
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  mysteryCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  selectedMysteryCard: {
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  mysteryCardTouchable: {
    flex: 1,
  },
  mysteryCardGradient: {
    padding: 20,
  },
  mysteryCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  mysteryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  mysteryTextContainer: {
    flex: 1,
  },
  mysteryTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  mysteryDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  todayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 10,
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#242424",
    marginBottom: 16,
  },
  mysteryItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  mysteryItemNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    marginTop: 2,
  },
  mysteryItemNumberText: {
    fontSize: 16,
    fontWeight: "700",
  },
  mysteryItemContent: {
    flex: 1,
  },
  mysteryItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#242424",
    marginBottom: 4,
  },
  mysteryItemDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  guideContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  guideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#242424",
    marginBottom: 16,
  },
  guideRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  guideIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  guideLabel: {
    fontSize: 15,
    color: "#666666",
    marginRight: 8,
  },
  guideValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#242424",
  },
  changeSettingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  changeSettingsText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666666",
    marginRight: 8,
  },
  startButtonContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginRight: 8,
  },
});