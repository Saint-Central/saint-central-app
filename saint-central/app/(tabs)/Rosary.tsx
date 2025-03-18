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
  StatusBar,
  ImageBackground,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

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

// Duration Multipliers (to simulate different length audio sessions)
const DURATION_MULTIPLIERS = {
  "15 min": 1.5,    // Fastest playback for shortest duration
  "20 min": 1.0,    // Normal playback speed (unchanged)
  "25 min": 0.75,   // Slower playback for longer duration
  "30 min": 0.5,    // Slowest playback for longest duration
};

// Audio Manager Class 
class AudioManager {
    sound: Audio.Sound | null;
    isPlaying: boolean;
    currentGuide: any | null;
    currentDuration: any | null;
    playbackRate: number;
  
    constructor() {
      this.sound = null;
      this.isPlaying = false;
      this.currentGuide = null;
      this.currentDuration = null;
      this.playbackRate = 1.0;
    }

  // Set current guide
  setGuide(guide: typeof VOICE_GUIDES[number]) {
    this.currentGuide = guide;
    return this;
  }

  // Set current duration
  setDuration(duration: typeof AUDIO_DURATIONS[number]) {
    this.currentDuration = duration;
    // Set playback rate based on duration
    if (duration && duration.duration) {
      this.playbackRate = DURATION_MULTIPLIERS[duration.duration as keyof typeof DURATION_MULTIPLIERS] || 1.0;
    }
    return this;
  }

  // Get the appropriate audio file based on guide and mystery type
  getAudioFile(mysteryType: string) {
    try {
      if (!this.currentGuide) {
        // Default to Francis if no guide is selected
        return GUIDE_AUDIO_FILES["Francis"][mysteryType as keyof typeof GUIDE_AUDIO_FILES["Francis"]];
      }
      
      const guideName = this.currentGuide.name;
      
      // Check if the guide exists in our mapping
      if (GUIDE_AUDIO_FILES[guideName as keyof typeof GUIDE_AUDIO_FILES]) {
        // Check if the mystery type exists for this guide
        if (GUIDE_AUDIO_FILES[guideName as keyof typeof GUIDE_AUDIO_FILES][mysteryType as keyof typeof GUIDE_AUDIO_FILES["Francis"]]) {
          return GUIDE_AUDIO_FILES[guideName as keyof typeof GUIDE_AUDIO_FILES][mysteryType as keyof typeof GUIDE_AUDIO_FILES["Francis"]];
        }
      }
      
      // Fallback to default audio file if mapping doesn't exist
      return require('../../assets/audio/rosary1.mp3');
    } catch (error) {
      console.error("Error getting audio file:", error);
      return require('../../assets/audio/rosary1.mp3');
    }
  }

