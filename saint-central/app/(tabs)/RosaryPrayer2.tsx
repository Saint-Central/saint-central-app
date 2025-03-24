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
  Modal,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

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

// Guide Audio Mapping
const GUIDE_AUDIO_FILES = {
  "Francis": {
    INTRODUCTION: require('../../assets/audio/rosary1.mp3'),
    JOYFUL: require('../../assets/audio/rosary1.mp3'),
    SORROWFUL: require('../../assets/audio/rosary1.mp3'),
    GLORIOUS: require('../../assets/audio/rosary1.mp3'),
    LUMINOUS: require('../../assets/audio/rosary1.mp3'),
  },
  "Claire": {
    INTRODUCTION: require('../../assets/audio/rosary2.mp3'),
    JOYFUL: require('../../assets/audio/rosary2.mp3'),
    SORROWFUL: require('../../assets/audio/rosary2.mp3'),
    GLORIOUS: require('../../assets/audio/rosary2.mp3'),
    LUMINOUS: require('../../assets/audio/rosary2.mp3'),
  },
  "Thomas": {
    INTRODUCTION: require('../../assets/audio/rosary1.mp3'),
    JOYFUL: require('../../assets/audio/rosary1.mp3'),
    SORROWFUL: require('../../assets/audio/rosary1.mp3'),
    GLORIOUS: require('../../assets/audio/rosary1.mp3'),
    LUMINOUS: require('../../assets/audio/rosary1.mp3'),
  },
  "Maria": {
    INTRODUCTION: require('../../assets/audio/rosary1.mp3'),
    JOYFUL: require('../../assets/audio/rosary1.mp3'),
    SORROWFUL: require('../../assets/audio/rosary1.mp3'),
    GLORIOUS: require('../../assets/audio/rosary1.mp3'),
    LUMINOUS: require('../../assets/audio/rosary1.mp3'),
  },
};

