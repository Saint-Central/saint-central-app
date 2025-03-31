// /rosary/prayer-screens/mystery1.js
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
  Image,
} from 'react-native';
import { AntDesign } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

// Prayer texts
const PRAYERS = {
  mysteryAnnouncement: "The First Joyful Mystery: The Annunciation\n\nThe angel Gabriel was sent from God to a city of Galilee named Nazareth, to a virgin betrothed to a man whose name was Joseph, of the house of David; and the virgin's name was Mary. And he came to her and said, 'Hail, full of grace, the Lord is with you!' (Luke 1:26-28)",
  
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

const Mystery1 = () => {
  const router = useRouter();
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // States for current prayer and UI elements
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullPrayer, setShowFullPrayer] = useState(false);
  
  // Define prayer steps for this mystery
  const mysteryPrayerSteps = [
    { id: 0, title: "The Annunciation", prayer: PRAYERS.mysteryAnnouncement, type: 'announcement', badge: "I" },
    { id: 1, title: "Our Father", prayer: PRAYERS.ourFather, type: 'prayer', badge: "OF" },
    // 10 Hail Marys
    ...Array(10).fill().map((_, i) => ({
      id: i + 2,
      title: `Hail Mary (${i + 1})`,
      prayer: PRAYERS.hailMary,
      type: 'prayer',
      badge: `HM${i + 1}`
    })),
    { id: 12, title: "Glory Be", prayer: PRAYERS.gloryBe, type: 'prayer', badge: "GB" },
    { id: 13, title: "Fatima Prayer", prayer: PRAYERS.fatima, type: 'prayer', optional: true, badge: "FP" },
  ];
  
  const currentPrayer = mysteryPrayerSteps[currentStep];
  
  // Navigation functions
  const navigateToNext = () => {
    // Navigate to the next mystery (The Visitation)
    router.push("/rosary/prayer-screens/mystery2");
  };
  
  const goBack = () => {
    router.push("/rosary/prayer-screens/initial-prayers");
  };
  
  // Function to move to next prayer in sequence
  const nextStep = () => {
    if (currentStep < mysteryPrayerSteps.length - 1) {
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
      // Navigate to the next mystery
      navigateToNext();
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
  
  // Display the bead counter for Hail Marys
  const renderBeadCounter = () => {
    // Only show bead counter during Hail Marys (steps 2-11)
    if (currentStep >= 2 && currentStep <= 11) {
      const beadIndex = currentStep - 2; // Adjust to 0-based index for Hail Marys
      
      return (
        <View style={styles.beadCounterContainer}>
          <Text style={styles.beadCounterText}>
            Hail Mary {beadIndex + 1} of 10
          </Text>
          <View style={styles.beadRow}>
            {Array(10).fill().map((_, i) => (
              <View
                key={i}
                style={[
                  styles.bead,
                  i <= beadIndex ? styles.activeBead : styles.inactiveBead
                ]}
              />
            ))}
          </View>
        </View>
      );
    }
    return null;
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
            <Text style={styles.headerTitle}>JOYFUL MYSTERIES</Text>
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
            {/* Mystery Title and Scripture */}
            {currentStep === 0 && (
              <View style={styles.mysteryHeaderContainer}>
                <Text style={styles.mysteryTitle}>The Annunciation</Text>
                <Text style={styles.mysteryReference}>Luke 1:26-28</Text>
                <Image 
                  source={require('../../../../assets/images/rosary-diagram.png')}
                  style={styles.mysteryImage}
                  resizeMode="contain"
                />
              </View>
            )}
            
            {/* Current Prayer Display */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowFullPrayer(true)}
            >
              <View style={styles.currentPrayerCard}>
                <View style={styles.prayerBadge}>
                  <Text style={styles.prayerBadgeText}>{currentPrayer.badge}</Text>
                </View>
                
                <View style={styles.prayerContent}>
                  <Text style={styles.prayerTitle}>{currentPrayer.title}</Text>
                  <Text style={styles.prayerText}>
                    {currentPrayer.prayer.length > 150 
                      ? currentPrayer.prayer.substring(0, 150) + "..." 
                      : currentPrayer.prayer}
                  </Text>
                </View>
                
                {currentPrayer.optional && (
                  <View style={styles.optionalBadge}>
                    <Text style={styles.optionalBadgeText}>Optional</Text>
                  </View>
                )}
                
                <View style={styles.prayerProgressIndicator}>
                  <Text style={styles.prayerProgressText}>
                    {currentStep + 1} of {mysteryPrayerSteps.length}
                  </Text>
                </View>
                
                <View style={styles.readMoreContainer}>
                  <Text style={styles.readMoreText}>
                    Tap to read full prayer
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Bead Counter for Hail Marys */}
            {renderBeadCounter()}
            
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
                <AntDesign name="left" size={20} color="#0ACF83" />
                <Text style={styles.navButtonText}>PREVIOUS</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.navButton,
                  currentStep === mysteryPrayerSteps.length - 1 ? { backgroundColor: "#0ACF83" } : null
                ]}
                onPress={nextStep}
                activeOpacity={0.8}
              >
                <Text 
                  style={[
                    styles.navButtonText, 
                    { color: currentStep === mysteryPrayerSteps.length - 1 ? '#FFFFFF' : '#0ACF83' }
                  ]}
                >
                  {currentStep === mysteryPrayerSteps.length - 1 ? 'NEXT MYSTERY' : 'NEXT'}
                </Text>
                <AntDesign 
                  name="right" 
                  size={20} 
                  color={currentStep === mysteryPrayerSteps.length - 1 ? '#FFFFFF' : '#0ACF83'} 
                />
              </TouchableOpacity>
            </View>
            
            {/* Mystery Progress Indicator */}
            <View style={styles.progressNavigationContainer}>
              <TouchableOpacity
                style={styles.progressNavButton}
                onPress={goBack}
              >
                <AntDesign name="left" size={16} color="#888" />
                <Text style={styles.progressNavText}>Initial Prayers</Text>
              </TouchableOpacity>
              
              <View style={styles.progressIndicator}>
                <View style={[styles.progressDot, { backgroundColor: "#0ACF83" }]} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
              </View>
              
              <TouchableOpacity
                style={styles.progressNavButton}
                onPress={navigateToNext}
              >
                <Text style={styles.progressNavText}>The Visitation</Text>
                <AntDesign name="right" size={16} color="#888" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressIndicator}>
                <View style={[styles.progressDot, styles.activeProgressDot]} />
                <View style={[styles.progressDot, styles.activeProgressDot]} />
                <View style={[styles.progressDot, styles.activeProgressDot]} />
                <View style={[styles.progressDot, styles.activeProgressDot]} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
              </View>
              <Text style={styles.progressText}>Step 4 of 10</Text>
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
    backgroundColor: "#0ACF83", // Joyful mystery color
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
    paddingBottom: 100,
  },
  mysteryHeaderContainer: {
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  mysteryTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  mysteryReference: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 15,
  },
  mysteryImage: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
  currentPrayerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 20,
    marginVertical: 10,
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
    fontSize: 16,
    fontWeight: "700",
    color: "#0ACF83",
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
    color: "#0ACF83",
  },
  optionalBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: 12,
  },
  optionalBadgeText: {
    fontSize: 12,
    color: "#0ACF83",
    fontWeight: "600",
  },
  readMoreContainer: {
    marginTop: 4,
    alignItems: 'center',
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: "#0ACF83",
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
    color: "#0ACF83",
  },
  beadCounterContainer: {
    alignItems: "center",
    marginVertical: 15,
  },
  beadCounterText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#555",
  },
  beadRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  bead: {
    width: 18,
    height: 18,
    borderRadius: 9,
    margin: 4,
    borderWidth: 2,
  },
  activeBead: {
    backgroundColor: "#0ACF83",
    borderColor: "#0ACF83",
  },
  inactiveBead: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressNavigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
  },
  progressNavButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressNavText: {
    fontSize: 12,
    color: "#888",
    marginHorizontal: 4,
  },
  progressIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DDD",
    marginHorizontal: 3,
  },
  progressContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
  },
  activeProgressDot: {
    backgroundColor: "#0ACF83",
  },
  playButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#0ACF83",
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

export default Mystery1;