import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  StatusBar,
} from "react-native";
import { AntDesign, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";

// Audio Manager Class (simplified version for prayer screens)
class AudioManager {
  sound;
  isPlaying;
  currentPosition;
  totalDuration;
  onPlaybackStatusUpdate;
  playbackRate;

  constructor() {
    this.sound = null;
    this.isPlaying = false;
    this.currentPosition = 0;
    this.totalDuration = 0;
    this.onPlaybackStatusUpdate = null;
    this.playbackRate = 1.0;
  }

  // Register playback status update callback
  registerPlaybackCallback(callback) {
    this.onPlaybackStatusUpdate = callback;
    if (this.sound) {
      this.updateSoundStatusListener(this.sound);
    }
  }

  // Update sound status listener
  updateSoundStatusListener(sound) {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        this.currentPosition = status.positionMillis;
        this.totalDuration = status.durationMillis ?? 0;
        this.isPlaying = status.isPlaying;

        if (status.didJustFinish) {
          this.isPlaying = false;
          this.sound = null;
        }
      }

      if (this.onPlaybackStatusUpdate) {
        this.onPlaybackStatusUpdate(status);
      }
    });

    sound.setProgressUpdateIntervalAsync(100); // Update every 100ms
  }

  // Set playback rate
  setPlaybackRate(rate) {
    this.playbackRate = rate;
    if (this.sound) {
      this.sound.setRateAsync(rate, true);
    }
    return this;
  }

  // Play audio file
  async playAudio(audioFile) {
    try {
      // Unload any existing audio
      await this.stopAudio();

      // Create and play audio
      const { sound } = await Audio.Sound.createAsync(audioFile, {
        shouldPlay: true,
        rate: this.playbackRate,
      });

      this.sound = sound;
      this.isPlaying = true;

      // Set up status listener
      this.updateSoundStatusListener(sound);

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

  // Seek to a specific position in milliseconds
  async seekTo(positionMillis) {
    if (!this.sound) return false;

    try {
      this.currentPosition = positionMillis;
      await this.sound.setPositionAsync(positionMillis);

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
}

// Create audio manager instance
const audioManager = new AudioManager();

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
    case "INTRODUCTION":
      return {
        primary: "#6c5ce7",
        secondary: "#5541c2",
        accent: "#F0ECFF",
        gradientStart: "#6c5ce7",
        gradientEnd: "#5541c2",
        icon: "book-open",
      };
    case "CONCLUSION":
      return {
        primary: "#fdcb6e",
        secondary: "#f8a932",
        accent: "#FFF8E8",
        gradientStart: "#fdcb6e",
        gradientEnd: "#f8a932",
        icon: "award",
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

export default function RosaryPrayerBase({
  title,
  description,
  prayers,
  audioFile,
  customContent,
  nextScreen,
  prevScreen,
}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollRef = useRef();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Extract params
  const mysteryType = params.mysteryType || "INTRODUCTION";
  const mysteryKey = params.mysteryKey || "JOYFUL";
  const mysteryIndex = parseInt(params.mysteryIndex) || 0;
  const mysteryTitle = params.mysteryTitle || title;
  const mysteryDescription = params.mysteryDescription || description;
  const guideName = params.guideName || "Francis";

  // Get theme based on mystery type
  const theme = getMysteryTheme(mysteryKey);

  // State management
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [currentPrayerIndex, setCurrentPrayerIndex] = useState(0);
  const [showAutoScrollToast, setShowAutoScrollToast] = useState(false);
  const [textSize, setTextSize] = useState("medium"); // 'small', 'medium', 'large'

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const toastAnim = useRef(new Animated.Value(100)).current;

  // Prayer section refs
  const prayerRefs = useRef([]);

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
      }),
    ]).start();
  }, []);

  // Set audio mode
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
    });

    // Register playback status update callback
    audioManager.registerPlaybackCallback((status) => {
      if (status.isLoaded) {
        if (!isSeeking) {
          setCurrentPosition(status.positionMillis);
        }
        setTotalDuration(status.durationMillis);

        // Auto-scroll based on playback position
        if (autoScroll && status.isPlaying) {
          const playbackPercentage = status.positionMillis / status.durationMillis;
          updatePrayerIndexBasedOnPosition(playbackPercentage);
        }
      }
    });

    // Clean up audio on unmount
    return () => {
      audioManager.stopAudio();
    };
  }, [autoScroll]);

  // Update current prayer index based on audio position
  const updatePrayerIndexBasedOnPosition = (percentage) => {
    if (prayers && prayers.length > 0) {
      // Rough calculation - divide playback into equal sections for each prayer
      const sectionSize = 1 / prayers.length;
      const newIndex = Math.min(Math.floor(percentage / sectionSize), prayers.length - 1);

      if (newIndex !== currentPrayerIndex) {
        setCurrentPrayerIndex(newIndex);
        scrollToPrayer(newIndex);
      }
    }
  };

  // Scroll to specific prayer
  const scrollToPrayer = (index) => {
    if (scrollRef.current && prayerRefs.current[index]) {
      prayerRefs.current[index].measureLayout(
        scrollRef.current,
        (x, y) => {
          scrollRef.current.scrollTo({
            y: y - 150, // Offset to account for header
            animated: true,
          });
        },
        (error) => console.error("Failed to measure layout:", error),
      );
    }
  };

  // Toggle playback
  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        await audioManager.pauseAudio();
        setIsPlaying(false);
      } else {
        const result = await audioManager.resumeAudio();
        if (!result) {
          // If no audio is loaded, play the audio file
          await audioManager.playAudio(audioFile);
        }
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Failed to toggle playback:", error);
    }
  };

  // Format time in MM:SS format
  const formatTime = (milliseconds) => {
    if (!milliseconds) return "00:00";

    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Handle seek start
  const handleSeekStart = () => {
    setIsSeeking(true);
    setSeekPosition(currentPosition);
  };

  // Handle seek movement
  const handleSeekMove = (value) => {
    setSeekPosition(value);
  };

  // Handle seek complete
  const handleSeekComplete = async () => {
    const newPosition = seekPosition;
    setCurrentPosition(newPosition);
    setIsSeeking(false);

    // Seek in the audio
    await audioManager.seekTo(newPosition);

    if (autoScroll) {
      const playbackPercentage = newPosition / totalDuration;
      updatePrayerIndexBasedOnPosition(playbackPercentage);
    }
  };

  // Skip forward 10 seconds
  const skipForward = async () => {
    setIsSeeking(true);
    const newPosition = Math.min(currentPosition + 10000, totalDuration);
    setSeekPosition(newPosition);
    setCurrentPosition(newPosition);
    await audioManager.seekTo(newPosition);
    setTimeout(() => setIsSeeking(false), 100);

    if (autoScroll) {
      const playbackPercentage = newPosition / totalDuration;
      updatePrayerIndexBasedOnPosition(playbackPercentage);
    }
  };

  // Skip backward 10 seconds
  const skipBackward = async () => {
    setIsSeeking(true);
    const newPosition = Math.max(currentPosition - 10000, 0);
    setSeekPosition(newPosition);
    setCurrentPosition(newPosition);
    await audioManager.seekTo(newPosition);
    setTimeout(() => setIsSeeking(false), 100);

    if (autoScroll) {
      const playbackPercentage = newPosition / totalDuration;
      updatePrayerIndexBasedOnPosition(playbackPercentage);
    }
  };

  // Toggle auto-scroll
  const toggleAutoScroll = () => {
    const newValue = !autoScroll;
    setAutoScroll(newValue);

    // Show toast message
    setShowAutoScrollToast(true);
    toastAnim.setValue(100);

    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowAutoScrollToast(false);
    });

    // If turning on auto-scroll and audio is playing, immediately scroll to current position
    if (newValue && isPlaying && totalDuration > 0) {
      const playbackPercentage = currentPosition / totalDuration;
      updatePrayerIndexBasedOnPosition(playbackPercentage);
    }
  };

  // Change text size
  const cycleTextSize = () => {
    if (textSize === "small") setTextSize("medium");
    else if (textSize === "medium") setTextSize("large");
    else setTextSize("small");
  };

  // Get text size styles
  const getTextSizeStyle = () => {
    switch (textSize) {
      case "small":
        return { prayerText: 16, prayerTitle: 20 };
      case "large":
        return { prayerText: 22, prayerTitle: 26 };
      default:
        return { prayerText: 18, prayerTitle: 24 };
    }
  };

  const textSizes = getTextSizeStyle();

  // Navigate to previous mystery
  const goToPreviousMystery = () => {
    audioManager.stopAudio();
    if (prevScreen) {
      router.push(prevScreen);
    } else {
      router.back();
    }
  };

  // Navigate to next mystery
  const goToNextMystery = () => {
    audioManager.stopAudio();
    if (nextScreen) {
      router.push(nextScreen);
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientEnd]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

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

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {mysteryTitle}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {mysteryType}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.textSizeButton}
            onPress={cycleTextSize}
            activeOpacity={0.7}
          >
            <AntDesign name="filetext1" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Audio Controls */}
        <View style={styles.audioControlsContainer}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {formatTime(isSeeking ? seekPosition : currentPosition)}
            </Text>
            <Text style={styles.timeText}>{formatTime(totalDuration)}</Text>
          </View>

          <View style={styles.seekBarContainer}>
            <View style={styles.sliderBackground} />
            <View
              style={[
                styles.sliderFill,
                {
                  width: `${totalDuration > 0 ? ((isSeeking ? seekPosition : currentPosition) / totalDuration) * 100 : 0}%`,
                  backgroundColor: theme.primary,
                },
              ]}
            />
            <TouchableOpacity
              style={[
                styles.sliderThumb,
                {
                  left: `${totalDuration > 0 ? ((isSeeking ? seekPosition : currentPosition) / totalDuration) * 100 : 0}%`,
                  backgroundColor: theme.primary,
                  transform: [{ translateX: -10 }],
                },
              ]}
              onPressIn={handleSeekStart}
              onLongPress={handleSeekStart}
            />
          </View>

          <View style={styles.controlButtonsContainer}>
            <TouchableOpacity style={styles.controlButton} onPress={skipBackward}>
              <AntDesign name="banckward" size={24} color={theme.primary} />
              <Text style={[styles.controlButtonText, { color: theme.primary }]}>10s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: theme.primary }]}
              onPress={togglePlayback}
            >
              {isPlaying ? (
                <AntDesign name="pausecircle" size={32} color="#FFFFFF" />
              ) : (
                <AntDesign name="playcircleo" size={32} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={skipForward}>
              <AntDesign name="forward" size={24} color={theme.primary} />
              <Text style={[styles.controlButtonText, { color: theme.primary }]}>10s</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.advancedControlsContainer}>
            <TouchableOpacity
              style={[
                styles.advancedButton,
                autoScroll && { backgroundColor: `${theme.primary}20` },
              ]}
              onPress={toggleAutoScroll}
            >
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={20}
                color={theme.primary}
              />
              <Text style={[styles.advancedButtonText, { color: theme.primary }]}>
                {autoScroll ? "Auto-Scroll ON" : "Auto-Scroll OFF"}
              </Text>
            </TouchableOpacity>

            <View style={styles.guideIndicator}>
              <AntDesign name="user" size={16} color={theme.primary} />
              <Text style={[styles.guideText, { color: theme.primary }]}>{guideName}</Text>
            </View>
          </View>
        </View>

        {/* Navigation between mysteries */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navigationButton, { backgroundColor: theme.accent }]}
            onPress={goToPreviousMystery}
          >
            <AntDesign name="left" size={16} color={theme.primary} />
            <Text style={[styles.navigationButtonText, { color: theme.primary }]}>Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navigationButton, { backgroundColor: theme.accent }]}
            onPress={goToNextMystery}
          >
            <Text style={[styles.navigationButtonText, { color: theme.primary }]}>Next</Text>
            <AntDesign name="right" size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            scrollY.setValue(offsetY);
          }}
        >
          {/* Mystery Description */}
          <Animated.View
            style={[
              styles.mysteryDescriptionContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.mysteryBadge}>
              <FontAwesome5 name={theme.icon} size={26} color={theme.primary} />
            </View>

            <Text style={styles.mysteryTitle}>{mysteryTitle}</Text>
            <Text style={styles.mysteryDescription}>{mysteryDescription}</Text>
          </Animated.View>

          {/* Custom Content (if provided) */}
          {customContent && (
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {customContent}
            </Animated.View>
          )}

          {/* Prayers */}
          {prayers &&
            prayers.map((prayer, index) => (
              <Animated.View
                key={`prayer-${index}`}
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
                ref={(ref) => (prayerRefs.current[index] = ref)}
              >
                <TouchableOpacity
                  style={[
                    styles.prayerCard,
                    currentPrayerIndex === index &&
                      autoScroll && { borderColor: theme.primary, borderWidth: 2 },
                  ]}
                  onPress={() => {
                    setCurrentPrayerIndex(index);
                    if (isPlaying && totalDuration > 0) {
                      // Calculate rough position based on prayer index
                      const sectionSize = totalDuration / prayers.length;
                      const newPosition = index * sectionSize;
                      audioManager.seekTo(newPosition);
                    }
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.prayerHeader}>
                    <Text style={[styles.prayerTitle, { fontSize: textSizes.prayerTitle }]}>
                      {prayer.title}
                    </Text>

                    {currentPrayerIndex === index && autoScroll && isPlaying && (
                      <View
                        style={[styles.activePrayerIndicator, { backgroundColor: theme.primary }]}
                      >
                        <AntDesign name="sound" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <View style={styles.prayerTextContainer}>
                    {prayer.content.map((paragraph, pIndex) => (
                      <Text
                        key={`p-${index}-${pIndex}`}
                        style={[
                          styles.prayerText,
                          { fontSize: textSizes.prayerText },
                          paragraph.type === "response" && styles.responseText,
                          paragraph.type === "instruction" && styles.instructionText,
                        ]}
                      >
                        {paragraph.text}
                      </Text>
                    ))}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>

      {/* Auto-scroll Toast */}
      {showAutoScrollToast && (
        <Animated.View
          style={[
            styles.autoScrollToast,
            {
              backgroundColor: theme.primary,
              transform: [{ translateY: toastAnim }],
            },
          ]}
        >
          <Text style={styles.autoScrollToastText}>
            {autoScroll ? "Auto-Scroll Enabled" : "Auto-Scroll Disabled"}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 230,
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
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 18,
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    marginTop: 2,
  },
  textSizeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  audioControlsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 5,
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
  seekBarContainer: {
    height: 20,
    justifyContent: "center",
    marginBottom: 12,
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
  controlButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 12,
  },
  controlButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 60,
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  advancedControlsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  advancedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  advancedButtonText: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  guideIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  guideText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  navigationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  navigationButtonText: {
    fontSize: 15,
    fontWeight: "700",
    marginHorizontal: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  mysteryDescriptionContainer: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  mysteryBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  mysteryTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#242424",
    textAlign: "center",
    marginBottom: 12,
  },
  mysteryDescription: {
    fontSize: 16,
    color: "#555555",
    textAlign: "center",
    lineHeight: 24,
  },
  prayerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  prayerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  prayerTitle: {
    fontWeight: "700",
    color: "#242424",
    flex: 1,
  },
  activePrayerIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  prayerTextContainer: {
    padding: 20,
  },
  prayerText: {
    color: "#333333",
    lineHeight: 28,
    marginBottom: 16,
  },
  responseText: {
    fontStyle: "italic",
    color: "#666666",
    marginLeft: 20,
  },
  instructionText: {
    fontWeight: "700",
    color: "#0ACF83",
  },
  bottomSpacing: {
    height: 40,
  },
  autoScrollToast: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  autoScrollToastText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