  // Play a mystery
  async playMystery(mysteryType: string, index: number) {
    try {
      // Unload any existing audio
      await this.stopAudio();
      
      // Get the appropriate audio file
      const audioFile = this.getAudioFile(mysteryType);
      
      // Create audio with the selected guide's voice
      const { sound } = await Audio.Sound.createAsync(
        audioFile,
        { 
          shouldPlay: true,
          rate: this.playbackRate, // Apply playback rate for duration adjustment
        }
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
      
      console.log(`Playing audio for ${this.currentGuide?.name} - ${mysteryType} at rate ${this.playbackRate}`);
      
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

  // Get current theme based on mystery
  const theme = getMysteryTheme(currentMysteryKey);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  useEffect(() => {
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

  // Convert mystery number to Roman numeral
  const toRoman = (num: number) => {
    const roman = ["I", "II", "III", "IV", "V"];
    return roman[num - 1] || num.toString();
  };
  
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
          
          <View style={styles.dayIndicator}>
            <Text style={styles.dayText}>{getDayName()}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => setShowMysteryPicker(true)}
            activeOpacity={0.7}
          >
            <AntDesign name="appstore-o" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <Animated.View 
            style={[
              styles.heroSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <View style={styles.mysteryBadge}>
              <FontAwesome5 name={theme.icon} size={26} color={theme.primary} />
            </View>
            
            <Text style={styles.heroTitle}>{currentMysteryType}</Text>
            
            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <AntDesign name="user" size={14} color={theme.primary} />
                <Text style={[styles.chipText, { color: theme.primary }]}>{selectedGuide.name}</Text>
              </View>
              
              <View style={styles.chip}>
                <AntDesign name="clockcircleo" size={14} color={theme.primary} />
                <Text style={[styles.chipText, { color: theme.primary }]}>{selectedDuration.duration}</Text>
              </View>
              
              <View style={[styles.chip, { marginTop: 8, backgroundColor: theme.accent }]}>
                <AntDesign name="sound" size={14} color={theme.primary} />
                <Text style={[styles.chipText, { color: theme.primary }]}>Custom Audio</Text>
              </View>
            </View>
          </Animated.View>
          
          {/* Action buttons */}
          <Animated.View 
            style={[
              styles.actionButtonsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: theme.primary }]}
              onPress={togglePlayback}
              activeOpacity={0.9}
            >
              <View style={styles.mainButtonContent}>
                {isPlaying ? (
                  <AntDesign name="pausecircle" size={26} color="#FFFFFF" />
                ) : (
                  <AntDesign name="playcircleo" size={26} color="#FFFFFF" />
                )}
                <Text style={styles.mainButtonText}>
                  {isPlaying ? "PAUSE PRAYER" : "START PRAYER"}
                </Text>
              </View>
            </TouchableOpacity>
            
            <View style={styles.secondaryButtonsRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: theme.accent }]}
                onPress={() => setShowGuidePicker(true)}
                activeOpacity={0.8}
              >
                <AntDesign name="user" size={22} color={theme.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Guide</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: theme.accent }]}
                onPress={() => setShowDurationPicker(true)}
                activeOpacity={0.8}
              >
                <AntDesign name="clockcircleo" size={22} color={theme.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Duration</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
          
          {/* Mysteries list */}
          <View style={styles.mysteriesContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Mysteries</Text>
            </View>
            
            {MYSTERIES[currentMysteryKey as keyof typeof MYSTERIES].map((mystery, index) => (
              <Animated.View 
                key={mystery.id}
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
              >
                <TouchableOpacity 
                  style={[
                    styles.mysteryCard,
                    currentMysteryIndex === index && { borderColor: theme.primary, borderWidth: 2 }
                  ]}
                  onPress={() => {
                    setCurrentMysteryIndex(index);
                    openPrayerScreen(index);
                  }}
                  activeOpacity={0.9}
                >
                  <View style={[
                    styles.mysteryCardHeader,
                    { backgroundColor: currentMysteryIndex === index ? theme.primary : '#F0F0F0' }
                  ]}>
                    <Text style={[
                      styles.mysteryNumber,
                      { color: currentMysteryIndex === index ? '#FFFFFF' : '#505050' }
                    ]}>
                      {toRoman(mystery.id)}
                    </Text>
                    
                    {currentMysteryIndex === index && isPlaying && (
                      <View style={styles.playingIndicator}>
                        <AntDesign name="sound" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.mysteryCardBody}>
                    <Text style={styles.mysteryCardTitle}>{mystery.title}</Text>
                    <Text style={styles.mysteryCardDescription} numberOfLines={2}>
                      {mystery.description}
                    </Text>
                  </View>
                  
                  <View style={[
                    styles.mysteryCardAction,
                    { backgroundColor: currentMysteryIndex === index ? theme.accent : '#F8F8F8' }
                  ]}>
                    <Text style={[
                      styles.mysteryCardActionText,
                      { color: currentMysteryIndex === index ? theme.primary : '#909090' }
                    ]}>
                      {currentMysteryIndex === index ? "CURRENTLY SELECTED" : "TAP TO SELECT"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
          
          {/* Intention Button */}
          <TouchableOpacity 
            style={[styles.intentionButton, { backgroundColor: theme.accent }]}
            activeOpacity={0.8}
          >
            <AntDesign name="heart" size={22} color={theme.primary} />
            <Text style={[styles.intentionButtonText, { color: theme.primary }]}>
              Set Prayer Intention
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
      
      {/* Guide Selection Modal */}
      <Modal
        visible={showGuidePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGuidePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Guide</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowGuidePicker(false)}
              >
                <AntDesign name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={VOICE_GUIDES}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedGuide.id === item.id && [
                      styles.modalItemSelected,
                      { backgroundColor: theme.accent }
                    ]
                  ]}
                  onPress={async () => {
                    // Store whether audio was playing before change
                    const wasPlaying = isPlaying;
                    
                    // Stop current audio
                    if (isPlaying) {
                      await audioManager.stopAudio();
                      setIsPlaying(false);
                    }
                    
                    // Set new guide
                    setSelectedGuide(item);
                    audioManager.setGuide(item);
                    
                    // If audio was playing, restart with new guide
                    if (wasPlaying) {
                      // Small delay to ensure audio manager updates
                      setTimeout(async () => {
                        await audioManager.playMystery(currentMysteryKey, currentMysteryIndex);
                        setIsPlaying(true);
                      }, 100);
                    }
                    
                    // Close modal
                    setShowGuidePicker(false);
                  }}
                >
                  <View style={[
                    styles.modalItemIcon,
                    selectedGuide.id === item.id && { backgroundColor: theme.primary }
                  ]}>
                    <AntDesign 
                      name={item.gender === "male" ? "man" : "woman"} 
                      size={20} 
                      color={selectedGuide.id === item.id ? "#FFFFFF" : "#666"} 
                    />
                  </View>
                  
                  <View style={styles.modalItemContent}>
                    <Text style={[
                      styles.modalItemTitle,
                      selectedGuide.id === item.id && { color: theme.primary, fontWeight: '700' }
                    ]}>
                      {item.name}
                    </Text>
                    <Text style={styles.modalItemSubtitle}>
                      {item.gender === "male" ? "Male Voice" : "Female Voice"}
                    </Text>
                  </View>
                  
                  {selectedGuide.id === item.id && (
                    <AntDesign name="check" size={22} color={theme.primary} />
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
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Duration</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowDurationPicker(false)}
              >
                <AntDesign name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={AUDIO_DURATIONS}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedDuration.id === item.id && [
                      styles.modalItemSelected,
                      { backgroundColor: theme.accent }
                    ]
                  ]}
                  onPress={async () => {
                    // Store whether audio was playing before change
                    const wasPlaying = isPlaying;
                    
                    // Stop current audio
                    if (isPlaying) {
                      await audioManager.stopAudio();
                      setIsPlaying(false);
                    }
                    
                    // Set new duration
                    setSelectedDuration(item);
                    audioManager.setDuration(item);
                    
                    // If audio was playing, restart with new duration
                    if (wasPlaying) {
                      // Small delay to ensure audio manager updates
                      setTimeout(async () => {
                        await audioManager.playMystery(currentMysteryKey, currentMysteryIndex);
                        setIsPlaying(true);
                      }, 100);
                    }
                    
                    // Close modal
                    setShowDurationPicker(false);
                  }}
                >
                  <View style={[
                    styles.modalItemIcon,
                    selectedDuration.id === item.id && { backgroundColor: theme.primary }
                  ]}>
                    <AntDesign 
                      name="clockcircleo" 
                      size={20} 
                      color={selectedDuration.id === item.id ? "#FFFFFF" : "#666"} 
                    />
                  </View>
                  
                  <View style={styles.modalItemContent}>
                    <Text style={[
                      styles.modalItemTitle,
                      selectedDuration.id === item.id && { color: theme.primary, fontWeight: '700' }
                    ]}>
                      {item.duration}
                    </Text>
                    <Text style={styles.modalItemSubtitle}>
                      Audio Meditation
                    </Text>
                  </View>
                  
                  {selectedDuration.id === item.id && (
                    <AntDesign name="check" size={22} color={theme.primary} />
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
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Mystery</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowMysteryPicker(false)}
              >
                <AntDesign name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={styles.modalList}>
              <TouchableOpacity
                style={[
                  styles.mysteryModalItem,
                  currentMysteryKey === "JOYFUL" && styles.mysteryModalItemSelected
                ]}
                onPress={() => changeMysteryType(MYSTERY_TYPES.JOYFUL, "JOYFUL")}
              >
                <LinearGradient
                  colors={currentMysteryKey === "JOYFUL" 
                    ? [getMysteryTheme("JOYFUL").gradientStart, getMysteryTheme("JOYFUL").gradientEnd] 
                    : ['#f0f0f0', '#f0f0f0']}
                  style={styles.mysteryModalGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.mysteryModalContent}>
                    <View style={[
                      styles.mysteryModalIcon,
                      { backgroundColor: currentMysteryKey === "JOYFUL" ? "#FFFFFF" : "#e0e0e0" }
                    ]}>
                      <FontAwesome5 
                        name="leaf" 
                        size={24} 
                        color={currentMysteryKey === "JOYFUL" 
                          ? getMysteryTheme("JOYFUL").primary 
                          : "#999"} 
                      />
                    </View>
                    
                    <View style={styles.mysteryModalTextContent}>
                      <Text style={[
                        styles.mysteryModalTitle,
                        { color: currentMysteryKey === "JOYFUL" ? "#FFFFFF" : "#333" }
                      ]}>
                        {MYSTERY_TYPES.JOYFUL}
                      </Text>
                      <Text style={[
                        styles.mysteryModalSubtitle,
                        { color: currentMysteryKey === "JOYFUL" ? "#FFFFFF" : "#777" }
                      ]}>
                        Mondays & Saturdays
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.mysteryModalItem,
                  currentMysteryKey === "SORROWFUL" && styles.mysteryModalItemSelected
                ]}
                onPress={() => changeMysteryType(MYSTERY_TYPES.SORROWFUL, "SORROWFUL")}
              >
                <LinearGradient
                  colors={currentMysteryKey === "SORROWFUL" 
                    ? [getMysteryTheme("SORROWFUL").gradientStart, getMysteryTheme("SORROWFUL").gradientEnd] 
                    : ['#f0f0f0', '#f0f0f0']}
                  style={styles.mysteryModalGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.mysteryModalContent}>
                    <View style={[
                      styles.mysteryModalIcon,
                      { backgroundColor: currentMysteryKey === "SORROWFUL" ? "#FFFFFF" : "#e0e0e0" }
                    ]}>
                      <FontAwesome5 
                        name="heart-broken" 
                        size={24} 
                        color={currentMysteryKey === "SORROWFUL" 
                          ? getMysteryTheme("SORROWFUL").primary 
                          : "#999"} 
                      />
                    </View>
                    
                    <View style={styles.mysteryModalTextContent}>
                      <Text style={[
                        styles.mysteryModalTitle,
                        { color: currentMysteryKey === "SORROWFUL" ? "#FFFFFF" : "#333" }
                      ]}>
                        {MYSTERY_TYPES.SORROWFUL}
                      </Text>
                      <Text style={[
                        styles.mysteryModalSubtitle,
                        { color: currentMysteryKey === "SORROWFUL" ? "#FFFFFF" : "#777" }
                      ]}>
                        Tuesdays & Fridays
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.mysteryModalItem,
                  currentMysteryKey === "GLORIOUS" && styles.mysteryModalItemSelected
                ]}
                onPress={() => changeMysteryType(MYSTERY_TYPES.GLORIOUS, "GLORIOUS")}
              >
                <LinearGradient
                  colors={currentMysteryKey === "GLORIOUS" 
                    ? [getMysteryTheme("GLORIOUS").gradientStart, getMysteryTheme("GLORIOUS").gradientEnd] 
                    : ['#f0f0f0', '#f0f0f0']}
                  style={styles.mysteryModalGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.mysteryModalContent}>
                    <View style={[
                      styles.mysteryModalIcon,
                      { backgroundColor: currentMysteryKey === "GLORIOUS" ? "#FFFFFF" : "#e0e0e0" }
                    ]}>
                      <FontAwesome5 
                        name="crown" 
                        size={24} 
                        color={currentMysteryKey === "GLORIOUS" 
                          ? getMysteryTheme("GLORIOUS").primary 
                          : "#999"} 
                      />
                    </View>
                    
                    <View style={styles.mysteryModalTextContent}>
                      <Text style={[
                        styles.mysteryModalTitle,
                        { color: currentMysteryKey === "GLORIOUS" ? "#FFFFFF" : "#333" }
                      ]}>
                        {MYSTERY_TYPES.GLORIOUS}
                      </Text>
                      <Text style={[
                        styles.mysteryModalSubtitle,
                        { color: currentMysteryKey === "GLORIOUS" ? "#FFFFFF" : "#777" }
                      ]}>
                        Wednesdays & Sundays
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.mysteryModalItem,
                  currentMysteryKey === "LUMINOUS" && styles.mysteryModalItemSelected
                ]}
                onPress={() => changeMysteryType(MYSTERY_TYPES.LUMINOUS, "LUMINOUS")}
              >
                <LinearGradient
                  colors={currentMysteryKey === "LUMINOUS" 
                    ? [getMysteryTheme("LUMINOUS").gradientStart, getMysteryTheme("LUMINOUS").gradientEnd] 
                    : ['#f0f0f0', '#f0f0f0']}
                  style={styles.mysteryModalGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.mysteryModalContent}>
                    <View style={[
                      styles.mysteryModalIcon,
                      { backgroundColor: currentMysteryKey === "LUMINOUS" ? "#FFFFFF" : "#e0e0e0" }
                    ]}>
                      <FontAwesome5 
                        name="star" 
                        size={24} 
                        color={currentMysteryKey === "LUMINOUS" 
                          ? getMysteryTheme("LUMINOUS").primary 
                          : "#999"} 
                      />
                    </View>
                    
