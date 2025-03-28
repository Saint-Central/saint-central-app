import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Slider,
  SafeAreaView,
  Modal,
  FlatList,
  Image,
  Alert,
} from "react-native";
import { AntDesign, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

// Voice guides
const VOICE_GUIDES = [
  { id: 1, name: "Francis", gender: "male" },
  { id: 2, name: "Claire", gender: "female" },
  { id: 3, name: "Thomas", gender: "male" },
  { id: 4, name: "Maria", gender: "female" },
];

// Audio durations
const AUDIO_DURATIONS = [
  { id: 1, duration: "15 min", multiplier: 1.5 },
  { id: 2, duration: "20 min", multiplier: 1.0 },
  { id: 3, duration: "25 min", multiplier: 0.75 },
  { id: 4, duration: "30 min", multiplier: 0.5 },
];

// Language options
const LANGUAGES = [
  { id: 1, name: "English", code: "en" },
  { id: 2, name: "Spanish", code: "es" },
  { id: 3, name: "Latin", code: "la" },
  { id: 4, name: "Italian", code: "it" },
  { id: 5, name: "French", code: "fr" },
  { id: 6, name: "Polish", code: "pl" },
  { id: 7, name: "Portuguese", code: "pt" },
];

// Prayer themes
const PRAYER_THEMES = [
  { 
    id: 1, 
    name: "Standard", 
    primary: "#7158e2",
    secondary: "#5F45C2",
    accent: "#F0ECFF",
  },
  { 
    id: 2, 
    name: "Tranquil", 
    primary: "#0ACF83",
    secondary: "#07A866",
    accent: "#E8FFF4",
  },
  { 
    id: 3, 
    name: "Traditional", 
    primary: "#B33C86",
    secondary: "#9A256F",
    accent: "#FCE4F4",
  },
  { 
    id: 4, 
    name: "Peaceful", 
    primary: "#18DCFF",
    secondary: "#0ABDE3",
    accent: "#E4F9FF",
  },
  { 
    id: 5, 
    name: "Desert", 
    primary: "#F89D29",
    secondary: "#EB8B19",
    accent: "#FFF2E2",
  },
];

export default function RosarySettings() {
  const router = useRouter();
  
  // State management
  const [selectedGuide, setSelectedGuide] = useState(VOICE_GUIDES[0]);
  const [selectedDuration, setSelectedDuration] = useState(AUDIO_DURATIONS[1]);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [selectedTheme, setSelectedTheme] = useState(PRAYER_THEMES[0]);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [showImages, setShowImages] = useState(true);
  const [textSize, setTextSize] = useState(50); // 0-100 scale
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [allowScreenDimming, setAllowScreenDimming] = useState(false);
  const [backgroundAmbience, setBackgroundAmbience] = useState(true);
  const [reminders, setReminders] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Modal states
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  
  // Load saved settings on mount
  useEffect(() => {
    loadSettings();
  }, []);
  
  // Load settings from AsyncStorage
  const loadSettings = async () => {
    try {
      const settingsJson = await AsyncStorage.getItem('rosarySettings');
      if (settingsJson !== null) {
        const settings = JSON.parse(settingsJson);
        
        // Apply loaded settings
        if (settings.guide) {
          setSelectedGuide(VOICE_GUIDES.find(g => g.id === settings.guide.id) || VOICE_GUIDES[0]);
        }
        
        if (settings.duration) {
          setSelectedDuration(AUDIO_DURATIONS.find(d => d.id === settings.duration.id) || AUDIO_DURATIONS[1]);
        }
        
        if (settings.language) {
          setSelectedLanguage(LANGUAGES.find(l => l.id === settings.language.id) || LANGUAGES[0]);
        }
        
        if (settings.theme) {
          setSelectedTheme(PRAYER_THEMES.find(t => t.id === settings.theme.id) || PRAYER_THEMES[0]);
        }
        
        if (settings.autoPlayNext !== undefined) setAutoPlayNext(settings.autoPlayNext);
        if (settings.showImages !== undefined) setShowImages(settings.showImages);
        if (settings.textSize !== undefined) setTextSize(settings.textSize);
        if (settings.vibrationEnabled !== undefined) setVibrationEnabled(settings.vibrationEnabled);
        if (settings.allowScreenDimming !== undefined) setAllowScreenDimming(settings.allowScreenDimming);
        if (settings.backgroundAmbience !== undefined) setBackgroundAmbience(settings.backgroundAmbience);
        if (settings.reminders !== undefined) setReminders(settings.reminders);
        if (settings.notificationsEnabled !== undefined) setNotificationsEnabled(settings.notificationsEnabled);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };
  
  // Save settings to AsyncStorage
  const saveSettings = async () => {
    try {
      const settings = {
        guide: selectedGuide,
        duration: selectedDuration,
        language: selectedLanguage,
        theme: selectedTheme,
        autoPlayNext,
        showImages,
        textSize,
        vibrationEnabled,
        allowScreenDimming,
        backgroundAmbience,
        reminders,
        notificationsEnabled,
      };
      
      await AsyncStorage.setItem('rosarySettings', JSON.stringify(settings));
      
      // Provide feedback
      if (vibrationEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert(
        "Settings Saved",
        "Your prayer preferences have been saved successfully.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Failed to save settings:", error);
      
      Alert.alert(
        "Error",
        "Failed to save settings. Please try again.",
        [{ text: "OK" }]
      );
    }
  };
  
  // Reset settings to defaults
  const resetSettings = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all settings to default values?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reset",
          onPress: async () => {
            setSelectedGuide(VOICE_GUIDES[0]);
            setSelectedDuration(AUDIO_DURATIONS[1]);
            setSelectedLanguage(LANGUAGES[0]);
            setSelectedTheme(PRAYER_THEMES[0]);
            setAutoPlayNext(true);
            setShowImages(true);
            setTextSize(50);
            setVibrationEnabled(true);
            setAllowScreenDimming(false);
            setBackgroundAmbience(true);
            setReminders(false);
            setNotificationsEnabled(false);
            
            // Clear saved settings
            await AsyncStorage.removeItem('rosarySettings');
            
            // Provide feedback
            if (vibrationEnabled) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            
            Alert.alert(
              "Settings Reset",
              "All settings have been reset to their default values.",
              [{ text: "OK" }]
            );
          },
          style: "destructive"
        }
      ]
    );
  };
  
  // Toggle switch with haptic feedback
  const toggleSwitch = (value, setter) => {
    setter(value);
    
    if (vibrationEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  // Render guide selection modal
  const renderGuideModal = () => (
    <Modal
      visible={showGuideModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowGuideModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Guide</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowGuideModal(false)}
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
                    { backgroundColor: `${selectedTheme.primary}15` }
                  ]
                ]}
                onPress={() => {
                  setSelectedGuide(item);
                  setShowGuideModal(false);
                  
                  if (vibrationEnabled) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <View style={[
                  styles.modalItemIcon,
                  selectedGuide.id === item.id && { backgroundColor: selectedTheme.primary }
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
                    selectedGuide.id === item.id && { color: selectedTheme.primary, fontWeight: '700' }
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={styles.modalItemSubtitle}>
                    {item.gender === "male" ? "Male Voice" : "Female Voice"}
                  </Text>
                </View>
                
                {selectedGuide.id === item.id && (
                  <AntDesign name="check" size={22} color={selectedTheme.primary} />
                )}
              </TouchableOpacity>
            )}
          />
          
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Voice Preview:</Text>
            <TouchableOpacity 
              style={[styles.previewButton, { backgroundColor: selectedTheme.primary }]}
              onPress={() => {
                // Play voice sample (would trigger actual audio in a real app)
                if (vibrationEnabled) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
              }}
            >
              <AntDesign name="sound" size={20} color="#FFFFFF" />
              <Text style={styles.previewButtonText}>Play Sample</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // Render duration selection modal
  const renderDurationModal = () => (
    <Modal
      visible={showDurationModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDurationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Duration</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowDurationModal(false)}
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
                    { backgroundColor: `${selectedTheme.primary}15` }
                  ]
                ]}
                onPress={() => {
                  setSelectedDuration(item);
                  setShowDurationModal(false);
                  
                  if (vibrationEnabled) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <View style={[
                  styles.modalItemIcon,
                  selectedDuration.id === item.id && { backgroundColor: selectedTheme.primary }
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
                    selectedDuration.id === item.id && { color: selectedTheme.primary, fontWeight: '700' }
                  ]}>
                    {item.duration}
                  </Text>
                  <Text style={styles.modalItemSubtitle}>
                    {item.id === 2 ? "Standard pace" : 
                     item.id < 2 ? "Faster pace" : "Slower pace"}
                  </Text>
                </View>
                
                {selectedDuration.id === item.id && (
                  <AntDesign name="check" size={22} color={selectedTheme.primary} />
                )}
              </TouchableOpacity>
            )}
          />
          
          <View style={styles.durationExplanation}>
            <Text style={styles.durationExplanationText}>
              The duration setting affects how quickly prayers are recited in audio mode. 
              Shorter durations use a faster pace, while longer durations use a more contemplative pace.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // Render language selection modal
  const renderLanguageModal = () => (
    <Modal
      visible={showLanguageModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowLanguageModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Language</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowLanguageModal(false)}
            >
              <AntDesign name="close" size={20} color="#333" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={LANGUAGES}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  selectedLanguage.id === item.id && [
                    styles.modalItemSelected,
                    { backgroundColor: `${selectedTheme.primary}15` }
                  ]
                ]}
                onPress={() => {
                  setSelectedLanguage(item);
                  setShowLanguageModal(false);
                  
                  if (vibrationEnabled) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <View style={[
                  styles.modalItemIcon,
                  selectedLanguage.id === item.id && { backgroundColor: selectedTheme.primary }
                ]}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: selectedLanguage.id === item.id ? "#FFFFFF" : "#666"
                  }}>
                    {item.code.toUpperCase()}
                  </Text>
                </View>
                
                <View style={styles.modalItemContent}>
                  <Text style={[
                    styles.modalItemTitle,
                    selectedLanguage.id === item.id && { color: selectedTheme.primary, fontWeight: '700' }
                  ]}>
                    {item.name}
                  </Text>
                </View>
                
                {selectedLanguage.id === item.id && (
                  <AntDesign name="check" size={22} color={selectedTheme.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
  
  // Render theme selection modal
  const renderThemeModal = () => (
    <Modal
      visible={showThemeModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowThemeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Theme</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowThemeModal(false)}
            >
              <AntDesign name="close" size={20} color="#333" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={PRAYER_THEMES}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.themeModalItem,
                  selectedTheme.id === item.id && styles.themeModalItemSelected
                ]}
                onPress={() => {
                  setSelectedTheme(item);
                  setShowThemeModal(false);
                  
                  if (vibrationEnabled) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <LinearGradient
                  colors={[item.primary, item.secondary]}
                  style={styles.themeGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.themeName}>{item.name}</Text>
                  
                  {selectedTheme.id === item.id && (
                    <View style={styles.themeSelectedIndicator}>
                      <AntDesign name="check" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
  
  // Handle text size change
  const handleTextSizeChange = (value) => {
    setTextSize(value);
  };
  
  // Get text size example style based on current setting
  const getTextSizeStyle = () => {
    // Map 0-100 scale to 14-24 font size
    const fontSize = 14 + (textSize / 10);
    return { fontSize };
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[selectedTheme.primary, selectedTheme.secondary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <AntDesign name="arrowleft" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Rosary Settings</Text>
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSettings}
          activeOpacity={0.7}
        >
          <AntDesign name="check" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Audio Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Settings</Text>
          
          {/* Guide Selection */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowGuideModal(true)}
          >
            <View style={styles.settingLabelContainer}>
              <AntDesign name="user" size={20} color={selectedTheme.primary} />
              <Text style={styles.settingLabel}>Audio Guide</Text>
            </View>
            
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{selectedGuide.name}</Text>
              <AntDesign name="right" size={16} color="#999" />
            </View>
          </TouchableOpacity>
          
          {/* Duration Selection */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowDurationModal(true)}
          >
            <View style={styles.settingLabelContainer}>
              <AntDesign name="clockcircleo" size={20} color={selectedTheme.primary} />
              <Text style={styles.settingLabel}>Prayer Duration</Text>
            </View>
            
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{selectedDuration.duration}</Text>
              <AntDesign name="right" size={16} color="#999" />
            </View>
          </TouchableOpacity>
          
          {/* Auto-play Next */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <AntDesign name="playcircleo" size={20} color={selectedTheme.primary} />
              <Text style={styles.settingLabel}>Auto-play Next Mystery</Text>
            </View>
            
            <Switch
              value={autoPlayNext}
              onValueChange={(value) => toggleSwitch(value, setAutoPlayNext)}
              trackColor={{ false: "#E0E0E0", true: `${selectedTheme.primary}80` }}
              thumbColor={autoPlayNext ? selectedTheme.primary : "#FFFFFF"}
            />
          </View>
          
          {/* Background Ambience */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <FontAwesome5 name="volume-up" size={20} color={selectedTheme.primary} />
              <Text style={styles.settingLabel}>Background Ambience</Text>
            </View>
            
            <Switch
              value={backgroundAmbience}
              onValueChange={(value) => toggleSwitch(value, setBackgroundAmbience)}
              trackColor={{ false: "#E0E0E0", true: `${selectedTheme.primary}80` }}
              thumbColor={backgroundAmbience ? selectedTheme.primary : "#FFFFFF"}
            />
          </View>
        </View>
        
        {/* Display Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display Settings</Text>
          
          {/* Language Selection */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.settingLabelContainer}>
              <AntDesign name="earth" size={20} color={selectedTheme.primary} />
              <Text style={styles.settingLabel}>Language</Text>
            </View>
            
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{selectedLanguage.name}</Text>
              <AntDesign name="right" size={16} color="#999" />
            </View>
          </TouchableOpacity>
          
          {/* Theme Selection */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowThemeModal(true)}
          >
            <View style={styles.settingLabelContainer}>
              <FontAwesome5 name="palette" size={20} color={selectedTheme.primary} />
              <Text style={styles.settingLabel}>Color Theme</Text>
            </View>
            
            <View style={styles.settingValueContainer}>
              <View 
                style={[
                  styles.colorPreview, 
                  { backgroundColor: selectedTheme.primary }
                ]} 
              />
              <Text style={styles.settingValue}>{selectedTheme.name}</Text>
              <AntDesign name="right" size={16} color="#999" />
            </View>
          </TouchableOpacity>
          
          {/* Text Size */}
          <View style={styles.settingRowColumn}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <AntDesign name="font-size" size={20} color={selectedTheme.primary} />
                <Text style={styles.settingLabel}>Text Size</Text>
              </View>
              
              <Text style={[styles.textSizeValue, { color: selectedTheme.primary }]}>
                {textSize < 33 ? "Small" : textSize < 66 ? "Medium" : "Large"}
              </Text>
            </View>
            
            <View style={styles.textSizeContainer}>
              <Text style={styles.textSizeLabel}>A</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={textSize}
                onValueChange={handleTextSizeChange}
                minimumTrackTintColor={selectedTheme.primary}
                maximumTrackTintColor="#E0E0E0"
                thumbTintColor={selectedTheme.primary}
              />
              <Text style={styles.textSizeLabelLarge}>A</Text>
            </View>
            
            <View style={styles.textPreviewContainer}>
              <Text style={[styles.textPreview, getTextSizeStyle()]}>
                Our Father, who art in heaven...
              </Text>
            </View>
          </View>
          
          {/* Show Images */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <AntDesign name="picture" size={20} color={selectedTheme.primary} />
              <Text style={styles.settingLabel}>Show Prayer Artwork</Text>
            </View>
            
            <Switch
              value={showImages}
              onValueChange={(value) => toggleSwitch(value, setShowImages)}
              trackColor={{ false: "#E0E0E0", true: `${selectedTheme.primary}80` }}
              thumbColor={showImages ? selectedTheme.primary : "#FFFFFF"}
            />
          </View>
          
          {/* Allow Screen Dimming */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Ionicons name="sunny" size={20} color={selectedTheme.primary} />
              <Text style={styles.settingLabel}>Allow Screen Dimming</Text>
            </View>
            
            <Switch
              value={allowScreenDimming}
              onValueChange={(value) => toggleSwitch(value, setAllowScreenDimming)}
              trackColor={{ false: "#E0E0E0", true: `${selectedTheme.primary}80` }}
              thumbColor={allowScreenDimming ? selectedTheme.primary : "#FFFFFF"}
            />
          </View>
        </View>
        
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications & Reminders</Text>
          
          {/* Reminders */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <AntDesign name="calendar" size={20} color={selectedTheme.primary} />
              <Text style={styles.settingLabel}>Daily Prayer Reminders</Text>
            </View>
            
            <Switch
              value={reminders}
              onValueChange={(value) => toggleSwitch(value, setReminders)}
              trackColor={{ false: "#E0E0E0", true: `${selectedTheme.primary}80` }}
              thumbColor={reminders ? selectedTheme.primary : "#FFFFFF"}
            />
          </View>
          
          {/* Notifications */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <AntDesign name="bells" size={20} color={selectedTheme.primary} />
              <Text style={styles.settingLabel}>Push Notifications</Text>
            </View>
            
            <Switch
              value={notificationsEnabled}
              onValueChange={(value) => toggleSwitch(value, setNotificationsEnabled)}
              trackColor={{ false: "#E0E0E0", true: `${selectedTheme.primary}80` }}
              thumbColor={notificationsEnabled ? selectedTheme.primary : "#FFFFFF"}
            />
          </View>
          
          {/* Vibration */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Ionicons name="vibrate" size={20} color={selectedTheme.primary} />
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
            </View>
            
            <Switch
              value={vibrationEnabled}
              onValueChange={(value) => toggleSwitch(value, setVibrationEnabled)}
              trackColor={{ false: "#E0E0E0", true: `${selectedTheme.primary}80` }}
              thumbColor={vibrationEnabled ? selectedTheme.primary : "#FFFFFF"}
            />
          </View>
        </View>
        
        {/* Advanced Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced</Text>
          
          {/* Reset Settings */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={resetSettings}
          >
            <View style={styles.settingLabelContainer}>
              <AntDesign name="retweet" size={20} color="#FF4757" />
              <Text style={[styles.settingLabel, { color: "#FF4757" }]}>Reset All Settings</Text>
            </View>
            
            <AntDesign name="right" size={16} color="#999" />
          </TouchableOpacity>
        </View>
        
        {/* Version Information */}
        <View style={styles.versionContainer}>
          <Image 
            source={require('../../../../assets/images/rosary-logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.versionText}>Rosary Prayer App v1.0.0</Text>
          <Text style={styles.copyrightText}>© 2025 Rosary App Team</Text>
        </View>
      </ScrollView>
      
      {/* Modals */}
      {renderGuideModal()}
      {renderDurationModal()}
      {renderLanguageModal()}
      {renderThemeModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#242424",
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  settingRowColumn: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  settingLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 16,
    color: "#333333",
    marginLeft: 12,
  },
  settingValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingValue: {
    fontSize: 16,
    color: "#666666",
    marginRight: 8,
  },
  colorPreview: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  textSizeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  textSizeLabel: {
    fontSize: 14,
    color: "#666666",
  },
  textSizeLabelLarge: {
    fontSize: 22,
    color: "#666666",
  },
  slider: {
    flex: 1,
    marginHorizontal: 8,
  },
  textSizeValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  textPreviewContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  textPreview: {
    color: "#333333",
    textAlign: "center",
  },
  versionContainer: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  versionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 14,
    color: "#999999",
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
    maxHeight: "70%",
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
  previewContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 12,
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  durationExplanation: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  durationExplanationText: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  themeModalItem: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  themeModalItemSelected: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  themeGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  themeName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  themeSelectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
});