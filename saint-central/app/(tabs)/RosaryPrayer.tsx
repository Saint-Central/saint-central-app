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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Audio } from "expo-av";

const { width } = Dimensions.get("window");

export default function RosaryPrayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Get parameters from navigation
  const { mysteryType, mysteryKey, mysteryIndex, mysteryTitle, mysteryDescription, guideName } = params;
  
  // State for prayer interface
  const [currentPrayerStep, setCurrentPrayerStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
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
        // Load the audio file - using the correct filename
        const { sound: newSound } = await Audio.Sound.createAsync(
          require('../../assets/audio/rosary1.mp3'),
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
      // Scroll to the next prayer
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
      // Scroll to the previous prayer
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
      <SafeAreaView style={styles.safeArea}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>{mysteryType}</Text>
          
          <TouchableOpacity
            style={styles.audioButton}
            onPress={toggleAudio}
          >
            <Feather name={isPlaying ? "volume-2" : "volume-x"} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        {/* Current prayer display */}
        <View style={styles.currentPrayerContainer}>
          <Text style={styles.currentPrayerTitle}>
            {prayers[currentPrayerStep].title}
          </Text>
          <Text style={styles.currentPrayerText}>
            {prayers[currentPrayerStep].text}
          </Text>
        </View>
        
        {/* Prayer navigation controls */}
        <View style={styles.navigationControls}>
          <TouchableOpacity
            style={[styles.navButton, currentPrayerStep === 0 && styles.navButtonDisabled]}
            onPress={prevPrayerStep}
            disabled={currentPrayerStep === 0}
          >
            <Feather 
              name="chevron-left" 
              size={24} 
              color={currentPrayerStep === 0 ? "rgba(255,255,255,0.3)" : "#FFFFFF"} 
            />
            <Text 
              style={[
                styles.navButtonText, 
                currentPrayerStep === 0 && styles.navButtonTextDisabled
              ]}
            >
              Previous
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.prayerProgress}>
            {currentPrayerStep + 1} / {prayers.length}
          </Text>
          
          <TouchableOpacity
            style={[
              styles.navButton, 
              currentPrayerStep === prayers.length - 1 && styles.navButtonDisabled
            ]}
            onPress={nextPrayerStep}
            disabled={currentPrayerStep === prayers.length - 1}
          >
            <Text 
              style={[
                styles.navButtonText, 
                currentPrayerStep === prayers.length - 1 && styles.navButtonTextDisabled
              ]}
            >
              Next
            </Text>
            <Feather 
              name="chevron-right" 
              size={24} 
              color={currentPrayerStep === prayers.length - 1 ? "rgba(255,255,255,0.3)" : "#FFFFFF"} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Rosary beads visualizer */}
        <View style={styles.beadsVisualizerContainer}>
          <View style={styles.beadsProgress}>
            {Array.from({ length: 10 }).map((_, index) => (
              <View 
                key={index}
                style={[
                  styles.bead,
                  currentPrayerStep >= 7 && index < currentPrayerStep - 6 && styles.beadActive
                ]}
              />
            ))}
          </View>
        </View>
        
        {/* Audio controls */}
        <View style={styles.audioControlsContainer}>
          <TouchableOpacity 
            style={styles.playButton}
            onPress={toggleAudio}
          >
            <Feather name={isPlaying ? "pause" : "play"} size={24} color="#513C28" />
            <Text style={styles.playButtonText}>
              {isPlaying ? "Pause Audio" : "Play Audio"}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.guideText}>
            Guide: {guideName || "Francis"}
          </Text>
        </View>
        
        {/* All prayers scrollable list */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.prayersListContainer}
          contentContainerStyle={styles.prayersList}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => {
            scrollY.setValue(event.nativeEvent.contentOffset.y);
          }}
        >
          {prayers.map((prayer, index) => (
            <TouchableOpacity
              key={prayer.id}
              style={[
                styles.prayerItem,
                currentPrayerStep === index && styles.prayerItemActive
              ]}
              onPress={() => setCurrentPrayerStep(index)}
            >
              <Text style={styles.prayerItemTitle}>{prayer.title}</Text>
              <Text 
                style={styles.prayerItemText}
                numberOfLines={2}
              >
                {prayer.text}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1C1E",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  audioButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  currentPrayerContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    margin: 16,
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  currentPrayerTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
  },
  currentPrayerText: {
    fontSize: 18,
    color: "#FFFFFF",
    lineHeight: 26,
    textAlign: "center",
  },
  navigationControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 20,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginHorizontal: 5,
  },
  navButtonTextDisabled: {
    color: "rgba(255, 255, 255, 0.5)",
  },
  prayerProgress: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  beadsVisualizerContainer: {
    alignItems: "center",
    marginVertical: 15,
  },
  beadsProgress: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    width: width * 0.8,
  },
  bead: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    margin: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  beadActive: {
    backgroundColor: "#E9967A",
    borderColor: "#FFFFFF",
  },
  audioControlsContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  playButton: {
    flexDirection: "row",
    backgroundColor: "#FAC898",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  playButtonText: {
    fontSize: 16,
    color: "#513C28",
    fontWeight: "600",
    marginLeft: 8,
  },
  guideText: {
    fontSize: 14,
    color: "#FFFFFF",
    marginTop: 5,
  },
  prayersListContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  prayersList: {
    paddingBottom: 30,
  },
  prayerItem: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  prayerItemActive: {
    borderColor: "#E9967A",
    backgroundColor: "rgba(233, 150, 122, 0.15)",
  },
  prayerItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  prayerItemText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
});
