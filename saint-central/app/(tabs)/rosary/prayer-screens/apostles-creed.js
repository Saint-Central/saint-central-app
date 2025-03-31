// /rosary/prayer-screens/apostles-creed.js
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
  apostlesCreed: `I believe in God, the Father Almighty, Creator of Heaven and earth;
and in Jesus Christ, His only Son, Our Lord,
who was conceived by the Holy Spirit, born of the Virgin Mary,
suffered under Pontius Pilate, was crucified, died and was buried;
He descended into hell; on the third day He rose again from the dead;
He ascended into Heaven, and sits at the right hand of God, the Father Almighty;
from thence He shall come to judge the living and the dead.

I believe in the Holy Spirit,
the Holy Catholic Church,
the communion of Saints,
the forgiveness of sins,
the resurrection of the body,
and life everlasting.
Amen.`
};

const ApostlesCreed = () => {
  const router = useRouter();
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullPrayer, setShowFullPrayer] = useState(false);
  
  // Function to continue to next screen
  const continueToNext = () => {
    router.push("/rosary/prayer-screens/initial-prayers");
  };
  
  // Go back to the previous screen
  const goBack = () => {
    router.push("/rosary/prayer-screens/introduction");
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
            <Text style={styles.modalTitle}>Apostles' Creed</Text>
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
                {PRAYERS.apostlesCreed}
              </Text>
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
            <Text style={styles.title}>Apostles' Creed</Text>
            
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowFullPrayer(true)}
            >
              <View style={styles.prayerCard}>
                <View style={styles.prayerBadge}>
                  <Text style={styles.prayerBadgeText}>AC</Text>
                </View>
                
                <View style={styles.prayerContent}>
                  <Text style={styles.prayerTitle}>Apostles' Creed</Text>
                  <Text style={styles.prayerText}>
                    I believe in God, the Father Almighty, Creator of Heaven and earth;
                    and in Jesus Christ, His only Son, Our Lord...
                  </Text>
                </View>
                
                <View style={styles.readMoreContainer}>
                  <Text style={styles.readMoreText}>
                    Tap to read full prayer
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            
            <Text style={styles.instructionText}>
              This prayer expresses the core beliefs of the Christian faith.
            </Text>
            
            <TouchableOpacity
              style={styles.continueButton}
              onPress={continueToNext}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>
                Continue to Initial Prayers
              </Text>
              <AntDesign name="right" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressIndicator}>
                <View style={[styles.progressDot, styles.activeProgressDot]} />
                <View style={[styles.progressDot, styles.activeProgressDot]} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
              </View>
              <Text style={styles.progressText}>Step 2 of 10</Text>
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
  prayerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
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
  readMoreContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: "#3f51b5",
  },
  instructionText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 30,
  },
  continueButton: {
    flexDirection: "row",
    backgroundColor: "#3f51b5",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    alignSelf: "center",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },
  progressContainer: {
    alignItems: "center",
    marginTop: 40,
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
});

export default ApostlesCreed;