                    <View style={styles.mysteryModalTextContent}>
                      <Text style={[
                        styles.mysteryModalTitle,
                        { color: currentMysteryKey === "LUMINOUS" ? "#FFFFFF" : "#333" }
                      ]}>
                        {MYSTERY_TYPES.LUMINOUS}
                      </Text>
                      <Text style={[
                        styles.mysteryModalSubtitle,
                        { color: currentMysteryKey === "LUMINOUS" ? "#FFFFFF" : "#777" }
                      ]}>
                        Thursdays
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    backgroundColor: "transparent",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  dayIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
  },
  dayText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  menuButton: {
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
  heroSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  mysteryBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 5,
  },
  actionButtonsContainer: {
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 24,
    zIndex: 10,
  },
  mainButton: {
    borderRadius: 16,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 14,
  },
  mainButtonContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  mainButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  secondaryButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  mysteriesContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#242424",
  },
  mysteryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  mysteryCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  mysteryNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  playingIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  mysteryCardBody: {
    padding: 16,
  },
  mysteryCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#242424",
    marginBottom: 6,
  },
  mysteryCardDescription: {
    fontSize: 15,
    color: "#666666",
    lineHeight: 22,
  },
  mysteryCardAction: {
    paddingVertical: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  mysteryCardActionText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  intentionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  intentionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#242424",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  modalList: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalItemSelected: {
    borderRadius: 12,
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  modalItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#242424",
    marginBottom: 2,
  },
  modalItemSubtitle: {
    fontSize: 14,
    color: "#777777",
  },
  mysteryModalItem: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  mysteryModalItemSelected: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mysteryModalGradient: {
    borderRadius: 16,
  },
  mysteryModalContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  mysteryModalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  mysteryModalTextContent: {
    flex: 1,
  },
  mysteryModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  mysteryModalSubtitle: {
    fontSize: 14,
  }
});