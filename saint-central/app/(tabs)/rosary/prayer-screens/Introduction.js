// /rosary/prayer-screens/Introduction.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { AntDesign } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

// Prayer texts
const PRAYERS = {
  signOfCross: "In the name of the Father, and of the Son, and of the Holy Spirit. Amen."
};

const Introduction = () => {
  const router = useRouter();
  
  // Function to continue to next screen
  const continueToNext = () => {
    router.push("/rosary/prayer-screens/apostles-creed");
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backgroundGradient} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/rosary')}
            activeOpacity={0.7}
          >
            <AntDesign name="arrowleft" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>THE HOLY ROSARY</Text>
          </View>
          
          <View style={styles.placeholderButton} />
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title}>Begin the Holy Rosary</Text>
          
          <Image 
            source={require('../../../../assets/images/rosary-diagram.png')} 
            style={styles.image}
            resizeMode="contain"
          />
          
          <Text style={styles.subtitle}>Sign of the Cross</Text>
          
          <View style={styles.prayerCard}>
            <Text style={styles.prayerText}>{PRAYERS.signOfCross}</Text>
          </View>
          
          <Text style={styles.instructionText}>
            Make the Sign of the Cross while reciting this prayer.
          </Text>
          
          <TouchableOpacity
            style={styles.continueButton}
            onPress={continueToNext}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              Continue to Apostles' Creed
            </Text>
            <AntDesign name="right" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.todayText}>
            Today we pray the Joyful Mysteries
          </Text>
        </View>
      </SafeAreaView>
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
  placeholderButton: {
    width: 44,
    height: 44,
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
  },
  image: {
    width: 180,
    height: 180,
    marginBottom: 25,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 16,
    textAlign: "center",
  },
  prayerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: '100%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
  },
  prayerText: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    color: "#333333",
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
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },
  todayText: {
    marginTop: 40,
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
  }
});

export default Introduction;