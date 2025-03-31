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

// Updated props interface to include:
// - isPlaying: boolean - External control of playing state
// - initialSeekPosition: number - Position to seek to when loading audio
// - onAudioLoad: (sound) => void - Callback with sound object reference

export default function AudioPlayer({
  audioFile,
  theme,
  onPlaybackStatusChange,
  autoPlayOnMount = false,
  playbackRate = 1.0,
  loopAudio = false,
  showSpeedControl = true,
  onComplete,
  isPlaying: externalIsPlaying, // New prop for external play control
  initialSeekPosition, // New prop for initial seek position when loading audio
  onAudioLoad // New prop to pass sound object to parent
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
  const [shouldApplyInitialSeek, setShouldApplyInitialSeek] = useState(false);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  
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
    
    // Reset state for new audio
    setIsAudioLoaded(false);
    setShouldApplyInitialSeek(!!initialSeekPosition);
    
    // Cleanup function
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [audioFile]);
  
  // Play audio when autoPlayOnMount is true
  useEffect(() => {
    if (autoPlayOnMount && sound && isAudioLoaded) {
      playSound();
    }
  }, [sound, autoPlayOnMount, isAudioLoaded]);
  
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
  
  // Handle external isPlaying prop
  useEffect(() => {
    if (externalIsPlaying !== undefined && sound && isAudioLoaded) {
      if (externalIsPlaying && !isPlaying) {
        playSound();
      } else if (!externalIsPlaying && isPlaying) {
        pauseSound();
      }
    }
  }, [externalIsPlaying, sound, isAudioLoaded]);
  
  // Handle initial seek position - seek after audio is loaded
  useEffect(() => {
    const applyInitialSeek = async () => {
      if (shouldApplyInitialSeek && sound && isAudioLoaded && initialSeekPosition) {
        try {
          console.log(`AudioPlayer: Applying initial seek to ${initialSeekPosition}ms`);
          await sound.setPositionAsync(initialSeekPosition);
          setPosition(initialSeekPosition);
          setShouldApplyInitialSeek(false);
        } catch (error) {
          console.error("Failed to apply initial seek:", error);
        }
      }
    };
    
    applyInitialSeek();
  }, [sound, isAudioLoaded, initialSeekPosition, shouldApplyInitialSeek]);
  
  // Load sound function
  const loadSound = async () => {
    try {
      setIsLoading(true);
      setIsPlaying(false);
      setIsAudioLoaded(false);
      
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
      
      // Expose sound object to parent component
      if (onAudioLoad && typeof onAudioLoad === 'function') {
        console.log('AudioPlayer: Providing sound object to parent component');
        onAudioLoad(newSound);
      }
      
      // Hide loading animation
      Animated.timing(loadingOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      setIsLoading(false);
      setIsAudioLoaded(true);
      
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
      // Add the sound object to the status for external control
      onPlaybackStatusChange({
        ...status,
        sound
      });
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