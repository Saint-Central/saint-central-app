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
  Modal,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";

const { width } = Dimensions.get("window");

// Mystery types
const MYSTERY_TYPES = {
  JOYFUL: "Joyful Mysteries",
  SORROWFUL: "Sorrowful Mysteries",
  GLORIOUS: "Glorious Mysteries",
  LUMINOUS: "Luminous Mysteries",
};

// Define voice guides
const VOICE_GUIDES = [
  { id: 1, name: "Francis", gender: "male" },
  { id: 2, name: "Claire", gender: "female" },
  { id: 3, name: "Thomas", gender: "male" },
  { id: 4, name: "Maria", gender: "female" },
];

// Define audio durations
const AUDIO_DURATIONS = [
  { id: 1, duration: "15 min" },
  { id: 2, duration: "20 min" },
  { id: 3, duration: "25 min" },
  { id: 4, duration: "30 min" },
];

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

// Audio Manager Class 
class AudioManager {
    sound: Audio.Sound | null;
    isPlaying: boolean;
    currentGuide: any | null;
    currentDuration: any | null;
  
    constructor() {
      this.sound = null;
      this.isPlaying = false;
      this.currentGuide = null;
      this.currentDuration = null;
    }

  // Set current guide
  setGuide(guide: typeof VOICE_GUIDES[number]) {
    this.currentGuide = guide;
    return this;
  }

  // Set current duration
  setDuration(duration: typeof AUDIO_DURATIONS[number]) {
    this.currentDuration = duration;
    return this;
  }

  // Play a mystery
  async playMystery(mysteryType: string, index: number) {
    try {
      // Unload any existing audio
      await this.stopAudio();
      
      // For demo purposes, we'll use a sample audio file
      // In a real app, you would load the appropriate file based on the guide, duration, and mystery
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/audio/rosary1.mp3'),
        { shouldPlay: true }
      );
      
      this.sound = sound;
      this.isPlaying = true;
      
      // Set up completion listener
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.isPlaying = false;
          this.sound = null;
        }
      });
      
      return true;
    } catch (error) {
      console.error("Failed to play audio:", error);
      return false;
    }
  }
  
  // Pause audio
  async pauseAudio() {
    if (this.sound && this.isPlaying) {
      await this.sound.pauseAsync();
      this.isPlaying = false;
      return true;
    }
    return false;
  }
  
  // Resume audio
  async resumeAudio() {
    if (this.sound && !this.isPlaying) {
      await this.sound.playAsync();
      this.isPlaying = true;
      return true;
    }
    return false;
  }
  
  // Stop and unload audio
  async stopAudio() {
    if (this.sound) {
      if (this.isPlaying) {
        await this.sound.stopAsync();
      }
      await this.sound.unloadAsync();
      this.sound = null;
      this.isPlaying = false;
      return true;
    }
    return false;
  }
}

// Create audio manager instance
const audioManager = new AudioManager();

