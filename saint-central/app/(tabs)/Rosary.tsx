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
  const sliderWidth = useRef(1);
  
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [isSeekBarVisible, setIsSeekBarVisible] = useState(false);

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
  
  // Change mystery type
  const changeMysteryType = (mysteryType: string, mysteryKey: string) => {
    audioManager.stopAudio();
    setIsPlaying(false);
    setCurrentMysteryType(mysteryType);
    setCurrentMysteryKey(mysteryKey);
    setCurrentMysteryIndex(0);
    setShowMysteryPicker(false);
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
                <Text style={[styles.chipText, { color: theme.primary }]}>
                  {selectedGuide.name}
                  {isTransitioning && " (Changing...)"}
                </Text>
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
              disabled={isTransitioning}
            >
              <View style={styles.mainButtonContent}>
                {isPlaying ? (
                  <AntDesign name="pausecircle" size={26} color="#FFFFFF" />
                ) : (
                  <AntDesign name="playcircleo" size={26} color="#FFFFFF" />
                )}
                <Text style={styles.mainButtonText}>
                  {isTransitioning ? "CHANGING GUIDE..." : (isPlaying ? "PAUSE PRAYER" : "START PRAYER")}
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
              </View>
            )}
            
            <View style={styles.secondaryButtonsRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: theme.accent }]}
                onPress={() => setShowGuidePicker(true)}
                activeOpacity={0.8}
                disabled={isTransitioning}
              >
                <AntDesign name="user" size={22} color={theme.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Guide</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: theme.accent }]}
                onPress={() => setShowDurationPicker(true)}
                activeOpacity={0.8}
                disabled={isTransitioning}
              >
                <AntDesign name="clockcircleo" size={22} color={theme.primary} />
                <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Duration</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
          
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
                  disabled={isTransitioning}
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
            disabled={isTransitioning}
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
  audioProgressContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
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