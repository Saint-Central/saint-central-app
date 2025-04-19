import React from "react";
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "../styles";

interface HomeViewProps {
  navigateToChurches: () => void;
  navigateToIntentions: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ navigateToChurches, navigateToIntentions }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Faith Connect</Text>
        <TouchableOpacity style={styles.profileButton}>
          <Feather name="user" size={24} color="#4361EE" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Welcome</Text>
        
        {/* Feature Cards */}
        <View style={styles.featureCards}>
          <TouchableOpacity style={styles.featureCard} onPress={navigateToChurches}>
            <LinearGradient
              colors={["#3A86FF", "#4361EE"]}
              style={styles.iconContainer}
            >
              <FontAwesome5 name="church" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.featureTitle}>My Churches</Text>
            <Text style={styles.featureDescription}>
              View and manage your church memberships
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} onPress={navigateToIntentions}>
            <LinearGradient
              colors={["#4361EE", "#3A86FF"]}
              style={styles.iconContainer}
            >
              <FontAwesome5 name="praying-hands" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.featureTitle}>Prayer Intentions</Text>
            <Text style={styles.featureDescription}>
              Share and pray for intentions with your church
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <LinearGradient
              colors={["#3A86FF", "#4361EE"]}
              style={styles.iconContainer}
            >
              <Feather name="users" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.featureTitle}>Community</Text>
            <Text style={styles.featureDescription}>
              Connect with other members of your faith community
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeView;