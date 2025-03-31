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
  BackHandler
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
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
        matthew: require('../../../../assets/audio/rosary1.mp3'),
        mark: require('../../../../assets/audio/rosary1.mp3'),
        elizabeth: require('../../../../assets/audio/rosary2.mp3'),
        marie: require('../../../../assets/audio/rosary2.mp3'),
      }
    },
    sorrowful: {
      name: 'Sorrowful Mysteries',
      key: 'SORROWFUL',
      audioFiles: {
        matthew: require('../../../../assets/audio/rosary1.mp3'),
        mark: require('../../../../assets/audio/rosary1.mp3'),
        elizabeth: require('../../../../assets/audio/rosary1.mp3'),
        marie: require('../../../../assets/audio/rosary1.mp3'),
      }
    },
    glorious: {
      name: 'Glorious Mysteries',
      key: 'GLORIOUS',
      audioFiles: {
        matthew: require('../../../../assets/audio/rosary1.mp3'),
        mark: require('../../../../assets/audio/rosary1.mp3'),
        elizabeth: require('../../../../assets/audio/rosary1.mp3'),
        marie: require('../../../../assets/audio/rosary1.mp3'),
      }
    },
    luminous: {
      name: 'Luminous Mysteries',
      key: 'LUMINOUS',
      audioFiles: {
        matthew: require('../../../../assets/audio/rosary1.mp3'),
        mark: require('../../../../assets/audio/rosary1.mp3'),
        elizabeth: require('../../../../assets/audio/rosary1.mp3'),
        marie: require('../../../../assets/audio/rosary1.mp3'),
      }
    }
  };
  
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
        audioFile = require('../../../../assets/audio/rosary1.mp3');
      }
      
      setAudioSource(audioFile);
    } catch (error) {
      console.error('Failed to load audio:', error);
      
      // Fallback to null if the file doesn't exist
      setAudioSource(null);
    }
  };

  // Handle voice selection
  const handleVoiceChange = (voice) => {
    // Set transitioning flag to trigger animation/transition
    setIsTransitioning(true);
    
    // Use setTimeout to create a smooth transition effect
    setTimeout(() => {
      setCurrentVoice(voice);
      setIsTransitioning(false);
    }, 300); // 300ms transition
    
    setShowGuideSelector(false);
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
  
  // Audio playback callbacks
  const handlePlaybackStatusChange = (status) => {
    if (status.isPlaying !== isPlaying) {
      setIsPlaying(status.isPlaying);
      setIsPraying(status.isPlaying);
    }
  };
  
  const handleAudioComplete = () => {
    console.log('Audio playback completed');
  };
  
  const navigateToNextScreen = () => {
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
  };
  
  const navigateToPreviousScreen = () => {
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
  };
  
  // Get mystery content only after mysteryType is set
  const { introductionPrayer, mysteries } = getMysteryContent();
  
  // Render Voice Selector Modal
  const renderVoiceSelector = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showGuideSelector}
        onRequestClose={() => setShowGuideSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Voice</Text>
            
            {Object.keys(voiceOptions).map((voiceKey) => (
              <TouchableOpacity
                key={voiceKey}
                style={[
                  styles.guideOption,
                  currentVoice === voiceKey && styles.selectedGuideOption
                ]}
                onPress={() => handleVoiceChange(voiceKey)}
              >
                <Text style={styles.guideTitle}>{voiceOptions[voiceKey].name}</Text>
                <Text style={styles.guideDescription}>{voiceOptions[voiceKey].description}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowGuideSelector(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Render Finish Prayer button
  const renderFinishButton = () => {
    // Only show the finish button if the user has been praying for at least 30 seconds
    if (elapsedTime < 30) {
      return null;
    }
    
    return (
      <View style={styles.finishButtonContainer}>
        <TouchableOpacity
          style={styles.finishButton}
          onPress={handlePrayerCompletion}
        >
          <Text style={styles.finishButtonText}>Finish Prayer</Text>
          <FontAwesome5 name="check" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
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
          <Text style={styles.title}>Introduction</Text>
          <Text style={styles.mysteryTitle}>{mysteryTypeData[currentMysteryType]?.name || currentMysteryType.toUpperCase()}</Text>
          <Text style={styles.prayer}>{introductionPrayer}</Text>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Sign of the Cross</Text>
            <Text style={styles.prayer}>In the name of the Father, and of the Son, and of the Holy Spirit. Amen.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Apostles' Creed</Text>
            <Text style={styles.prayer}>I believe in God, the Father Almighty, Creator of heaven and earth; and in Jesus Christ, His only Son, our Lord; who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died, and was buried. He descended into hell; the third day He arose again from the dead. He ascended into heaven, sits at the right hand of God, the Father Almighty; from thence He shall come to judge the living and the dead. I believe in the Holy Spirit, the Holy Catholic Church, the communion of Saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Our Father</Text>
            <Text style={styles.prayer}>Our Father, who art in heaven, hallowed be Thy name; Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Three Hail Marys</Text>
            <Text style={styles.prayer}>Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen. (3x)</Text>
          </View>
          
          <View style={styles.prayerContainer}>
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
          <Text style={styles.title}>Decade {currentDecade}</Text>
          <Text style={styles.mysteryTitle}>{mysteries[currentDecade - 1]}</Text>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Announcement of the Mystery</Text>
            <Text style={styles.prayer}>Let us contemplate {mysteries[currentDecade - 1]}.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Our Father</Text>
            <Text style={styles.prayer}>Our Father, who art in heaven, hallowed be Thy name; Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Ten Hail Marys</Text>
            <Text style={styles.prayer}>Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen. (10x)</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Glory Be</Text>
            <Text style={styles.prayer}>Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
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
          <Text style={styles.title}>Conclusion</Text>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Hail Holy Queen</Text>
            <Text style={styles.prayer}>Hail, Holy Queen, Mother of Mercy, our life, our sweetness and our hope! To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears. Turn, then, most gracious Advocate, thine eyes of mercy toward us, and after this, our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Pray for us, O Holy Mother of God</Text>
            <Text style={styles.prayer}>That we may be made worthy of the promises of Christ.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Final Prayer</Text>
            <Text style={styles.prayer}>Let us pray. O God, whose only-begotten Son, by His life, death and resurrection, has purchased for us the rewards of eternal life; grant, we beseech Thee, that by meditating upon these mysteries of the Most Holy Rosary of the Blessed Virgin Mary, we may imitate what they contain and obtain what they promise, through the same Christ our Lord. Amen.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
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
      {/* Header with voice selector button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {mysteryTypeData[mysteryType]?.name || 'Rosary Prayer'}
        </Text>
        <TouchableOpacity 
          style={styles.guideButton}
          onPress={() => setShowGuideSelector(true)}
        >
          <Ionicons name="mic" size={24} color="#fff" />
          <Text style={styles.guideButtonText}>Voice: {voiceOptions[currentVoice]?.name}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Prayer timer display */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>
          Prayer time: {formatTime(elapsedTime)}
        </Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {renderContent()}
        
        {/* Audio Player Component */}
        <View style={styles.audioPlayerContainer}>
          {audioSource ? (
            <AudioPlayer
              audioFile={audioSource}
              theme={{
                primary: '#3f51b5',
                secondary: '#7986cb',
                accent: '#e91e63'
              }}
              onPlaybackStatusChange={handlePlaybackStatusChange}
              autoPlayOnMount={false} // Set to false to prevent auto-start
              playbackRate={1.0}
              loopAudio={true}
              showSpeedControl={true}
              onComplete={handleAudioComplete}
              isPlaying={isPlaying} // Use this prop to control playing state
            />
          ) : (
            <Text style={styles.audioPlayerPlaceholder}>
              Audio player will appear here when audio file is available.
            </Text>
          )}
        </View>
        
        <View style={styles.navigationContainer}>
          {(currentScreen !== 'introduction') && (
            <TouchableOpacity 
              style={styles.navigationButton} 
              onPress={navigateToPreviousScreen}
            >
              <Text style={styles.buttonText}>Previous</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.navigationButton} 
            onPress={navigateToNextScreen}
          >
            <Text style={styles.buttonText}>
              {currentScreen === 'conclusion' ? 'Finish' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Finish Prayer Button - Shows after 30 seconds of prayer */}
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
  header: {
    backgroundColor: '#3f51b5',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  guideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 5,
    paddingHorizontal: 12,
  },
  guideButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '500',
  },
  timerContainer: {
    backgroundColor: '#E8EAF6',
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#C5CAE9',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3F51B5',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20
  },
  contentContainer: {
    flex: 1,
    marginBottom: 20,
    opacity: 1,
    transition: 'opacity 0.3s'
  },
  fadeContent: {
    opacity: 0.4
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333'
  },
  mysteryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#3f51b5'
  },
  prayerContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  prayerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#555'
  },
  prayer: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444'
  },
  // Audio player styles
  audioPlayerContainer: {
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    minHeight: 80,
  },
  audioPlayerPlaceholder: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20
  },
  navigationButton: {
    backgroundColor: '#3f51b5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  // Finish button styles
  finishButtonContainer: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50', // Green color
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginRight: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#3f51b5'
  },
  guideOption: {
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: '#f5f5f5'
  },
  selectedGuideOption: {
    backgroundColor: '#e8eaf6',
    borderWidth: 1,
    borderColor: '#3f51b5'
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3f51b5',
    marginBottom: 5
  },
  guideDescription: {
    fontSize: 14,
    color: '#666'
  },
  closeButton: {
    backgroundColor: '#3f51b5',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default RosaryPrayer;