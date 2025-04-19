import React from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  ActivityIndicator 
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Church } from "../types";
import { styles } from "../styles";

interface ChurchDetailsViewProps {
  selectedChurch: Church | null;
  isLoading: boolean;
  currentUserRole: string;
  setCurrentView: (view: "churches") => void;
  navigateToIntentions: (church: Church) => void;
}

const ChurchDetailsView: React.FC<ChurchDetailsViewProps> = ({
  selectedChurch,
  isLoading,
  currentUserRole,
  setCurrentView,
  navigateToIntentions,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentView("churches")} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Church Details</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4361EE" />
        </View>
      ) : !selectedChurch ? (
        <View style={styles.errorContainer}>
          <FontAwesome5 name="church" size={50} color="#CBD5E1" />
          <Text style={styles.errorText}>Church not found</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => setCurrentView("churches")}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.churchHeader}>
            <LinearGradient
              colors={["#3A86FF", "#4361EE"]}
              style={styles.churchIcon}
            >
              <FontAwesome5 name="church" size={32} color="#FFFFFF" />
            </LinearGradient>
            
            <View style={styles.churchHeaderInfo}>
              <Text style={styles.churchName}>{selectedChurch.name}</Text>
              {currentUserRole && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{currentUserRole}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>
              {selectedChurch.description || "No description available."}
            </Text>

            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Feather name="users" size={16} color="#4361EE" />
              </View>
              <Text style={styles.detailText}>
                {selectedChurch.members_count} Members
              </Text>
            </View>
            
            {selectedChurch.founded && (
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Feather name="calendar" size={16} color="#4361EE" />
                </View>
                <Text style={styles.detailText}>
                  Founded: {new Date(selectedChurch.founded).toLocaleDateString()}
                </Text>
              </View>
            )}
            
            {selectedChurch.address && (
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Feather name="map-pin" size={16} color="#4361EE" />
                </View>
                <Text style={styles.detailText}>{selectedChurch.address}</Text>
              </View>
            )}
            
            {selectedChurch.phone && (
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Feather name="phone" size={16} color="#4361EE" />
                </View>
                <Text style={styles.detailText}>{selectedChurch.phone}</Text>
              </View>
            )}
            
            {selectedChurch.email && (
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Feather name="mail" size={16} color="#4361EE" />
                </View>
                <Text style={styles.detailText}>{selectedChurch.email}</Text>
              </View>
            )}
            
            {selectedChurch.website && (
              <View style={styles.detailItem}>
                <View style={styles.detailIconContainer}>
                  <Feather name="globe" size={16} color="#4361EE" />
                </View>
                <Text style={styles.detailText}>{selectedChurch.website}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.featuresTitle}>Features</Text>
          
          <View style={styles.featuresContainer}>
            <TouchableOpacity 
              style={styles.featureCard} 
              onPress={() => navigateToIntentions(selectedChurch)}
            >
              <LinearGradient
                colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.1)"]}
                style={styles.featureCardContent}
              >
                <View style={styles.featureIconContainer}>
                  <FontAwesome5 name="praying-hands" size={24} color="#4361EE" />
                </View>
                <Text style={styles.featureTitle}>Prayer Intentions</Text>
                <Text style={styles.featureDescription}>
                  Share and pray for intentions with your church community
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.featureCard}>
              <LinearGradient
                colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.1)"]}
                style={styles.featureCardContent}
              >
                <View style={styles.featureIconContainer}>
                  <Feather name="users" size={24} color="#4361EE" />
                </View>
                <Text style={styles.featureTitle}>Members</Text>
                <Text style={styles.featureDescription}>
                  View and connect with other members of your church
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.featureCard}>
              <LinearGradient
                colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.1)"]}
                style={styles.featureCardContent}
              >
                <View style={styles.featureIconContainer}>
                  <Feather name="grid" size={24} color="#4361EE" />
                </View>
                <Text style={styles.featureTitle}>Groups</Text>
                <Text style={styles.featureDescription}>
                  Join ministry and small groups within your church
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default ChurchDetailsView;