// Duration Multipliers
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
    currentMysteryType: string;
    currentMysteryIndex: number;
    currentPosition: number;
    totalDuration: number;
    isTransitioning: boolean;
    newSound: Audio.Sound | null;
    playbackStatusListener: any;
    onPlaybackStatusUpdate: ((status: any) => void) | null;
    
    constructor() {
      this.sound = null;
      this.newSound = null;
      this.isPlaying = false;
      this.currentGuide = null;
      this.currentDuration = null;
      this.playbackRate = 1.0;
      this.currentMysteryType = "";
      this.currentMysteryIndex = 0;
      this.currentPosition = 0;
      this.totalDuration = 0;
      this.isTransitioning = false;
      this.playbackStatusListener = null;
      this.onPlaybackStatusUpdate = null;
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

  // Save current audio position
  async saveCurrentPosition() {
    if (this.sound) {
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded) {
        this.currentPosition = status.positionMillis;
        return true;
      }
    }
    return false;
  }

  // Register playback status update callback
  registerPlaybackCallback(callback: (status: any) => void) {
    this.onPlaybackStatusUpdate = callback;
    // Apply to current sound if exists
    if (this.sound) {
      this.updateSoundStatusListener(this.sound);
    }
  }

  // Update sound status listener
  updateSoundStatusListener(sound: Audio.Sound) {
    // Set up a more frequent update interval (100ms)
    sound.setOnPlaybackStatusUpdate((status) => {
      // Update internal state
      if (status.isLoaded) {
        // Always update position for accurate tracking
        this.currentPosition = status.positionMillis;
        this.totalDuration = status.durationMillis ?? 0;
        
        // Update playing state
        this.isPlaying = status.isPlaying;
        
        if (status.didJustFinish) {
          this.isPlaying = false;
          this.sound = null;
        }
      }
      
      // Call external callback if registered
      if (this.onPlaybackStatusUpdate) {
        this.onPlaybackStatusUpdate(status);
      }
    });
    
    // Request more frequent position updates for smoother UI
    sound.setProgressUpdateIntervalAsync(100); // Update every 100ms
  }

  // Get current progress as a percentage
  getProgress() {
    if (this.totalDuration === 0) return 0;
    return this.currentPosition / this.totalDuration;
  }

  // Seek to a specific position in milliseconds
  async seekTo(positionMillis: number) {
    if (!this.sound) return false;
    
    try {
      // Update internal position immediately for responsive UI
      this.currentPosition = positionMillis;
      
      // Perform the actual seek
      await this.sound.setPositionAsync(positionMillis);
      
      // Immediately trigger a status update to refresh UI
      const status = await this.sound.getStatusAsync();
      if (this.onPlaybackStatusUpdate && status.isLoaded) {
        this.onPlaybackStatusUpdate(status);
      }
      
      return true;
    } catch (error) {
      console.error("Failed to seek:", error);
      return false;
    }
  }

  // Seek to a percentage of the total duration
  async seekToPercentage(percentage: number) {
    if (!this.sound || this.totalDuration === 0) return false;
    
    const positionMillis = Math.floor(percentage * this.totalDuration);
    return this.seekTo(positionMillis);
  }

  // Play a mystery
  async playMystery(mysteryType: string, index: number) {
    try {
      // Unload any existing audio
      await this.stopAudio();
      
      // Save current mystery type and index
      this.currentMysteryType = mysteryType;
      this.currentMysteryIndex = index;
      
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
      
      // Set up status listener
      this.updateSoundStatusListener(sound);
      
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

  // Advanced method to seek to specific prayer phrase
  async seekToKeyPhrase(phrase: string, startPositionMs = 0, endPositionMs?: number): Promise<boolean> {
    if (!this.sound) return false;
    
    try {
      // In a real implementation, this would use speech recognition on audio segments
      // to find the exact position of the phrase. For this example, we'll simulate with
      // predetermined mappings and add a small delay to simulate processing.
      
      // Here we would analyze the audio from startPosition to endPosition
      // looking for the specified phrase
      
      // Instead, we'll just use our lookup values based on the phrase
      // This is where real voice recognition would happen in a production app
      const foundPosition = startPositionMs;
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Perform the seek
      await this.seekTo(foundPosition);
      
      return true;
    } catch (error) {
      console.error("Failed to seek to phrase:", error);
      return false;
    }
  }
  
  // Smooth guide transition method
  async smoothTransitionToGuide(newGuide: typeof VOICE_GUIDES[number], onTransitionProgress?: (progress: number) => void) {
    try {
      // Don't do anything if we're already transitioning or not playing
      if (this.isTransitioning || !this.isPlaying || !this.sound) {
        if (!this.isPlaying) {
          // If not playing, just set the guide and return
          this.setGuide(newGuide);
          return true;
        }
        return false;
      }

      // Set flag to indicate we're transitioning
      this.isTransitioning = true;
      
      // Save current guide for reference
      const oldGuide = this.currentGuide;
      
      // Get current playback position and status
      await this.saveCurrentPosition();
      const status = await this.sound.getStatusAsync();
      const wasPlaying = status.isLoaded && status.isPlaying;
      
      // Set the new guide but don't modify the current sound yet
      this.setGuide(newGuide);
      
      // Load new audio file
      const audioFile = this.getAudioFile(this.currentMysteryType);
      
      // Create new audio with the selected guide's voice but don't play yet
      const { sound: newSound } = await Audio.Sound.createAsync(
        audioFile,
        { 
          shouldPlay: false,
          rate: this.playbackRate,
        }
      );
      
      this.newSound = newSound;
      
      // Set position of new audio to match current position
      await newSound.setPositionAsync(this.currentPosition);
      
      // Set up status listener for new sound
      this.updateSoundStatusListener(newSound);
      
      // If original sound wasn't playing, don't play the new one either
      if (!wasPlaying) {
        // Swap sounds without starting playback
        if (this.sound) {
          await this.sound.unloadAsync();
        }
        this.sound = this.newSound;
        this.newSound = null;
        this.isTransitioning = false;
        return true;
      }
      
      // Start playing new audio but with volume 0
      await newSound.setVolumeAsync(0);
      await newSound.playAsync();
      
      // Crossfade - 1.5 seconds
      const steps = 15; // 100ms per step
      const volumeStep = 1 / steps;
      
      // Perform the crossfade
      for (let i = 0; i <= steps; i++) {
        const oldVolume = 1 - (i * volumeStep);
        const newVolume = i * volumeStep;
        
        // Update volumes
        if (this.sound) {
          await this.sound.setVolumeAsync(oldVolume);
        }
        if (this.newSound) {
          await this.newSound.setVolumeAsync(newVolume);
        }
        
        // Update progress callback if provided
        if (onTransitionProgress) {
          onTransitionProgress(i / steps);
        }
        
        // Wait 100ms between steps
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Cleanup - stop and unload old audio
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      }
      
      // Make new sound the current sound
      this.sound = this.newSound;
      this.newSound = null;
      
      // Reset flag
      this.isTransitioning = false;
      
      console.log(`Smoothly transitioned from ${oldGuide?.name} to ${newGuide.name} at position ${this.currentPosition}ms`);
      return true;
    } catch (error) {
      console.error("Failed to smoothly transition:", error);
      
      // Attempt recovery
      this.isTransitioning = false;
      if (this.newSound) {
        try {
          await this.newSound.stopAsync();
          await this.newSound.unloadAsync();
          this.newSound = null;
        } catch (err) {
          console.error("Error cleaning up after failed transition:", err);
        }
      }
      
      return false;
    }
  }
}

// Create audio manager instance
const audioManager = new AudioManager();

// Get mystery theme color
const getMysteryTheme = (mysteryKey: string) => {
  switch (mysteryKey) {
    case "INTRODUCTION":
      return {
        primary: "#4A90E2",
        secondary: "#2E78CD",
        accent: "#E8F4FF",
        gradientStart: "#4A90E2",
        gradientEnd: "#2E78CD",
        icon: "info-circle",
      };
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
  const sliderWidth = useRef(1);
  
  // Get parameters from navigation
  const { mysteryType, mysteryKey, mysteryIndex, mysteryTitle, mysteryDescription, guideName } = params;
  
  // Get theme based on mystery type
  const theme = getMysteryTheme(mysteryKey as string);
  
  // State for prayer interface
  const [currentPrayerStep, setCurrentPrayerStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  
  // UI state for prayer seeking
  const [seekingPrayer, setSeekingPrayer] = useState(false);
  const [seekingPrayerName, setSeekingPrayerName] = useState("");
  
  // New audio control states
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [isSeekBarVisible, setIsSeekBarVisible] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState(() => {
    // Find the guide by name or default to Francis
    return VOICE_GUIDES.find(g => g.name === guideName) || VOICE_GUIDES[0];
  });
  const [selectedDuration, setSelectedDuration] = useState(AUDIO_DURATIONS[1]); // Default 20 min
  const [showGuidePicker, setShowGuidePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  
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
  
  // Define prayers for the rosary (shortened versions for card display)
  const prayers = mysteryType === "The Visitation" 
    ? [
        { id: 0, title: "Sign of the Cross", text: "In the name of the Father, and of the Son, and of the Holy Spirit. Amen." },
        { id: 1, title: "Apostles' Creed", text: "I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, his only Son, our Lord..." },
        { id: 2, title: "Our Father", text: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven..." },
        { id: 3, title: "Hail Mary (1)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
        { id: 4, title: "Hail Mary (2)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
        { id: 5, title: "Hail Mary (3)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
        { id: 6, title: "Glory Be", text: "Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be..." },
        { id: 7, title: "Fatima Prayer", text: "O my Jesus, forgive us our sins, save us from the fires of hell, lead all souls to Heaven, especially those in most need of Thy mercy." },
      ]
    : [
      { id: 5, title: "First Mystery: The Annunciation", text: "The angel Gabriel was sent from God to a city of Galilee named Nazareth, to a virgin betrothed to a man whose name was Joseph, of the house of David; and the virgin's name was Mary. And he came to her and said, 'Hail, full of grace, the Lord is with you!' (Luke 1:26-28)" },
        { id: 6, title: "Our Father", text: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven..." },
        { id: 7, title: "Hail Mary (1)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
        { id: 8, title: "Hail Mary (2)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
        { id: 9, title: "Hail Mary (3)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
        { id: 10, title: "Hail Mary (4)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
        { id: 11, title: "Hail Mary (5)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
        { id: 12, title: "Hail Mary (6)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
        { id: 13, title: "Hail Mary (7)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
        { id: 14, title: "Hail Mary (8)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
        { id: 15, title: "Hail Mary (9)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
        { id: 16, title: "Hail Mary (10)", text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus..." },
        { id: 17, title: "Glory Be", text: "Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be..." },
        { id: 18, title: "Fatima Prayer", text: "O my Jesus, forgive us our sins, save us from the fires of hell, lead all souls to Heaven, especially those in most need of Thy mercy." },
      ];
      
// Removed duplicate declaration of prayers
  
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
    
    // Register playback status update callback
    audioManager.registerPlaybackCallback((status) => {
      if (status.isLoaded) {
        if (!isSeeking) {
          setCurrentPosition(status.positionMillis);
        }
        setTotalDuration(status.durationMillis);
        
        // Auto-show seek bar when audio is playing
        if (status.isPlaying && !isSeekBarVisible) {
          setIsSeekBarVisible(true);
        }
      }
    });
    
    // Clean up audio when component unmounts
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
  
  // Toggle audio playback
  const toggleAudio = async () => {
    try {
      if (isPlaying) {
        await audioManager.pauseAudio();
        setIsPlaying(false);
      } else {
        const result = await audioManager.resumeAudio();
        if (!result) {
          // If no audio is loaded, play the mystery
          await audioManager.playMystery(mysteryKey as string, parseInt(mysteryIndex as string));
        }
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Failed to toggle playback:", error);
    }
  };
  
  // Format time in MM:SS format
  const formatTime = (milliseconds: number) => {
    if (!milliseconds) return "00:00";
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Handle seek start
  const handleSeekStart = () => {
    setIsSeeking(true);
    setSeekPosition(currentPosition);
  };
  
  // Handle seek movement
  const handleSeekMove = (value: number) => {
    setSeekPosition(value);
  };
  
  // Handle seek complete
  const handleSeekComplete = async () => {
    const newPosition = seekPosition;
    setCurrentPosition(newPosition);
    setIsSeeking(false);
    
    // Seek in the audio
    await audioManager.seekTo(newPosition);
  };
  
  // Skip forward 30 seconds
  const skipForward = async () => {
    // Show visual feedback
    setIsSeeking(true);
    
    // Calculate new position (30 seconds forward)
    const newPosition = Math.min(currentPosition + 30000, totalDuration);
    
    // Update UI immediately for responsive feel
    setSeekPosition(newPosition);
    setCurrentPosition(newPosition);
    
    // Actually perform the seek
    await audioManager.seekTo(newPosition);
    
    // End seeking state
    setTimeout(() => setIsSeeking(false), 100);
  };
  
  // Skip backward 15 seconds
  const skipBackward = async () => {
    // Show visual feedback
    setIsSeeking(true);
    
    // Calculate new position (15 seconds backward)
    const newPosition = Math.max(currentPosition - 15000, 0);
    
    // Update UI immediately for responsive feel
    setSeekPosition(newPosition);
    setCurrentPosition(newPosition);
    
    // Actually perform the seek
    await audioManager.seekTo(newPosition);
    
    // End seeking state
    setTimeout(() => setIsSeeking(false), 100);
  };
  
  // Smooth guide transition method
  const smoothTransitionToGuide = async (newGuide: typeof VOICE_GUIDES[number]) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setTransitionProgress(0);
    
    // Perform smooth transition
    const success = await audioManager.smoothTransitionToGuide(newGuide, (progress) => {
      setTransitionProgress(progress);
    });
    
    if (success) {
      setSelectedGuide(newGuide);
    }
    
    setIsTransitioning(false);
    setTransitionProgress(0);
  };
  
  // Quick guide switch button component
  const QuickGuideButton = ({ guide }: { guide: typeof VOICE_GUIDES[number] }) => {
    const isActive = selectedGuide.id === guide.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.quickGuideButton,
          isActive && { backgroundColor: theme.primary },
        ]}
        onPress={() => {
          if (!isActive && isPlaying) {
            smoothTransitionToGuide(guide);
          } else if (!isActive) {
            setSelectedGuide(guide);
            audioManager.setGuide(guide);
          }
        }}
        disabled={isTransitioning}
      >
        <Text 
          style={[
            styles.quickGuideButtonText, 
            isActive && { color: '#FFFFFF' }
          ]}
        >
          {guide.name.charAt(0)}
        </Text>
      </TouchableOpacity>
    );
  };
  
  // Prayer key phrase based timestamps mapping
  const prayerKeyPhrases = mysteryType === "INTRODUCTION"
    ? [
        { phrase: "In the name of the Father", timestamp: 0 },            // Sign of the Cross
        { phrase: "I believe in God", timestamp: 12000 },                 // Apostles' Creed
        { phrase: "Our Father, who art in heaven", timestamp: 50000 },    // Our Father
        { phrase: "Hail Mary (1)", timestamp: 80000 },                    // First Hail Mary
        { phrase: "Hail Mary (2)", timestamp: 100000 },                   // Second Hail Mary
        { phrase: "Hail Mary (3)", timestamp: 120000 },                   // Third Hail Mary
        { phrase: "Glory be to the Father", timestamp: 140000 },          // Glory Be
        { phrase: "O my Jesus, forgive us our sins", timestamp: 160000 }, // Fatima Prayer
      ]
    : [
        { phrase: "In the name of the Father", timestamp: 0 },                // Sign of the Cross
        { phrase: "I believe in God", timestamp: 12000 },                     // Apostles' Creed
        { phrase: "Our Father, who art in heaven", timestamp: 50000 },        // Our Father
        { phrase: "Hail Mary, full of grace", timestamp: 80000 },             // Hail Mary (3x)
        { phrase: "Glory be to the Father", timestamp: 140000 },              // Glory Be
        { phrase: `${mysteryTitle || "First Mystery:"}`, timestamp: 170000 }, // Announce Mystery
        { phrase: "Our Father, who art in heaven", timestamp: 210000 },       // Our Father
        { phrase: "Hail Mary (1)", timestamp: 240000 },                       // Hail Mary 1
        { phrase: "Hail Mary (2)", timestamp: 255000 },                       // Hail Mary 2
        { phrase: "Hail Mary (3)", timestamp: 270000 },                       // Hail Mary 3
        { phrase: "Hail Mary (4)", timestamp: 285000 },                       // Hail Mary 4
        { phrase: "Hail Mary (5)", timestamp: 300000 },                       // Hail Mary 5
        { phrase: "Hail Mary (6)", timestamp: 315000 },                       // Hail Mary 6
        { phrase: "Hail Mary (7)", timestamp: 330000 },                       // Hail Mary 7
        { phrase: "Hail Mary (8)", timestamp: 345000 },                       // Hail Mary 8
        { phrase: "Hail Mary (9)", timestamp: 360000 },                       // Hail Mary 9
        { phrase: "Hail Mary (10)", timestamp: 375000 },                      // Hail Mary 10
        { phrase: "Glory be to the Father", timestamp: 390000 },              // Glory Be
        { phrase: "O my Jesus, forgive us our sins", timestamp: 405000 },     // Fatima Prayer
      ];
  
  // Skip to timestamp for the current prayer based on key phrases - MODIFIED to remove seeking
  const skipToCurrentPrayer = async (index: number) => {
    if (isPlaying && totalDuration > 0) {
      // Get prayer info
      const prayerInfo = prayerKeyPhrases[index];
      
      // Only show prayer name without seeking
      setSeekingPrayerName(prayerInfo.phrase);
      
      // Hide seeking indicator after a moment
      setTimeout(() => {
        setSeekingPrayerName("");
      }, 1500);
    }
  };
  
  // Move to next prayer step - MODIFIED to navigate to next screen when reaching the end
  const nextPrayerStep = () => {
    if (currentPrayerStep < prayers.length - 1) {
      const nextStep = currentPrayerStep + 1;
      setCurrentPrayerStep(nextStep);
      
      // Only show prayer name without seeking audio
      if (isPlaying) {
        const prayerInfo = prayerKeyPhrases[nextStep];
        setSeekingPrayerName(prayerInfo.phrase);
        
        setTimeout(() => {
          setSeekingPrayerName("");
        }, 1500);
      }
    } else {
      // We're at the end of prayers, navigate to RosaryPrayer3
      // Save any state we need to pass to the next screen
      const nextScreenParams = {
        mysteryType: mysteryType,
        mysteryKey: mysteryKey,
        mysteryIndex: parseInt(mysteryIndex as string) + 1, // Move to next mystery
        mysteryTitle: "Next Mystery", // You'd replace this with actual title
        mysteryDescription: "Description of the next mystery", // You'd replace this
        guideName: selectedGuide.name
      };
      
      // Pause audio if playing before navigation
      if (isPlaying) {
        audioManager.pauseAudio();
        setIsPlaying(false);
      }
      
      // Navigate to RosaryPrayer3 with params
      router.push({
        pathname: '/RosaryPrayer3',
        params: nextScreenParams
      });
    }
  };
  
  // Move to previous prayer step - MODIFIED to remove seeking and prevent page scrolling
  const prevPrayerStep = () => {
    if (currentPrayerStep > 0) {
      const prevStep = currentPrayerStep - 1;
      setCurrentPrayerStep(prevStep);
      
      // Only show prayer name without seeking audio
      if (isPlaying) {
        const prayerInfo = prayerKeyPhrases[prevStep];
        setSeekingPrayerName(prayerInfo.phrase);
        
        setTimeout(() => {
          setSeekingPrayerName("");
        }, 1500);
      }
    }
  };
  
  // Reference to scroll view for auto-scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  
  // State for full prayer modal
  const [showFullPrayer, setShowFullPrayer] = useState(false);
  
  // Display full prayer when card is pressed
  const handlePrayerCardPress = () => {
    setShowFullPrayer(true);
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
            onPress={() => router.replace('/Rosary')}
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
          ref={scrollViewRef}
        >
          {/* Current Prayer Display */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handlePrayerCardPress}
          >
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
              
              <View style={styles.readMoreContainer}>
                <Text style={[styles.readMoreText, { color: theme.primary }]}>
                  Tap to read full prayer
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
          
          {/* Navigation Controls - MODIFIED for next mystery navigation */}
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
                currentPrayerStep === prayers.length - 1 ? { backgroundColor: theme.primary } : null
              ]}
              onPress={nextPrayerStep}
              activeOpacity={0.8}
            >
              <Text 
                style={[
                  styles.navButtonText, 
                  { color: currentPrayerStep === prayers.length - 1 ? '#FFFFFF' : theme.primary }
                ]}
              >
                {currentPrayerStep === prayers.length - 1 ? 'NEXT MYSTERY' : 'NEXT'}
              </Text>
              <AntDesign 
                name="right" 
                size={20} 
                color={currentPrayerStep === prayers.length - 1 ? '#FFFFFF' : theme.primary} 
              />
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
                    mysteryType === "INTRODUCTION" 
                      ? (currentPrayerStep >= 3 && index < currentPrayerStep - 2
                          ? { backgroundColor: theme.primary, borderColor: theme.primary }
                          : { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.3)' })
                      : (currentPrayerStep >= 7 && currentPrayerStep <= 16 && index < currentPrayerStep - 6
                          ? { backgroundColor: theme.primary, borderColor: theme.primary }
                          : { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderColor: 'rgba(255, 255, 255, 0.3)' })
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
            disabled={isTransitioning || seekingPrayer}
          >
            <View style={styles.playButtonContent}>
              {isPlaying ? (
                <AntDesign name="pausecircle" size={24} color="#FFFFFF" />
              ) : (
                <AntDesign name="playcircleo" size={24} color="#FFFFFF" />
              )}
              <Text style={styles.playButtonText}>
                {seekingPrayerName.length > 0
                  ? `CURRENT PRAYER: "${seekingPrayerName}"` 
                  : isTransitioning 
                    ? "CHANGING GUIDE..." 
                    : (isPlaying ? "PAUSE AUDIO" : "PLAY AUDIO")}
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Audio progress bar */}
          {isSeekBarVisible && (
            <View style={styles.audioProgressContainer}>
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatTime(isSeeking ? seekPosition : currentPosition)}</Text>
                <Text style={styles.timeText}>{formatTime(totalDuration)}</Text>
              </View>
              
              <View style={styles.seekBarContainer}>
                <TouchableOpacity 
                  style={[
                    styles.skipButton,
                    isSeeking && currentPosition > 15000 && { backgroundColor: `${theme.primary}20` }
                  ]}
                  onPress={skipBackward}
                  disabled={isTransitioning}
                >
                  <AntDesign name="stepbackward" size={22} color={theme.primary} />
                  <Text style={[styles.skipButtonText, { color: theme.primary }]}>15s</Text>
                </TouchableOpacity>
                
                <Animated.View style={styles.sliderContainer}>
                  <View style={styles.sliderBackground} />
                  <View 
                    style={[
                      styles.sliderFill, 
                      { 
                        width: `${(isSeeking ? seekPosition : currentPosition) / totalDuration * 100}%`,
                        backgroundColor: theme.primary 
                      }
                    ]} 
                  />
                  <TouchableOpacity
                    style={[
                      styles.sliderThumb,
                      { 
                        left: `${(isSeeking ? seekPosition : currentPosition) / totalDuration * 100}%`,
                        backgroundColor: theme.primary,
                        transform: [{ translateX: -10 }] // Half of thumb width
                      }
                    ]}
                    onPressIn={handleSeekStart}
                    onLongPress={handleSeekStart}
                  />
                  
                  {/* Invisible slider area for seeking */}
                  <View
                    style={styles.sliderTouchArea}
                    onLayout={(event) => {
                      // Store the width for percentage calculations
                      sliderWidth.current = event.nativeEvent.layout.width;
                    }}
                    onTouchStart={(event) => {
                      const touchX = event.nativeEvent.locationX;
                      const percentage = touchX / sliderWidth.current;
                      const newPosition = Math.max(0, Math.min(percentage * totalDuration, totalDuration));
                      
                      handleSeekStart();
                      handleSeekMove(newPosition);
                    }}
                    onTouchMove={(event) => {
                      if (isSeeking) {
                        const touchX = event.nativeEvent.locationX;
                        const percentage = touchX / sliderWidth.current;
                        const newPosition = Math.max(0, Math.min(percentage * totalDuration, totalDuration));
                        
                        handleSeekMove(newPosition);
                      }
                    }}
                    onTouchEnd={() => {
                      if (isSeeking) {
                        handleSeekComplete();
                      }
                    }}
                  />
                </Animated.View>
                
                <TouchableOpacity 
                  style={[
                    styles.skipButton,
                    isSeeking && currentPosition < (totalDuration - 30000) && { backgroundColor: `${theme.primary}20` }
                  ]}
                  onPress={skipForward}
                  disabled={isTransitioning}
                >
                  <AntDesign name="stepforward" size={22} color={theme.primary} />
                  <Text style={[styles.skipButtonText, { color: theme.primary }]}>30s</Text>
                </TouchableOpacity>
              </View>
              
              {/* Quick guide switch buttons */}
              <View style={styles.quickGuideSwitchContainer}>
                <Text style={styles.quickGuideSwitchLabel}>Change Guide:</Text>
                <View style={styles.quickGuideButtonsRow}>
                  {VOICE_GUIDES.map((guide) => (
                    <QuickGuideButton key={guide.id} guide={guide} />
                  ))}
                </View>
              </View>
              
              {/* Secondary controls */}
              <View style={styles.secondaryButtonsRow}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: theme.accent }]}
                  onPress={() => setShowGuidePicker(true)}
                  activeOpacity={0.8}
                  disabled={isTransitioning}
                >
                  <AntDesign name="user" size={18} color={theme.primary} />
                  <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Guide</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: theme.accent }]}
                  onPress={() => setShowDurationPicker(true)}
                  activeOpacity={0.8}
                  disabled={isTransitioning}
                >
                  <AntDesign name="clockcircleo" size={18} color={theme.primary} />
                  <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Duration</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Progress bar for guide transition */}
          {isTransitioning && (
            <View style={styles.transitionProgressContainer}>
              <View style={styles.transitionProgressBar}>
                <View 
                  style={[
                    styles.transitionProgressFill, 
                    { 
                      width: `${transitionProgress * 100}%`,
                      backgroundColor: theme.primary 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.transitionText}>
                Transitioning from {selectedGuide.name} to new guide...
              </Text>
            </View>
          )}
          
          {!isSeekBarVisible && isPlaying && (
            <TouchableOpacity 
              style={styles.showPlayerButton}
              onPress={() => setIsSeekBarVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.showPlayerText}>Show Player Controls</Text>
              <AntDesign name="caretdown" size={12} color="#666" />
            </TouchableOpacity>
          )}
          
          <View style={styles.guideContainer}>
            <View style={[styles.guideChip, { backgroundColor: theme.accent }]}>
              <AntDesign name="user" size={16} color={theme.primary} />
              <Text style={[styles.guideText, { color: theme.primary }]}>
                Guide: {selectedGuide.name}
              </Text>
            </View>
            
            <View style={[styles.guideChip, { backgroundColor: theme.accent, marginTop: 8 }]}>
              <AntDesign name="clockcircleo" size={16} color={theme.primary} />
              <Text style={[styles.guideText, { color: theme.primary }]}>
                Duration: {selectedDuration.duration}
              </Text>
            </View>
          </View>
          

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
                    if (selectedGuide.id === item.id) {
                      // Already selected, just close modal
                      setShowGuidePicker(false);
                      return;
                    }
                    
                    if (isPlaying) {
                      // If audio is playing, use smooth transition
                      setShowGuidePicker(false);
                      smoothTransitionToGuide(item);
                    } else {
                      // If not playing, just change the guide immediately
                      setSelectedGuide(item);
                      audioManager.setGuide(item);
                      setShowGuidePicker(false);
                    }
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
                        await audioManager.playMystery(mysteryKey as string, parseInt(mysteryIndex as string));
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
      
      {/* Full Prayer Modal */}
      <Modal
        visible={showFullPrayer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullPrayer(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.fullPrayerModalCard, { maxHeight: height * 0.8 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{prayers[currentPrayerStep].title}</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowFullPrayer(false)}
              >
                <AntDesign name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.fullPrayerScrollView}>
              <View style={styles.fullPrayerContent}>
                <Text style={styles.fullPrayerText}>
                  {mysteryType === "INTRODUCTION" 
                    ? (
                      // Introduction prayers
                      currentPrayerStep === 0 && "In the name of the Father, and of the Son, and of the Holy Spirit. Amen."
                      || currentPrayerStep === 1 && "I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, his only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died and was buried; he descended into hell; on the third day he rose again from the dead; he ascended into heaven, and is seated at the right hand of God the Father almighty; from there he will come to judge the living and the dead. I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen."
                      || currentPrayerStep === 2 && "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen."
                      || currentPrayerStep === 3 && "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen."
                      || currentPrayerStep === 4 && "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen."
                      || currentPrayerStep === 5 && "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen."
                      || currentPrayerStep === 6 && "Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen."
                      || currentPrayerStep === 7 && "O my Jesus, forgive us our sins, save us from the fires of hell, lead all souls to Heaven, especially those in most need of Thy mercy."
                    )
                    : (
                      // Regular mystery prayers with individual Hail Marys
                      currentPrayerStep === 0 && "In the name of the Father, and of the Son, and of the Holy Spirit. Amen."
                      || currentPrayerStep === 1 && "I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, his only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died and was buried; he descended into hell; on the third day he rose again from the dead; he ascended into heaven, and is seated at the right hand of God the Father almighty; from there he will come to judge the living and the dead. I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen."
                      || currentPrayerStep === 2 && "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen."
                      || currentPrayerStep === 3 && "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen. (Repeat 3 times)"
                      || currentPrayerStep === 4 && "Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen."
                      || currentPrayerStep === 5 && `${mysteryTitle || "The Mystery"}\n\n${mysteryDescription || "Meditate on this mystery..."}`
                      || currentPrayerStep === 6 && "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen."
                      || (currentPrayerStep >= 7 && currentPrayerStep <= 16) && "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen."
                      || currentPrayerStep === 17 && "Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen."
                      || currentPrayerStep === 18 && "O my Jesus, forgive us our sins, save us from the fires of hell, lead all souls to Heaven, especially those in most need of Thy mercy."
                    )
                  }
                </Text>
              </View>
            </ScrollView>
            
            {isPlaying && (
              <View style={styles.followAlongContainer}>
                <Text style={styles.followAlongText}>Continue following along with audio</Text>
              </View>
            )}
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
  readMoreContainer: {
    marginTop: 4,
    alignItems: 'center',
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fullPrayerModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    margin: 20,
    width: width - 40,
    padding: 0,
    overflow: 'hidden',
  },
  fullPrayerScrollView: {
    maxHeight: height * 0.6,
  },
  fullPrayerContent: {
    padding: 24,
    paddingTop: 12,
  },
  fullPrayerText: {
    fontSize: 18,
    lineHeight: 28,
    color: "#333",
  },
  followAlongContainer: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  followAlongText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  audioProgressContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  seekBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
  },
  skipButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
  },
  skipButtonText: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: -2,
  },
  sliderContainer: {
    flex: 1,
    height: 20,
    justifyContent: "center",
    marginHorizontal: 8,
    position: "relative",
  },
  sliderBackground: {
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    position: "absolute",
    left: 0,
    right: 0,
  },
  sliderFill: {
    height: 4,
    borderRadius: 2,
    position: "absolute",
    left: 0,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: "absolute",
    top: 0,
    marginTop: -8, // Center vertically
    zIndex: 2,
  },
  sliderTouchArea: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -20,
    bottom: -20,
    zIndex: 1,
  },
  quickGuideSwitchContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
  },
  quickGuideSwitchLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  quickGuideButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  quickGuideButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  quickGuideButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
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
    marginBottom: 4, // Further reduced spacing
  },
  sectionTitle: {
    fontSize: 16, // Smaller font
    fontWeight: "700",
    color: "#242424",
    marginBottom: 6, // Reduced margin
  },
  beadsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    padding: 8, // Further reduced padding
    borderRadius: 16,
  },
  bead: {
    width: 18, // Smaller beads
    height: 18, // Smaller beads
    borderRadius: 9,
    margin: 4, // Reduced margin
    borderWidth: 2,
  },
  playButton: {
    borderRadius: 14,
    paddingVertical: 12, // Further reduced vertical padding
    marginHorizontal: 20,
    marginBottom: 10, // Reduced bottom margin
    marginTop: -6, // Increased negative top margin to pull it up more
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
  // Animation and transition styles
  transitionProgressContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transitionProgressBar: {
    height: 10,
    backgroundColor: "#E0E0E0",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 8,
  },
  transitionProgressFill: {
    height: "100%",
    borderRadius: 5,
  },
  transitionText: {
    fontSize: 14,
    color: "#555555",
    textAlign: "center",
  },
  showPlayerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginBottom: 14,
  },
  showPlayerText: {
    fontSize: 14,
    color: "#666",
    marginRight: 5,
  },
  // Modal styles
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
  // Secondary action buttons
  secondaryButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: "45%",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
});