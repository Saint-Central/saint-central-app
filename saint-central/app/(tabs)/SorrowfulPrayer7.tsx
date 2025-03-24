import React, { useState, useRef, useEffect } from "react";
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
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

// Define voice guides
const VOICE_GUIDES = [
  { id: 1, name: "Francis", gender: "male" },
  { id: 2, name: "Claire", gender: "female" },
  { id: 3, name: "Thomas", gender: "male" },
  { id: 4, name: "Maria", gender: "female" },
];

// Conclusion content
const CONCLUSION_CONTENT = {
  title: "Conclusion",
  description: "Concluding prayers for the Sorrowful Mysteries of the Rosary.",
  reflection: "Having meditated on the Sorrowful Mysteries, we reflect on Christ's sacrifice for our salvation."
};

export default function SorrowfulPrayer7Screen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get parameters from navigation or use defaults
  const { 
    mysteryType = "CONCLUSION", 
    mysteryKey = "SORROWFUL", 
    mysteryIndex = "5", 
    mysteryTitle = CONCLUSION_CONTENT.title, 
    mysteryDescription = CONCLUSION_CONTENT.description, 
    guideName 
  } = params;
  
  // Navigation functions
  const navigateToRosary = () => {
    router.push({
      pathname: '/Rosary' as any,
      params: {
        mysteryType: "SORROWFUL",
        mysteryKey: "SORROWFUL"
      }
    });
  };
  
  const navigateToPrevious = () => {
    router.push({
      pathname: '/SorrowfulPrayer6' as any,
      params: {
        mysteryType: "SORROWFUL",
        mysteryKey: "SORROWFUL",
        mysteryIndex: 4,
        mysteryTitle: "The Crucifixion",
        mysteryDescription: "When they came to the place called the Skull, they crucified him and the criminals there, one on his right, the other on his left. Then Jesus said, \"Father, forgive them, they know not what they do.\" (Luke 23:33-34)",
        guideName: guideName
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={["#D63031", "#FF4757"]}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={navigateToPrevious}
        >
          <Feather name="chevron-left" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Conclusion</Text>
        
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={navigateToRosary}
        >
          <Feather name="home" size={22} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Sorrowful Mysteries</Text>
          <Text style={styles.conclusionText}>
            You have completed the Sorrowful Mysteries of the Rosary.
          </Text>
          
          <View style={styles.mysteryCard}>
            <Text style={styles.mysteryTitle}>Final Prayer</Text>
            <Text style={styles.mysteryText}>
              Hail, Holy Queen, Mother of Mercy, our life, our sweetness, and our hope. To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us, and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary.
            </Text>
            <Text style={styles.mysteryText}>
              Pray for us, O Holy Mother of God.
            </Text>
            <Text style={styles.mysteryText}>
              That we may be made worthy of the promises of Christ.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 120,
    paddingTop: 40,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "600",
  },
  homeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 20,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    color: "#333",
  },
  conclusionText: {
    fontSize: 16,
    color: "#555",
    marginBottom: 20,
    lineHeight: 24,
  },
  mysteryCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mysteryTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#D63031",
  },
  mysteryText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
    lineHeight: 24,
  },
});