export default function RosaryScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Get the day's mystery
  const dayMystery = getDayMystery();
  
  // State management
  const [currentMysteryType, setCurrentMysteryType] = useState(dayMystery.type);
  const [currentMysteryKey, setCurrentMysteryKey] = useState(dayMystery.key);
  const [selectedGuide, setSelectedGuide] = useState(VOICE_GUIDES[0]);
  const [selectedDuration, setSelectedDuration] = useState(AUDIO_DURATIONS[1]); // Default 20 min
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMysteryIndex, setCurrentMysteryIndex] = useState(0);
  const [showGuidePicker, setShowGuidePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showMysteryPicker, setShowMysteryPicker] = useState(false);

  // Set audio mode to play in silent mode (iOS)
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
    });
  }, []);
  
  // Initialize audio manager
  useEffect(() => {
    audioManager.setGuide(selectedGuide);
    audioManager.setDuration(selectedDuration);
    
    // Clean up audio on unmount
    return () => {
      audioManager.stopAudio();
    };
  }, []);
  
  // Update audio manager when guide or duration changes
  useEffect(() => {
    audioManager.setGuide(selectedGuide);
  }, [selectedGuide]);
  
  useEffect(() => {
    audioManager.setDuration(selectedDuration);
  }, [selectedDuration]);
  
  // Play/pause audio
  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        await audioManager.pauseAudio();
        setIsPlaying(false);
      } else {
        const result = await audioManager.resumeAudio();
        if (!result) {
          // If no audio is loaded, play the mystery
          await audioManager.playMystery(currentMysteryKey, currentMysteryIndex);
        }
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Failed to toggle playback:", error);
    }
  };
  
  // Change mystery type
  const changeMysteryType = (mysteryType: string, mysteryKey: string) => {
    audioManager.stopAudio();
    setIsPlaying(false);
    setCurrentMysteryType(mysteryType);
    setCurrentMysteryKey(mysteryKey);
    setCurrentMysteryIndex(0);
    setShowMysteryPicker(false);
  };
  
  // Navigate to prayer screen
  const openPrayerScreen = (index: number) => {
    const mystery = MYSTERIES[currentMysteryKey as keyof typeof MYSTERIES][index];
    // Stop current audio before navigating
    audioManager.stopAudio();
    setIsPlaying(false);
    
    // Navigate to prayer screen with params
    router.push({
      pathname: "/RosaryPrayer",
      params: {
        mysteryType: currentMysteryType,
        mysteryKey: currentMysteryKey,
        mysteryIndex: index,
        mysteryTitle: mystery.title,
        mysteryDescription: mystery.description,
        guideName: selectedGuide.name
      }
    });
  };
  
  // Get today's day name
  const getDayName = () => {
    return new Date().toLocaleString('default', { weekday: 'long' });
  };
  
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
          
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowMysteryPicker(true)}
          >
            <Feather name="more-vertical" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
        >
          {/* Main Rosary Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.dayTitle}>{getDayName()} Daily Rosary</Text>
            <Text style={styles.mysteryTypeTitle}>{currentMysteryType}</Text>
          </View>
          
          {/* Selection Controls */}
          <View style={styles.selectionControlsContainer}>
            {/* Guide Selection */}
            <TouchableOpacity 
              style={styles.selectionControl}
              onPress={() => setShowGuidePicker(true)}
            >
              <Text style={styles.selectionLabel}>Guide</Text>
              <View style={styles.selectionValueContainer}>
                <Text style={styles.selectionValue}>{selectedGuide.name}</Text>
                <Feather name="chevron-down" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            
            {/* Duration Selection */}
            <TouchableOpacity 
              style={styles.selectionControl}
              onPress={() => setShowDurationPicker(true)}
            >
              <Text style={styles.selectionLabel}>Media Options</Text>
              <View style={styles.selectionValueContainer}>
                <Text style={styles.selectionValue}>{selectedDuration.duration} • Audio</Text>
                <Feather name="chevron-down" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.playButton}
              onPress={togglePlayback}
            >
              <Feather name={isPlaying ? "pause" : "play"} size={24} color="#513C28" />
              <Text style={styles.playButtonText}>
                {isPlaying ? "Pause Session" : "Play Session"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.intentionButton}>
              <Feather name="heart" size={24} color="#FFFFFF" />
              <Text style={styles.intentionButtonText}>Pray for an Intention</Text>
            </TouchableOpacity>
          </View>
          
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>
              Today we'll meditate on the five {currentMysteryType.toLowerCase()}.
            </Text>
          </View>
          
          {/* Mysteries Section */}
          <View style={styles.mysteriesContainer}>
            <Text style={styles.sectionTitle}>Mysteries</Text>
            
            {/* List of mysteries */}
            {MYSTERIES[currentMysteryKey as keyof typeof MYSTERIES].map((mystery, index) => (
              <TouchableOpacity 
                key={mystery.id}
                style={[
                  styles.mysteryItem,
                  currentMysteryIndex === index && styles.mysteryItemActive
                ]}
                onPress={() => {
                  setCurrentMysteryIndex(index);
                  openPrayerScreen(index);
                }}
              >
                <View style={styles.mysteryNumberContainer}>
                  <Text style={styles.mysteryNumber}>{mystery.id}</Text>
                </View>
                <View style={styles.mysteryTextContainer}>
                  <Text style={styles.mysteryTitle}>{mystery.title}</Text>
                  {currentMysteryIndex === index && 
                    <Text style={styles.mysteryDescription}>{mystery.description}</Text>
                  }
                </View>
                {currentMysteryIndex === index && isPlaying && (
                  <Feather name="volume-2" size={20} color="#E9967A" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
      
      {/* Guide Selection Modal */}
      <Modal
        visible={showGuidePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGuidePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Guide</Text>
              <TouchableOpacity onPress={() => setShowGuidePicker(false)}>
                <Feather name="x" size={24} color="#513C28" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={VOICE_GUIDES}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedGuide.id === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setSelectedGuide(item);
                    setShowGuidePicker(false);
                    // Stop current audio if playing
                    if (isPlaying) {
                      audioManager.stopAudio();
                      setIsPlaying(false);
                    }
                  }}
                >
                  <View style={styles.modalItemContent}>
                    <Text style={styles.modalItemTitle}>{item.name}</Text>
                    <Text style={styles.modalItemSubtitle}>{item.gender}</Text>
                  </View>
                  {selectedGuide.id === item.id && (
                    <Feather name="check" size={20} color="#E9967A" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
      
      {/* Duration Selection Modal */}
      <Modal
        visible={showDurationPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDurationPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Duration</Text>
              <TouchableOpacity onPress={() => setShowDurationPicker(false)}>
                <Feather name="x" size={24} color="#513C28" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={AUDIO_DURATIONS}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedDuration.id === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setSelectedDuration(item);
                    setShowDurationPicker(false);
                    // Stop current audio if playing as duration change will affect playback
                    if (isPlaying) {
                      audioManager.stopAudio();
                      setIsPlaying(false);
                    }
                  }}
                >
                  <Text style={styles.modalItemTitle}>{item.duration}</Text>
                  {selectedDuration.id === item.id && (
                    <Feather name="check" size={20} color="#E9967A" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
      
      {/* Mystery Type Selection Modal */}
      <Modal
        visible={showMysteryPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMysteryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Mystery</Text>
              <TouchableOpacity onPress={() => setShowMysteryPicker(false)}>
                <Feather name="x" size={24} color="#513C28" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[
                styles.modalItem,
                currentMysteryKey === "JOYFUL" && styles.modalItemSelected
              ]}
              onPress={() => changeMysteryType(MYSTERY_TYPES.JOYFUL, "JOYFUL")}
            >
              <Text style={styles.modalItemTitle}>{MYSTERY_TYPES.JOYFUL}</Text>
              {currentMysteryKey === "JOYFUL" && (
                <Feather name="check" size={20} color="#E9967A" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalItem,
                currentMysteryKey === "SORROWFUL" && styles.modalItemSelected
              ]}
              onPress={() => changeMysteryType(MYSTERY_TYPES.SORROWFUL, "SORROWFUL")}
            >
              <Text style={styles.modalItemTitle}>{MYSTERY_TYPES.SORROWFUL}</Text>
              {currentMysteryKey === "SORROWFUL" && (
                <Feather name="check" size={20} color="#E9967A" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalItem,
                currentMysteryKey === "GLORIOUS" && styles.modalItemSelected
              ]}
              onPress={() => changeMysteryType(MYSTERY_TYPES.GLORIOUS, "GLORIOUS")}
            >
              <Text style={styles.modalItemTitle}>{MYSTERY_TYPES.GLORIOUS}</Text>
              {currentMysteryKey === "GLORIOUS" && (
                <Feather name="check" size={20} color="#E9967A" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalItem,
                currentMysteryKey === "LUMINOUS" && styles.modalItemSelected
              ]}
              onPress={() => changeMysteryType(MYSTERY_TYPES.LUMINOUS, "LUMINOUS")}
            >
              <Text style={styles.modalItemTitle}>{MYSTERY_TYPES.LUMINOUS}</Text>
              {currentMysteryKey === "LUMINOUS" && (
                <Feather name="check" size={20} color="#E9967A" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  titleContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 32,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  mysteryTypeTitle: {
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 8,
  },
  selectionControlsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 20,
  },
  selectionControl: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  selectionLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.7,
    marginBottom: 5,
  },
  selectionValueContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectionValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  actionButtonsContainer: {
    marginTop: 20,
    marginHorizontal: 20,
  },
  playButton: {
    flexDirection: "row",
    backgroundColor: "#FAC898",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  playButtonText: {
    fontSize: 18,
    color: "#513C28",
    fontWeight: "600",
    marginLeft: 10,
  },
  intentionButton: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  intentionButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "500",
    marginLeft: 10,
  },
  descriptionContainer: {
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 18,
    color: "#FFFFFF",
    lineHeight: 24,
  },
  mysteriesContainer: {
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 15,
  },
  mysteryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  mysteryItemActive: {
    borderColor: "#E9967A",
    backgroundColor: "rgba(233, 150, 122, 0.15)",
  },
  mysteryNumberContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  mysteryNumber: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  mysteryTextContainer: {
    flex: 1,
  },
  mysteryTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  mysteryDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    maxHeight: width * 1.3,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#513C28",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  modalItemSelected: {
    backgroundColor: "rgba(233, 150, 122, 0.1)",
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 18,
    color: "#513C28",
  },
  modalItemSubtitle: {
    fontSize: 14,
    color: "#513C28",
    opacity: 0.7,
  },
});
