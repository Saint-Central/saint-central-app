import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

// Audio player props interface
// {
//   audioFile: any;               // Required: Audio file source
//   theme: {                      // Required: Theme colors
//     primary: string;
//     secondary: string;
//     accent: string;
//   };
//   onPlaybackStatusChange?: (status: any) => void;  // Optional: Callback for playback status
//   autoPlayOnMount?: boolean;    // Optional: Auto-play when component mounts
//   playbackRate?: number;        // Optional: Playback rate (speed)
//   loopAudio?: boolean;          // Optional: Loop playback when finished
//   showSpeedControl?: boolean;   // Optional: Show speed control buttons
//   onComplete?: () => void;      // Optional: Callback when audio completes
// }

export default function AudioPlayer({
  audioFile,
  theme,
  onPlaybackStatusChange,
  autoPlayOnMount = false,
  playbackRate = 1.0,
  loopAudio = false,
  showSpeedControl = true,
  onComplete
}) {
  // State management
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [currentRate, setCurrentRate] = useState(playbackRate);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  
  // Animation refs
  const playButtonScale = useRef(new Animated.Value(1)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const bufferingAnimValue = useRef(new Animated.Value(0)).current;
  
  // Loop animation for buffering indicator
  const startBufferingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bufferingAnimValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bufferingAnimValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  };
  
  // Stop buffering animation
  const stopBufferingAnimation = () => {
    bufferingAnimValue.stopAnimation();
    bufferingAnimValue.setValue(0);
  };
  
  // Load sound effect
  useEffect(() => {
    loadSound();
    
    // Cleanup function
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [audioFile]);
  
  // Play audio when autoPlayOnMount is true
  useEffect(() => {
    if (autoPlayOnMount && sound) {
      playSound();
    }
  }, [sound, autoPlayOnMount]);
  
  // Update playback rate when it changes
  useEffect(() => {
    if (sound && currentRate !== playbackRate) {
      setCurrentRate(playbackRate);
      sound.setRateAsync(playbackRate, true);
    }
  }, [playbackRate]);
  
  // Handle buffering animation
  useEffect(() => {
    if (isBuffering) {
      startBufferingAnimation();
    } else {
      stopBufferingAnimation();
    }
  }, [isBuffering]);
  
  // Load sound function
  const loadSound = async () => {
    try {
      setIsLoading(true);
      setIsPlaying(false);
      
      // Show loading animation
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Unload any existing sound
      if (sound) {
        await sound.unloadAsync();
      }
      
      // Create new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        audioFile,
        {
          shouldPlay: autoPlayOnMount,
          rate: currentRate,
          isLooping: loopAudio,
        },
        onPlaybackStatusUpdate
      );
      
      setSound(newSound);
      
      // Hide loading animation
      Animated.timing(loadingOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      setIsLoading(false);
      
      if (autoPlayOnMount) {
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Failed to load sound:", error);
      setIsLoading(false);
    }
  };
  
  // Playback status update handler
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis);
      
      if (!isSeeking) {
        setPosition(status.positionMillis);
      }
      
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering);
      
      if (status.didJustFinish && !status.isLooping) {
        setIsPlaying(false);
        if (onComplete) {
          onComplete();
        }
      }
    }
    
    // Call external status change handler if provided
    if (onPlaybackStatusChange) {
      onPlaybackStatusChange(status);
    }
  };
  
  // Play sound function
  const playSound = async () => {
    try {
      if (sound) {
        // Animate button press
        Animated.sequence([
          Animated.timing(playButtonScale, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(playButtonScale, {
            toValue: 1.1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(playButtonScale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          })
        ]).start();
        
        // Trigger haptic feedback if on iOS
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Failed to play sound:", error);
    }
  };
  
  // Pause sound function
  const pauseSound = async () => {
    try {
      if (sound) {
        // Animate button press
        Animated.sequence([
          Animated.timing(playButtonScale, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(playButtonScale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          })
        ]).start();
        
        // Trigger haptic feedback if on iOS
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        await sound.pauseAsync();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Failed to pause sound:", error);
    }
  };
  
  // Toggle playback function
  const togglePlayback = async () => {
    if (isPlaying) {
      await pauseSound();
    } else {
      await playSound();
    }
  };
  
  // Skip forward function
  const skipForward = async () => {
    try {
      if (sound) {
        // Trigger haptic feedback if on iOS
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        
        const newPosition = Math.min(position + 10000, duration);
        setPosition(newPosition);
        await sound.setPositionAsync(newPosition);
      }
    } catch (error) {
      console.error("Failed to skip forward:", error);
    }
  };
  
  // Skip backward function
  const skipBackward = async () => {
    try {
      if (sound) {
        // Trigger haptic feedback if on iOS
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        
        const newPosition = Math.max(position - 10000, 0);
        setPosition(newPosition);
        await sound.setPositionAsync(newPosition);
      }
    } catch (error) {
      console.error("Failed to skip backward:", error);
    }
  };
  
  // Change playback speed function
  const changeSpeed = async (newRate) => {
    try {
      if (sound) {
        // Trigger haptic feedback if on iOS
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        setCurrentRate(newRate);
        await sound.setRateAsync(newRate, true);
      }
    } catch (error) {
      console.error("Failed to change speed:", error);
    }
  };
  
  // Handle seek start
  const handleSeekStart = () => {
    setIsSeeking(true);
    setSeekPosition(position);
    
    // Trigger haptic feedback if on iOS
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  // Handle seek movement
  const handleSeekMove = (value) => {
    setSeekPosition(value);
  };
  
  // Handle seek complete
  const handleSeekComplete = async () => {
    try {
      if (sound) {
        await sound.setPositionAsync(seekPosition);
        setPosition(seekPosition);
        
        // Trigger haptic feedback if on iOS
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    } catch (error) {
      console.error("Failed to seek:", error);
    } finally {
      setIsSeeking(false);
    }
  };
  
  // Format time in MM:SS format
  const formatTime = (milliseconds) => {
    if (!milliseconds) return "00:00";
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (!duration) return 0;
    return ((isSeeking ? seekPosition : position) / duration) * 100;
  };
  
  // Render speed control buttons if enabled
  const renderSpeedControls = () => {
    if (!showSpeedControl) return null;
    
    const speeds = [0.75, 1.0, 1.25, 1.5];
    
    return (
      <View style={styles.speedControlsContainer}>
        <Text style={styles.speedLabel}>Speed:</Text>
        <View style={styles.speedButtonsRow}>
          {speeds.map((speed) => (
            <TouchableOpacity
              key={`speed-${speed}`}
              style={[
                styles.speedButton,
                currentRate === speed && { backgroundColor: `${theme.primary}20` }
              ]}
              onPress={() => changeSpeed(speed)}
            >
              <Text
                style={[
                  styles.speedButtonText,
                  { color: currentRate === speed ? theme.primary : "#666" }
                ]}
              >
                {speed}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Time display and progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(isSeeking ? seekPosition : position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
        
        <View
          style={styles.sliderContainer}
          onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
        >
          {/* Progress bar background */}
          <View style={styles.sliderBackground} />
          
          {/* Progress bar fill */}
          <View
            style={[
              styles.sliderFill,
              {
                width: `${getProgressPercentage()}%`,
                backgroundColor: theme.primary
              }
            ]}
          />
          
          {/* Progress bar thumb */}
          <TouchableOpacity
            style={[
              styles.sliderThumb,
              {
                left: `${getProgressPercentage()}%`,
                backgroundColor: theme.primary,
                transform: [{ translateX: -10 }]
              }
            ]}
            onPressIn={handleSeekStart}
            onLongPress={handleSeekStart}
          />
          
          {/* Invisible slider area for seeking */}
          <View
            style={styles.sliderTouchArea}
            onTouchStart={(event) => {
              const touchX = event.nativeEvent.locationX;
              const percentage = touchX / sliderWidth;
              const newPosition = Math.max(0, Math.min(percentage * duration, duration));
              
              handleSeekStart();
              handleSeekMove(newPosition);
            }}
            onTouchMove={(event) => {
              if (isSeeking) {
                const touchX = event.nativeEvent.locationX;
                const percentage = touchX / sliderWidth;
                const newPosition = Math.max(0, Math.min(percentage * duration, duration));
                
                handleSeekMove(newPosition);
              }
            }}
            onTouchEnd={() => {
              if (isSeeking) {
                handleSeekComplete();
              }
            }}
          />
        </View>
      </View>
      
      {/* Control buttons */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={skipBackward}
          disabled={isLoading}
        >
          <AntDesign name="banckward" size={24} color="#555" />
          <Text style={styles.skipButtonText}>10s</Text>
        </TouchableOpacity>
        
        <Animated.View
          style={[
            styles.playButtonContainer,
            { transform: [{ scale: playButtonScale }] }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.playButton,
              { backgroundColor: theme.primary }
            ]}
            onPress={togglePlayback}
            disabled={isLoading}
          >
            {isLoading ? (
              <Animated.View style={{ opacity: loadingOpacity }}>
                <AntDesign name="loading1" size={32} color="#FFFFFF" />
              </Animated.View>
            ) : isBuffering ? (
              <Animated.View
                style={{
                  opacity: bufferingAnimValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1]
                  })
                }}
              >
                <MaterialCommunityIcons name="buffer" size={32} color="#FFFFFF" />
              </Animated.View>
            ) : isPlaying ? (
              <AntDesign name="pausecircle" size={32} color="#FFFFFF" />
            ) : (
              <AntDesign name="playcircleo" size={32} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </Animated.View>
        
        <TouchableOpacity
          style={styles.skipButton}
          onPress={skipForward}
          disabled={isLoading}
        >
          <AntDesign name="forward" size={24} color="#555" />
          <Text style={styles.skipButtonText}>10s</Text>
        </TouchableOpacity>
      </View>
      
      {/* Speed controls */}
      {renderSpeedControls()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  sliderContainer: {
    height: 20,
    justifyContent: "center",
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
    marginTop: -8,
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
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 16,
  },
  skipButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 60,
  },
  skipButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    marginTop: 2,
  },
  playButtonContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  speedControlsContainer: {
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
    paddingTop: 12,
  },
  speedLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  speedButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  speedButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});