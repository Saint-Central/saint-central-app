import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Animated,
  StatusBar,
  ImageBackground,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

// Guide Audio Mapping
const GUIDE_AUDIO_FILES = {
  "Francis": {
    JOYFUL: require('../../assets/audio/rosary1.mp3'),
    SORROWFUL: require('../../assets/audio/rosary1.mp3'),
    GLORIOUS: require('../../assets/audio/rosary1.mp3'),
    LUMINOUS: require('../../assets/audio/rosary1.mp3'),
  },
  "Claire": {
    JOYFUL: require('../../assets/audio/rosary2.mp3'),
    SORROWFUL: require('../../assets/audio/rosary2.mp3'),
    GLORIOUS: require('../../assets/audio/rosary2.mp3'),
    LUMINOUS: require('../../assets/audio/rosary2.mp3'),
  },
  "Thomas": {
    JOYFUL: require('../../assets/audio/rosary1.mp3'),
    SORROWFUL: require('../../assets/audio/rosary1.mp3'),
    GLORIOUS: require('../../assets/audio/rosary1.mp3'),
    LUMINOUS: require('../../assets/audio/rosary1.mp3'),
  },
  "Maria": {
    JOYFUL: require('../../assets/audio/rosary1.mp3'),
    SORROWFUL: require('../../assets/audio/rosary1.mp3'),
    GLORIOUS: require('../../assets/audio/rosary1.mp3'),
    LUMINOUS: require('../../assets/audio/rosary1.mp3'),
  },
};

// Get mystery theme color
const getMysteryTheme = (mysteryKey: string) => {
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
        primary: "#0ACF83",
        secondary: "#07A866",
        accent: "#E8FFF4",
        gradientStart: "#0ACF83",
        gradientEnd: "#07A866",
        icon: "leaf",
      };
  }
};

// Convert number to Roman numeral
const toRoman = (num: number) => {
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return roman[num] || num.toString();
};

