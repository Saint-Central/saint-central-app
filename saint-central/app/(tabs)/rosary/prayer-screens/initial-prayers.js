// /rosary/prayer-screens/initial-prayers.js
import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { AntDesign } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

// Prayer texts
const PRAYERS = {
  ourFather: `Our Father, who art in Heaven, hallowed be Thy name;
Thy kingdom come; Thy will be done on earth as it is in Heaven.
Give us this day our daily bread;
and forgive us our trespasses, as we forgive those who trespass against us;
and lead us not into temptation, but deliver us from evil.
Amen.`,

  hailMary: `Hail Mary, full of grace, the Lord is with thee;
blessed art thou among women, and blessed is the Fruit of thy womb, Jesus.
Holy Mary, Mother of God, pray for us sinners,
now and at the hour of our death.
Amen.`,

  gloryBe: `Glory be to the Father, and to the Son, and to the Holy Spirit,
as it was in the beginning, is now, and ever shall be, world without end.
Amen.`,

  fatima: `O my Jesus, forgive us our sins,
save us from the fires of hell,
and lead all souls to Heaven,
especially those in most need of Thy mercy.`
};

const InitialPrayers = () => {
  const router = useRouter();
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // States for current prayer and UI elements
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullPrayer, setShowFullPrayer] = useState(false);
  
  // Define prayer steps
  const initialPrayerSteps = [
    { id: 0, title: "Our Father", prayer: PRAYERS.ourFather, badge: "OF" },
    { id: 1, title: "Hail Mary (for Faith)", prayer: PRAYERS.hailMary, badge: "HM1" },
    { id: 2, title: "Hail Mary (for Hope)", prayer: PRAYERS.hailMary, badge: "HM2" },
    { id: 3, title: "Hail Mary (for Charity)", prayer: PRAYERS.hailMary, badge: "HM3" },
    { id: 4, title: "Glory Be", prayer: PRAYERS.gloryBe, badge: "GB" },
    { id: 5, title: "Fatima Prayer (Optional)", prayer: PRAYERS.fatima, badge: "FP", optional: true },
  ];
  
  const currentPrayer = initialPrayerSteps[currentStep];
  
  // Navigation functions
  const continueToFirstMystery = () => {
    router.push("/rosary/prayer-screens/mystery1");
  };
  
  const goBack = () => {
    router.push("/rosary/prayer-screens/apostles-creed");
  };
  
  // Function to move to next prayer in sequence
  const nextStep = () => {
    if (currentStep < initialPrayerSteps.length - 1) {
      // Animate the transition
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
      
      setCurrentStep(currentStep + 1);
      
      // Scroll to top for new prayer
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
      }
    } else {
      // Navigate to first mystery
      continueToFirstMystery();
    }
  };
  
  // Function to move to previous prayer in sequence
  const prevStep = () => {
    if (currentStep > 0) {
      // Animate the transition
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
      
      setCurrentStep(currentStep - 1);
      
      // Scroll to top for new prayer
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
      }
    }
  };
  
  // Toggle audio playback
  const toggleAudio = () => {
    setIsPlaying(!isPlaying);
  };
  
  // Render the full prayer modal
  const renderFullPrayerModal = () => {
    if (!showFullPrayer) return null;
    
    return (
      <View style={styles.modalOverlay}>
        <View style={styles.fullPrayerModalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{currentPrayer.title}</Text>
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
                {currentPrayer.prayer}
              </Text>
              
              {currentPrayer.optional && (
                <Text style={styles.optionalText}>
                  This prayer is optional in the Rosary.
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backgroundGradient} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goBack}
            activeOpacity={0.7}
          >
            <AntDesign name="arrowleft" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>THE HOLY ROSARY</Text>
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
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[{ opacity: fadeAnim }]}>
            <Text style={styles.title}>Initial Prayers</Text>
            
            <View style={styles.stepProgressContainer}>
              <Text style={styles.stepProgressText}>
                {currentStep + 1} of {initialPrayerSteps.length}
              </Text>
              <View style={styles.stepProgressBar}>
                <View 
                  style={[
                    styles.stepProgressFill, 
                    { width: `${((currentStep + 1) / initialPrayerSteps.length) * 100}%` }
                  ]} 
                />
              </View>
            </View>
            
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowFullPrayer(true)}
            >
              <View style={styles.prayerCard}>
                <View style={styles.prayerBadge}>
                  <Text style={styles.prayerBadgeText}>{currentPrayer.badge}</Text>
                </View>
                
                <View style={styles.prayerContent}>
                  <Text style={styles.prayerTitle}>{currentPrayer.title}</Text>
                  <Text style={styles.prayerText}>
                    {currentPrayer.prayer.substring(0, 120)}...
                  </Text>
                </View>
                
                {currentPrayer.optional && (
                  <View style={styles.optionalBadge}>
                    <Text style={styles.optionalBadgeText}>Optional</Text>
                  </View>
                )}
                
                <View style={styles.readMoreContainer}>
                  <Text style={styles.readMoreText}>
                    Tap to read full prayer
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Navigation Controls */}
            <View style={styles.navigationContainer}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  { opacity: currentStep === 0 ? 0.5 : 1 }
                ]}
                onPress={prevStep}
                disabled={currentStep === 0}
                activeOpacity={0.8}
              >
                <AntDesign name="left" size={20} color="#3f51b5" />
                <Text style={styles.navButtonText}>PREVIOUS</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.navButton,
                  currentStep === initialPrayerSteps.length - 1 ? { backgroundColor: "#3f51b5" } : null
                ]}
                onPress={nextStep}
                activeOpacity={0.8}
              >
                <Text 
                  style={[
                    styles.navButtonText, 
                    { color: currentStep === initialPrayerSteps.length - 1 ? '#FFFFFF' : '#3f51b5' }
                  ]}
                >
                  {currentStep === initialPrayerSteps.length - 1 ? 'START MYSTERIES' : 'NEXT'}
                </Text>
                <AntDesign 
                  name="right" 
                  size={20} 
                  color={currentStep === initialPrayerSteps.length - 1 ? '#FFFFFF' : '#3f51b5'} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressIndicator}>
                <View style={[styles.progressDot, styles.activeProgressDot]} />
                <View style={[styles.progressDot, styles.activeProgressDot]} />
                <View style={[styles.progressDot, styles.activeProgressDot]} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
              </View>
              <Text style={styles.progressText}>Step 3 of 10</Text>
            </View>
          </Animated.View>
        </ScrollView>
        
        <TouchableOpacity 
          style={styles.playButton}
          onPress={toggleAudio}
          activeOpacity={0.9}
        >
          <View style={styles.playButtonContent}>
            {isPlaying ? (
              <AntDesign name="pausecircle" size={24} color="#FFFFFF" />
            ) : (
              <AntDesign name="playcircleo" size={24} color="#FFFFFF" />
            )}
            <Text style={styles.playButtonText}>
              {isPlaying ? "PAUSE AUDIO" : "PLAY AUDIO"}
            </Text>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
      
      {/* Full Prayer Modal */}
      {renderFullPrayerModal()}
    </View>
  );
};

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
    backgroundColor: "#3f51b5", // Main theme color
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
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
  },
  stepProgressContainer: {
    marginBottom: 20,
  },
  stepProgressText: {
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  stepProgressBar: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  stepProgressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  prayerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
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
    fontSize: 16,
    fontWeight: "700",
    color: "#3f51b5",
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
  optionalBadge: {
    backgroundColor: "#E8EAF6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: 12,
  },
  optionalBadgeText: {
    fontSize: 12,
    color: "#3f51b5",
    fontWeight: "600",
  },
  readMoreContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: "#3f51b5",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
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
    color: "#3f51b5",
  },
  progressContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  progressIndicator: {
    flexDirection: "row",
    marginBottom: 10,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ddd",
    marginHorizontal: 3,
  },
  activeProgressDot: {
    backgroundColor: "#3f51b5",
  },
  progressText: {
    fontSize: 14,
    color: "#666",
  },
  playButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#3f51b5",
    borderRadius: 14,
    paddingVertical: 14,
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
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullPrayerModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    margin: 20,
    width: width - 40,
    padding: 0,
    overflow: 'hidden',
    maxHeight: height * 0.8,
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
  optionalText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#666",
    marginTop: 20,
  },
});

export default InitialPrayers;