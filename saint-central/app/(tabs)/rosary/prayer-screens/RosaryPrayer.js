import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Platform, 
  Modal,
  Alert,
  BackHandler,
  ActivityIndicator,
  Animated
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import RosaryPrayerBase from '../components/RosaryPrayerBase';
import AudioPlayer from '../components/AudioPlayer';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useRouter, useNavigation } from 'expo-router';

const RosaryPrayer = ({ route }) => {
  // Use router instead of navigation prop
  const router = useRouter();
  const navigation = useNavigation();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Initialize with default values
  const [currentScreen, setCurrentScreen] = useState('introduction');
  const [currentDecade, setCurrentDecade] = useState(1);
  const [mysteryType, setMysteryType] = useState(null);
  const [mysteryKey, setMysteryKey] = useState(null);
  const [audioSource, setAudioSource] = useState(null);
  const [showGuideSelector, setShowGuideSelector] = useState(false);
  const [currentVoice, setCurrentVoice] = useState('matthew');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Timer state for prayer tracking
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPraying, setIsPraying] = useState(false);
  const timerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Add state for tracking audio playback position
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(1); // Default to 1 to avoid division by zero
  const [positionPercentage, setPositionPercentage] = useState(0);
  const [initialSeekPosition, setInitialSeekPosition] = useState(null);
  
  // Reference to the current sound object
  const soundRef = useRef(null);
  
  // Available voice narrators
  const voiceOptions = {
    matthew: { name: 'Matthew', description: 'Calm, meditative male voice' },
    mark: { name: 'Mark', description: 'Traditional, reverent male voice' },
    elizabeth: { name: 'Elizabeth', description: 'Gentle, soothing female voice' },
    marie: { name: 'Marie', description: 'Contemplative female voice' }
  };
  
  // Mystery type mapping to days and audio files with different voice narrators
  const mysteryTypeData = {
    joyful: {
      name: 'Joyful Mysteries',
      key: 'JOYFUL',
      audioFiles: {
        matthew: require('../../../../assets/audio/rosaryjoy-man1.mp3'),
        mark: require('../../../../assets/audio/rosaryjoy-man2.mp3'),
        elizabeth: require('../../../../assets/audio/rosaryjoy-nat.mp3'),
        marie: require('../../../../assets/audio/rosaryjoy-woman.mp3'),
      }
    },
    sorrowful: {
      name: 'Sorrowful Mysteries',
      key: 'SORROWFUL',
      audioFiles: {
        matthew: require('../../../../assets/audio/rosarysorrow-man1.mp3'),
        mark: require('../../../../assets/audio/rosarysorrow-man2.mp3'),
        elizabeth: require('../../../../assets/audio/rosarysorrow-nat.mp3'),
        marie: require('../../../../assets/audio/rosarysorrrow-woman.mp3'),
      }
    },
    glorious: {
      name: 'Glorious Mysteries',
      key: 'GLORIOUS',
      audioFiles: {
        matthew: require('../../../../assets/audio/rosaryglory-man1.mp3'),
        mark: require('../../../../assets/audio/rosaryglory-man2.mp3'),
        elizabeth: require('../../../../assets/audio/rosaryglory-nat.mp3'),
        marie: require('../../../../assets/audio/rosaryglory-woman.mp3'),
      }
    },
    luminous: {
      name: 'Luminous Mysteries',
      key: 'LUMINOUS',
      audioFiles: {
        matthew: require('../../../../assets/audio/rosarylumin-man1.mp3'),
        mark: require('../../../../assets/audio/rosarylumin-man2.mp3'),
        elizabeth: require('../../../../assets/audio/rosarylumin-nat.mp3'),
        marie: require('../../../../assets/audio/rosarylumin-women.mp3'),
      }
    }
  };
  
  // Get mystery theme color based on the mystery type
  const getMysteryThemeColor = () => {
    switch (mysteryKey) {
      case 'JOYFUL':
        return {
          primary: '#4CAF50',
          secondary: '#E8F5E9',
          accent: '#81C784'
        };
      case 'SORROWFUL':
        return {
          primary: '#9C27B0',
          secondary: '#F3E5F5',
          accent: '#BA68C8'
        };
      case 'GLORIOUS':
        return {
          primary: '#FFC107',
          secondary: '#FFF8E1',
          accent: '#FFD54F'
        };
      case 'LUMINOUS':
        return {
          primary: '#2196F3',
          secondary: '#E3F2FD',
          accent: '#64B5F6'
        };
      default:
        return {
          primary: '#3f51b5',
          secondary: '#E8EAF6',
          accent: '#7986CB'
        };
    }
  };
  
  const themeColors = getMysteryThemeColor();
  
  // Set up event listeners for screen focus/blur
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      // Don't auto-start when screen comes into focus
      console.log('Screen focused');
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      // Pause audio when navigating away - update our state which will affect audio
      setIsPlaying(false);
      setIsPraying(false);
      console.log('Screen blurred - audio paused');
    });
    
    // Add back button handler to pause audio when back button is pressed
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsPlaying(false);
      setIsPraying(false);
      return false; // Don't prevent default back behavior
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
      backHandler.remove();
    };
  }, [navigation]);
  
  // Initialize the mystery type based on the day and configure audio
  useEffect(() => {
    // Try to get mystery type from route params if available
    const paramMysteryType = route?.params?.mysteryType?.toLowerCase();
    const paramMysteryKey = route?.params?.mysteryKey;
    
    if (paramMysteryType) {
      setMysteryType(paramMysteryType);
      if (paramMysteryKey) {
        setMysteryKey(paramMysteryKey);
      } else if (mysteryTypeData[paramMysteryType]?.key) {
        setMysteryKey(mysteryTypeData[paramMysteryType].key);
      }
    } else {
      // Default to today's mystery if no params
      const todaysMystery = getTodaysMystery();
      setMysteryType(todaysMystery);
      setMysteryKey(mysteryTypeData[todaysMystery]?.key || 'JOYFUL');
    }
    
    // Configure audio to play in silent mode
    configureAudio();
    
    // Cleanup function
    return () => {
      // Reset audio mode when component unmounts
      resetAudioMode();
      
      // Clear timer if it's running
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Ensure audio is stopped
      setIsPlaying(false);
      setIsPraying(false);
    };
  }, [route?.params?.mysteryType]);
  
  // Show modal animation
  useEffect(() => {
    if (showGuideSelector) {
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [showGuideSelector]);
  
  // Timer effect for tracking prayer time
  useEffect(() => {
    if (isPraying) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    } else if (!isPraying && timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPraying]);
  
  // Load appropriate audio when mystery type or voice narrator changes
  useEffect(() => {
    if (mysteryType && currentVoice) {
      loadAudioSource();
    }
  }, [mysteryType, currentVoice]);
  
  // Configure audio to play in silent mode
  const configureAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });
      console.log('Audio configured to play in silent mode');
    } catch (error) {
      console.error('Failed to configure audio:', error);
    }
  };
  
  // Reset audio mode on component unmount
  const resetAudioMode = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false
      });
    } catch (error) {
      console.error('Failed to reset audio mode:', error);
    }
  };
  
  // Define the mysteries based on the day of the week
  const getTodaysMystery = () => {
    const today = new Date().getDay();
    // Sunday: Glorious, Monday: Joyful, Tuesday: Sorrowful, 
    // Wednesday: Glorious, Thursday: Luminous, Friday: Sorrowful, Saturday: Joyful
    const mysteryByDay = {
      0: 'glorious',  // Sunday
      1: 'joyful',    // Monday
      2: 'sorrowful', // Tuesday
      3: 'glorious',  // Wednesday
      4: 'luminous',  // Thursday
      5: 'sorrowful', // Friday
      6: 'joyful'     // Saturday
    };
    
    return mysteryByDay[today];
  };
  
  // Load audio source based on the mystery type and voice narrator
  const loadAudioSource = () => {
    try {
      // Get the correct audio file for the current mystery and voice
      let audioFile;
      
      if (mysteryTypeData[mysteryType] && mysteryTypeData[mysteryType].audioFiles[currentVoice]) {
        audioFile = mysteryTypeData[mysteryType].audioFiles[currentVoice];
        console.log(`Loading audio for ${mysteryType} mysteries, ${currentVoice} voice`);
      } else {
        // Fallback to matthew voice if specific combination not found
        console.log('Specific audio not found, using fallback');
        audioFile = require('../../../../assets/audio/rosarysorrow-man2.mp3');
      }
      
      setAudioSource(audioFile);
    } catch (error) {
      console.error('Failed to load audio:', error);
      
      // Fallback to null if the file doesn't exist
      setAudioSource(null);
    }
  };

  // Handle voice selection with position memory
  const handleVoiceChange = (voice) => {
    // Set transitioning flag to trigger animation/transition
    setIsTransitioning(true);
    
    // Calculate and save the current position percentage before changing voice
    if (audioDuration > 0) {
      const percentage = audioPosition / audioDuration;
      setPositionPercentage(percentage);
      
      // Calculate the initial seek position in milliseconds
      const seekPos = Math.floor(audioPosition);
      console.log(`Saving position at ${Math.round(percentage * 100)}% (${seekPos}ms) before changing voice`);
      
      // Set the initial seek position for the new audio file
      setInitialSeekPosition(seekPos);
    } else {
      console.log('No audio duration available yet, cannot calculate position percentage');
      setInitialSeekPosition(null);
    }
    
    // Pause current audio to ensure clean transition
    if (isPlaying) {
      setIsPlaying(false);
    }
    
    // Use setTimeout to create a smooth transition effect
    setTimeout(() => {
      setCurrentVoice(voice);
      setIsTransitioning(false);
      
      // If audio was playing before voice change, resume playback after a short delay
      if (isPlaying) {
        setTimeout(() => {
          setIsPlaying(true);
        }, 500);
      }
    }, 300); // 300ms transition
    
    setShowGuideSelector(false);
  };

  // Audio playback callbacks
  const handlePlaybackStatusChange = (status) => {
    if (status.isPlaying !== isPlaying) {
      setIsPlaying(status.isPlaying);
      setIsPraying(status.isPlaying);
    }
    
    // Track current position and duration
    if (status.positionMillis !== undefined) {
      setAudioPosition(status.positionMillis);
    }
    
    if (status.durationMillis !== undefined && status.durationMillis > 0) {
      setAudioDuration(status.durationMillis);
    }
    
    // Store the sound object reference if it's available via status
    if (status.sound) {
      soundRef.current = status.sound;
    }
  };
  
  // Store sound object reference when audio is loaded
  const handleAudioLoad = (sound) => {
    if (sound) {
      soundRef.current = sound;
      console.log('Audio loaded, sound object stored');
    }
  };
  
  const handleAudioComplete = () => {
    console.log('Audio playback completed');
  };
  
  // Get prayers and mysteries based on mystery type
  const getMysteryContent = () => {
    const currentMysteryType = mysteryType || getTodaysMystery();
    
    // Standard introduction prayers for all mystery types
    const introductionPrayers = {
      joyful: "In the Joyful Mysteries, we contemplate the joy of Mary's heart in the Incarnation. We ask for the virtue of humility, love of neighbor, and detachment from the world.",
      sorrowful: "In the Sorrowful Mysteries, we contemplate the suffering and death of Our Lord. We ask for contrition for our sins, patience in adversity, and strength in temptation.",
      glorious: "In the Glorious Mysteries, we contemplate the victory of Christ and the glory of Mary. We ask for perseverance, devotion to Mary, and the grace of a happy death.",
      luminous: "In the Luminous Mysteries, we contemplate Christ's public ministry. We ask for openness to the Holy Spirit, Christian witness, and trust in Christ."
    };
    
    // Standard mysteries for all mystery types
    const mysteries = {
      joyful: [
        "The Annunciation",
        "The Visitation",
        "The Nativity",
        "The Presentation",
        "The Finding of Jesus in the Temple"
      ],
      sorrowful: [
        "The Agony in the Garden",
        "The Scourging at the Pillar",
        "The Crowning with Thorns",
        "The Carrying of the Cross",
        "The Crucifixion"
      ],
      glorious: [
        "The Resurrection",
        "The Ascension",
        "The Descent of the Holy Spirit",
        "The Assumption of Mary",
        "The Coronation of Mary"
      ],
      luminous: [
        "The Baptism in the Jordan",
        "The Wedding Feast at Cana",
        "The Proclamation of the Kingdom",
        "The Transfiguration",
        "The Institution of the Eucharist"
      ]
    };
    
    // Select the appropriate content based on the current mystery type
    const introductionPrayer = introductionPrayers[currentMysteryType] || introductionPrayers['joyful'];
    
    return {
      introductionPrayer,
      mysteries: mysteries[currentMysteryType] || mysteries['joyful']
    };
  };
  
  // Handle prayer completion
  const handlePrayerCompletion = async () => {
    try {
      // Make sure audio is paused first
      setIsPlaying(false);
      setIsPraying(false);
      
      // Create a prayer record
      const currentMysteryName = mysteryTypeData[mysteryType]?.name || (mysteryType || 'Unknown').toUpperCase();
      const prayerRecord = {
        mysteryType: currentMysteryName,
        mysteryKey: mysteryKey || 'JOYFUL',
        date: new Date().toISOString(),
        duration: elapsedTime, // Duration in seconds
        completed: true
      };
      
      // 1. Save to prayer history
      await savePrayerToHistory(prayerRecord);
      
      // 2. Update prayer statistics
      await updatePrayerStatistics(prayerRecord);
      
      // 3. Set a flag to notify other screens that a new prayer was completed
      await AsyncStorage.setItem('newPrayerCompleted', 'true');
      
      // Haptic feedback for completion
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Use router to navigate to PrayerStatistics
      router.push('/rosary/screens/PrayerStatistics');
    } catch (error) {
      console.error("Failed to record prayer completion:", error);
      // Show error toast or alert
      Alert.alert("Error", "Failed to save your prayer data. Please try again.");
    }
  };
  
  // Save the prayer to history
  const savePrayerToHistory = async (prayerRecord) => {
    try {
      // Get existing prayer history
      const historyJson = await AsyncStorage.getItem('prayerHistory');
      let history = [];
      
      if (historyJson) {
        history = JSON.parse(historyJson);
      }
      
      // Add new prayer to history
      history.unshift(prayerRecord); // Add to beginning of array
      
      // Save updated history
      await AsyncStorage.setItem('prayerHistory', JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save prayer to history:", error);
      throw error;
    }
  };
  
  // Update prayer statistics
  const updatePrayerStatistics = async (prayerRecord) => {
    try {
      // Get existing statistics
      const statsJson = await AsyncStorage.getItem('prayerStatistics');
      let stats = {
        streakDays: 0,
        longestStreak: 0,
        totalPrayers: 0,
        totalPrayerTime: 0,
        lastPrayed: null,
        streakHistory: []
      };
      
      if (statsJson) {
        stats = JSON.parse(statsJson);
      }
      
      // Increment total prayers
      stats.totalPrayers += 1;
      
      // Add prayer duration to total prayer time (converting seconds to minutes)
      stats.totalPrayerTime += Math.round(prayerRecord.duration / 60);
      
      // Calculate streak
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to midnight for date comparison
      
      const lastPrayedDate = stats.lastPrayed ? new Date(stats.lastPrayed) : null;
      if (lastPrayedDate) {
        lastPrayedDate.setHours(0, 0, 0, 0); // Set to midnight for date comparison
        
        // Check if this is a new day
        if (today.getTime() !== lastPrayedDate.getTime()) {
          // Check if this is a consecutive day (yesterday)
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (yesterday.getTime() === lastPrayedDate.getTime()) {
            // Consecutive day - increment streak
            stats.streakDays += 1;
          } else {
            // Streak broken - start new streak
            stats.streakDays = 1;
          }
        }
      } else {
        // First prayer - start streak
        stats.streakDays = 1;
      }
      
      // Update longest streak if current streak is longer
      if (stats.streakDays > stats.longestStreak) {
        stats.longestStreak = stats.streakDays;
      }
      
      // Update last prayed date
      stats.lastPrayed = new Date().toISOString();
      
      // Add to streak history for the bar graph
      // The streak history array is used to show prayer points over time
      if (!stats.streakHistory) {
        stats.streakHistory = [];
      }
      
      // Add a point to the streak history
      stats.streakHistory.push(1);
      
      // Save updated statistics
      await AsyncStorage.setItem('prayerStatistics', JSON.stringify(stats));
    } catch (error) {
      console.error("Failed to update prayer statistics:", error);
      throw error;
    }
  };
  
  // Modified navigation with animations
  const navigateToNextScreen = () => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Change screen
      if (currentScreen === 'introduction') {
        setCurrentScreen('decade');
      } else if (currentScreen === 'decade') {
        if (currentDecade < 5) {
          setCurrentDecade(currentDecade + 1);
        } else {
          setCurrentScreen('conclusion');
        }
      } else if (currentScreen === 'conclusion') {
        handlePrayerCompletion();
      }
      
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };
  
  const navigateToPreviousScreen = () => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Change screen
      if (currentScreen === 'decade') {
        if (currentDecade > 1) {
          setCurrentDecade(currentDecade - 1);
        } else {
          setCurrentScreen('introduction');
        }
      } else if (currentScreen === 'conclusion') {
        setCurrentScreen('decade');
        setCurrentDecade(5);
      }
      
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };
  
  // Get mystery content only after mysteryType is set
  const { introductionPrayer, mysteries } = getMysteryContent();
  
  // Render Voice Selector Modal
  const renderVoiceSelector = () => {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={showGuideSelector}
        onRequestClose={() => setShowGuideSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{ 
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0]
                  })
                }]
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: themeColors.primary}]}>Select a Voice</Text>
              <TouchableOpacity 
                style={styles.closeModalButton}
                onPress={() => setShowGuideSelector(false)}
              >
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>
            
            {Object.keys(voiceOptions).map((voiceKey) => (
              <TouchableOpacity
                key={voiceKey}
                style={[
                  styles.guideOption,
                  currentVoice === voiceKey && [
                    styles.selectedGuideOption, 
                    { borderColor: themeColors.primary }
                  ]
                ]}
                onPress={() => handleVoiceChange(voiceKey)}
              >
                <View style={[
                  styles.voiceIconContainer,
                  { backgroundColor: currentVoice === voiceKey ? `${themeColors.primary}20` : '#f5f5f5' }
                ]}>
                  <Ionicons 
                    name={currentVoice === voiceKey ? "mic" : "mic-outline"} 
                    size={20} 
                    color={currentVoice === voiceKey ? themeColors.primary : "#999"} 
                  />
                </View>
                <View style={styles.voiceTextContainer}>
                  <Text style={[
                    styles.guideTitle,
                    currentVoice === voiceKey && { color: themeColors.primary }
                  ]}>
                    {voiceOptions[voiceKey].name}
                  </Text>
                  <Text style={styles.guideDescription}>
                    {voiceOptions[voiceKey].description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </View>
      </Modal>
    );
  };
  
  // Updated renderFinishButton function
const renderFinishButton = () => {
  // Only show the finish button if the user has been praying for at least 30 seconds
  if (elapsedTime < 30) {
    return null;
  }
  
  return (
    <Animated.View 
      style={[
        styles.finishButtonContainer,
        {opacity: fadeAnim}
      ]}
    >
      <TouchableOpacity
        style={[styles.finishButton, {backgroundColor: '#4CAF50'}]}
        onPress={handlePrayerCompletion}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#4CAF50', '#3D9140']}
          style={styles.finishButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.finishButtonText}>Finish</Text>
          <FontAwesome5 name="check" size={16} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};
  
  const renderContent = () => {
    if (currentScreen === 'introduction') {
      const currentMysteryType = mysteryType || getTodaysMystery();
      
      return (
        <View style={[
          styles.contentContainer,
          isTransitioning && styles.fadeContent
        ]}>
          <Text style={[styles.title, {color: themeColors.primary}]}>Introduction</Text>
          
          <View style={styles.mysteryTitleContainer}>
            <View style={[styles.mysteryTitleAccent, {backgroundColor: themeColors.primary}]} />
            <Text style={[styles.mysteryTitle, {color: themeColors.primary}]}>
              {mysteryTypeData[currentMysteryType]?.name || currentMysteryType.toUpperCase()}
            </Text>
          </View>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayer}>{introductionPrayer}</Text>
          </View>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayerTitle}>Sign of the Cross</Text>
            <Text style={styles.prayer}>In the name of the Father, and of the Son, and of the Holy Spirit. Amen.</Text>
          </View>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayerTitle}>Apostles' Creed</Text>
            <Text style={styles.prayer}>I believe in God, the Father Almighty, Creator of heaven and earth; and in Jesus Christ, His only Son, our Lord; who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died, and was buried. He descended into hell; the third day He arose again from the dead. He ascended into heaven, sits at the right hand of God, the Father Almighty; from thence He shall come to judge the living and the dead. I believe in the Holy Spirit, the Holy Catholic Church, the communion of Saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.</Text>
          </View>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayerTitle}>Our Father</Text>
            <Text style={styles.prayer}>Our Father, who art in heaven, hallowed be Thy name; Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.</Text>
          </View>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayerTitle}>Three Hail Marys</Text>
            <Text style={styles.prayer}>Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen. (3x)</Text>
          </View>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayerTitle}>Glory Be</Text>
            <Text style={styles.prayer}>Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen.</Text>
          </View>
        </View>
      );
    } else if (currentScreen === 'decade') {
      return (
        <View style={[
          styles.contentContainer,
          isTransitioning && styles.fadeContent
        ]}>
          <Text style={[styles.title, {color: themeColors.primary}]}>Decade {currentDecade}</Text>
          
          <View style={styles.mysteryTitleContainer}>
            <View style={[styles.mysteryTitleAccent, {backgroundColor: themeColors.primary}]} />
            <Text style={[styles.mysteryTitle, {color: themeColors.primary}]}>
              {mysteries[currentDecade - 1]}
            </Text>
          </View>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayerTitle}>Announcement of the Mystery</Text>
            <Text style={styles.prayer}>Let us contemplate {mysteries[currentDecade - 1]}.</Text>
          </View>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayerTitle}>Our Father</Text>
            <Text style={styles.prayer}>Our Father, who art in heaven, hallowed be Thy name; Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.</Text>
          </View>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayerTitle}>Ten Hail Marys</Text>
            <Text style={styles.prayer}>Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen. (10x)</Text>
          </View>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayerTitle}>Glory Be</Text>
            <Text style={styles.prayer}>Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen.</Text>
          </View>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayerTitle}>Fatima Prayer</Text>
            <Text style={styles.prayer}>O my Jesus, forgive us our sins, save us from the fires of hell, lead all souls to heaven, especially those in most need of Thy mercy.</Text>
          </View>
        </View>
      );
    } else if (currentScreen === 'conclusion') {
      return (
        <View style={[
          styles.contentContainer,
          isTransitioning && styles.fadeContent
        ]}>
          <Text style={[styles.title, {color: themeColors.primary}]}>Conclusion</Text>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayerTitle}>Hail Holy Queen</Text>
            <Text style={styles.prayer}>Hail, Holy Queen, Mother of Mercy, our life, our sweetness and our hope! To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears. Turn, then, most gracious Advocate, thine eyes of mercy toward us, and after this, our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary.</Text>
          </View>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayerTitle}>Pray for us, O Holy Mother of God</Text>
            <Text style={styles.prayer}>That we may be made worthy of the promises of Christ.</Text>
          </View>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayerTitle}>Final Prayer</Text>
            <Text style={styles.prayer}>Let us pray. O God, whose only-begotten Son, by His life, death and resurrection, has purchased for us the rewards of eternal life; grant, we beseech Thee, that by meditating upon these mysteries of the Most Holy Rosary of the Blessed Virgin Mary, we may imitate what they contain and obtain what they promise, through the same Christ our Lord. Amen.</Text>
          </View>
          
          <View style={[styles.prayerContainer, {borderLeftColor: themeColors.primary}]}>
            <Text style={styles.prayerTitle}>Sign of the Cross</Text>
            <Text style={styles.prayer}>In the name of the Father, and of the Son, and of the Holy Spirit. Amen.</Text>
          </View>
        </View>
      );
    }
  };
  
  // Prayer timer display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with gradient background */}
      <LinearGradient
        colors={[themeColors.primary, themeColors.accent]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {mysteryTypeData[mysteryType]?.name || 'Rosary Prayer'}
          </Text>
          <TouchableOpacity 
            style={styles.guideButton}
            onPress={() => setShowGuideSelector(true)}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.guideBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="mic" size={20} color="#fff" />
              <Text style={styles.guideButtonText}>Voice: {voiceOptions[currentVoice]?.name}</Text>
              <Ionicons name="chevron-down" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      {/* Enhanced Prayer timer display */}
      <View style={styles.timerContainer}>
        <View style={styles.timerInner}>
          <Ionicons name="time-outline" size={18} color={themeColors.primary} />
          <Text style={[styles.timerText, {color: themeColors.primary}]}>
            {formatTime(elapsedTime)}
          </Text>
        </View>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animated.View style={{opacity: fadeAnim}}>
          {renderContent()}
        </Animated.View>
        
        {/* Enhanced Audio Player Component */}
        <View style={[styles.audioPlayerContainer, {backgroundColor: `${themeColors.primary}10`}]}>
          {audioSource ? (
            <AudioPlayer
              audioFile={audioSource}
              theme={{
                primary: themeColors.primary,
                secondary: themeColors.accent,
                accent: themeColors.primary
              }}
              onPlaybackStatusChange={handlePlaybackStatusChange}
              onAudioLoad={handleAudioLoad}
              autoPlayOnMount={false}
              playbackRate={1.0}
              loopAudio={true}
              showSpeedControl={true}
              onComplete={handleAudioComplete}
              isPlaying={isPlaying}
              initialSeekPosition={initialSeekPosition}
            />
          ) : (
            <View style={styles.audioPlayerPlaceholder}>
              <Text style={styles.audioPlayerPlaceholderText}>
                Loading audio for {mysteryTypeData[mysteryType]?.name || 'Rosary Prayer'}...
              </Text>
              <ActivityIndicator size="small" color={themeColors.primary} style={{marginTop: 8}} />
            </View>
          )}
        </View>
        
        {/* Enhanced Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {(currentScreen !== 'introduction') && (
            <TouchableOpacity 
              style={[styles.navigationButton, styles.navigationButtonSecondary]} 
              onPress={navigateToPreviousScreen}
              activeOpacity={0.8}
            >
              <Ionicons 
                name="arrow-back" 
                size={18} 
                color="#666" 
                style={{marginRight: 8}}
              />
              <Text style={styles.buttonTextSecondary}>Previous</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.navigationButton, styles.navigationButtonPrimary, {backgroundColor: themeColors.primary}]} 
            onPress={navigateToNextScreen}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {currentScreen === 'conclusion' ? 'Finish' : 'Next'}
            </Text>
            <Ionicons 
              name={currentScreen === 'conclusion' ? 'checkmark-circle' : 'arrow-forward'} 
              size={18} 
              color="#fff" 
              style={{marginLeft: 8}}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Finish Prayer Button */}
      {renderFinishButton()}
      
      {/* Voice Selector Modal */}
      {renderVoiceSelector()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8'
  },
  headerGradient: {
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  guideButton: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  guideBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  guideButtonText: {
    color: 'white',
    marginLeft: 6,
    marginRight: 6,
    fontWeight: '500',
  },
  timerContainer: {
    backgroundColor: '#f8f9ff',
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAF6',
  },
  timerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20
  },
  contentContainer: {
    flex: 1,
    marginBottom: 20,
  },
  fadeContent: {
    opacity: 0.4
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  mysteryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  mysteryTitleAccent: {
    width: 24,
    height: 2,
    marginRight: 12,
  },
  mysteryTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  prayerContainer: {
    marginBottom: 24,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
  },
  prayerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#444',
  },
  prayer: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444'
  },
  // Enhanced Audio player styles
  audioPlayerContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3f51b5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  audioPlayerPlaceholder: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    minHeight: 100,
  },
  audioPlayerPlaceholderText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  // Enhanced Navigation buttons
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  navigationButtonPrimary: {
    backgroundColor: '#3f51b5',
  },
  navigationButtonSecondary: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
buttonTextSecondary: {
  color: '#444',
  fontSize: 16,
  fontWeight: 'bold'
},
// Enhanced Finish button styles (moved to side)
finishButtonContainer: {
  position: 'absolute',
  bottom: 20,
  right: 20,
  zIndex: 10,
},
finishButton: {
  overflow: 'hidden',
  borderRadius: 30,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
},
finishButtonGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
},
finishButtonText: {
  fontSize: 16,
  fontWeight: "700",
  color: "#FFFFFF",
  marginRight: 6,
},
  // Enhanced Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  closeModalButton: {
    padding: 4,
  },
  guideOption: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedGuideOption: {
    backgroundColor: '#f5f7ff',
    borderWidth: 1,
  },
  voiceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  voiceTextContainer: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 4,
  },
  guideDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default RosaryPrayer;