export default function RosaryPrayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Get parameters from navigation
  const { mysteryType, mysteryKey, mysteryIndex, mysteryTitle, mysteryDescription, guideName } = params;
  
  // Get theme based on mystery type
  const theme = getMysteryTheme(mysteryKey as string);
  
  // State for prayer interface
  const [currentPrayerStep, setCurrentPrayerStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  // Define prayers for the rosary
  const prayers = [
    { id: 0, title: "Sign of the Cross", text: "In the name of the Father, and of the Son, and of the Holy Spirit. Amen." },
    { id: 1, title: "Apostles' Creed", text: "I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, his only Son, our Lord..." },
    { id: 2, title: "Our Father", text: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven..." },
    { id: 3, title: "Hail Mary (3x)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
    { id: 4, title: "Glory Be", text: "Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be..." },
    { id: 5, title: `First Mystery: ${mysteryTitle || "The Mystery"}`, text: mysteryDescription || "Meditate on this mystery..." },
    { id: 6, title: "Our Father", text: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven..." },
    { id: 7, title: "Hail Mary (10x)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
    { id: 8, title: "Glory Be", text: "Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be..." },
    { id: 9, title: "Fatima Prayer", text: "O my Jesus, forgive us our sins, save us from the fires of hell, lead all souls to Heaven, especially those in most need of Thy mercy." },
    { id: 10, title: "Closing Prayers", text: "Hail, Holy Queen, Mother of Mercy, our life, our sweetness and our hope..." },
    { id: 11, title: "Sign of the Cross", text: "In the name of the Father, and of the Son, and of the Holy Spirit. Amen." },
  ];
  
  // Set audio mode to play in silent mode (iOS)
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
    });
  }, []);
  
  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);
  
  // Get the appropriate audio file based on guide and mystery type
  const getAudioFile = () => {
    try {
      if (!guideName) {
        // Default to Francis if no guide is specified
        return GUIDE_AUDIO_FILES["Francis"][mysteryKey as keyof typeof GUIDE_AUDIO_FILES["Francis"]];
      }
      
      // Check if the guide exists in our mapping
      if (GUIDE_AUDIO_FILES[guideName as keyof typeof GUIDE_AUDIO_FILES]) {
        // Check if the mystery type exists for this guide
        if (GUIDE_AUDIO_FILES[guideName as keyof typeof GUIDE_AUDIO_FILES][mysteryKey as keyof typeof GUIDE_AUDIO_FILES["Francis"]]) {
          return GUIDE_AUDIO_FILES[guideName as keyof typeof GUIDE_AUDIO_FILES][mysteryKey as keyof typeof GUIDE_AUDIO_FILES["Francis"]];
        }
      }
      
      // Fallback to default audio file if mapping doesn't exist
      return require('../../assets/audio/rosary1.mp3');
    } catch (error) {
      console.error("Error getting audio file:", error);
      return require('../../assets/audio/rosary1.mp3');
    }
  };
  
  // Toggle audio playback
  const toggleAudio = async () => {
    if (isPlaying && sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else if (sound) {
      await sound.playAsync();
      setIsPlaying(true);
    } else {
      try {
        // Load the appropriate audio file based on guide and mystery
        const audioFile = getAudioFile();
        
        const { sound: newSound } = await Audio.Sound.createAsync(
          audioFile,
          { shouldPlay: true }
        );
        
        setSound(newSound);
        setIsPlaying(true);
        
        // Set up completion listener
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      } catch (error) {
        console.error("Failed to play audio:", error);
      }
    }
  };
  
  // Move to next prayer step
  const nextPrayerStep = () => {
    if (currentPrayerStep < prayers.length - 1) {
      setCurrentPrayerStep(currentPrayerStep + 1);
      scrollViewRef.current?.scrollTo({
        y: (currentPrayerStep + 1) * 120,
        animated: true,
      });
    }
  };
  
  // Move to previous prayer step
  const prevPrayerStep = () => {
    if (currentPrayerStep > 0) {
      setCurrentPrayerStep(currentPrayerStep - 1);
      scrollViewRef.current?.scrollTo({
        y: (currentPrayerStep - 1) * 120,
        animated: true,
      });
    }
  };
  
  // Reference to scroll view for auto-scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.backgroundGradient, { backgroundColor: theme.primary }]} />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <AntDesign name="arrowleft" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{mysteryType}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.soundButton}
            onPress={toggleAudio}
            activeOpacity={0.7}
          >
            <AntDesign name={isPlaying ? "sound" : "sound"} size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Prayer Display */}
          <Animated.View 
            style={[
              styles.currentPrayerCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <View style={styles.prayerBadge}>
              <Text style={[styles.prayerBadgeText, { color: theme.primary }]}>
                {toRoman(currentPrayerStep)}
              </Text>
            </View>
            
            <View style={styles.prayerContent}>
              <Text style={styles.prayerTitle}>{prayers[currentPrayerStep].title}</Text>
              <Text style={styles.prayerText}>{prayers[currentPrayerStep].text}</Text>
            </View>
            
            <View style={styles.prayerProgressIndicator}>
              <Text style={[styles.prayerProgressText, { color: theme.primary }]}>
                {currentPrayerStep + 1} of {prayers.length}
              </Text>
            </View>
          </Animated.View>
          
          {/* Navigation Controls */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={[
                styles.navButton,
                { opacity: currentPrayerStep === 0 ? 0.5 : 1 }
              ]}
              onPress={prevPrayerStep}
              disabled={currentPrayerStep === 0}
              activeOpacity={0.8}
            >
              <AntDesign name="left" size={20} color={theme.primary} />
              <Text style={[styles.navButtonText, { color: theme.primary }]}>PREVIOUS</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.navButton,
                { opacity: currentPrayerStep === prayers.length - 1 ? 0.5 : 1 }
              ]}
              onPress={nextPrayerStep}
              disabled={currentPrayerStep === prayers.length - 1}
              activeOpacity={0.8}
            >
              <Text style={[styles.navButtonText, { color: theme.primary }]}>NEXT</Text>
              <AntDesign name="right" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
          
          {/* Rosary Beads Visualizer */}
          <View style={styles.beadsContainer}>
            <Text style={styles.sectionTitle}>Rosary Progress</Text>
            
            <View style={styles.beadsRow}>
              {Array.from({ length: 10 }).map((_, index) => (
                <View 
                  key={index}
                  style={[
                    styles.bead,
                    currentPrayerStep >= 7 && index < currentPrayerStep - 6 
                      ? { backgroundColor: theme.primary, borderColor: theme.primary }
                      : { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.3)' }
                  ]}
                />
              ))}
            </View>
          </View>
          
          {/* Audio Controls */}
          <TouchableOpacity 
            style={[styles.playButton, { backgroundColor: theme.primary }]}
            onPress={toggleAudio}
            activeOpacity={0.9}
          >
            <View style={styles.playButtonContent}>
              {isPlaying ? (
                <AntDesign name="pausecircle" size={24} color="#FFFFFF" />
              ) : (
                <AntDesign name="playcircleo" size={24} color="#FFFFFF" />
              )}
              <Text style={styles.playButtonText}>
                {isPlaying ? "PAUSE AUDIO" : "PLAY AUDIO"}
              </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.guideContainer}>
            <View style={[styles.guideChip, { backgroundColor: theme.accent }]}>
              <AntDesign name="user" size={16} color={theme.primary} />
              <Text style={[styles.guideText, { color: theme.primary }]}>
                Guide: {guideName || "Francis"}
              </Text>
            </View>
          </View>
          
          {/* Prayer List */}
          <View style={styles.prayerListContainer}>
            <Text style={styles.sectionTitle}>All Prayers</Text>
            
            {prayers.map((prayer, index) => (
              <TouchableOpacity
                key={prayer.id}
                style={[
                  styles.prayerListItem,
                  currentPrayerStep === index && [
                    styles.prayerListItemActive,
                    { borderColor: theme.primary }
                  ]
                ]}
                onPress={() => setCurrentPrayerStep(index)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.prayerListItemNumber,
                  currentPrayerStep === index 
                    ? { backgroundColor: theme.primary }
                    : { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                ]}>
                  <Text style={[
                    styles.prayerListItemNumberText,
                    currentPrayerStep === index
                      ? { color: '#FFFFFF' }
                      : { color: 'rgba(255, 255, 255, 0.8)' }
                  ]}>
                    {toRoman(index)}
                  </Text>
                </View>
                
                <View style={styles.prayerListItemContent}>
                  <Text style={styles.prayerListItemTitle}>{prayer.title}</Text>
                  <Text style={styles.prayerListItemText} numberOfLines={1}>
                    {prayer.text}
                  </Text>
                </View>
                
                {currentPrayerStep === index && (
                  <View style={[styles.currentIndicator, { backgroundColor: theme.accent }]}>
                    <AntDesign name="check" size={16} color={theme.primary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  soundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  currentPrayerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  prayerBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  prayerBadgeText: {
    fontSize: 20,
    fontWeight: "700",
  },
  prayerContent: {
    alignItems: "center",
  },
  prayerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#242424",
    textAlign: "center",
    marginBottom: 14,
  },
  prayerText: {
    fontSize: 16,
    color: "#505050",
    textAlign: "center",
    lineHeight: 24,
  },
  prayerProgressIndicator: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    alignItems: "center",
  },
  prayerProgressText: {
    fontSize: 14,
    fontWeight: "600",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: "700",
    marginHorizontal: 8,
  },
  beadsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#242424",
    marginBottom: 12,
  },
  beadsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
  },
  bead: {
    width: 22,
    height: 22,
    borderRadius: 11,
    margin: 6,
    borderWidth: 2,
  },
  playButton: {
    borderRadius: 14,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  playButtonContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  guideContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  guideChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  guideText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  prayerListContainer: {
    paddingHorizontal: 20,
  },
  prayerListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "transparent",
  },
  prayerListItemActive: {
    borderWidth: 2,
  },
  prayerListItemNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  prayerListItemNumberText: {
    fontSize: 14,
    fontWeight: "700",
  },
  prayerListItemContent: {
    flex: 1,
  },
  prayerListItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#242424",
    marginBottom: 3,
  },
  prayerListItemText: {
    fontSize: 13,
    color: "#666666",
  },
  currentIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});