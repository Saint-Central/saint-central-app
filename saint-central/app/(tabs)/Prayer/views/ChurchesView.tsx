import React from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  RefreshControl 
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Church } from "../types";
import { styles } from "../styles";

interface ChurchesViewProps {
  churches: Church[];
  navigateToHome: () => void;
  navigateToChurchDetails: (church: Church) => void;
  navigateToIntentions: (church: Church) => void;
  refreshing: boolean;
  handleRefresh: () => void;
}

const ChurchesView: React.FC<ChurchesViewProps> = ({
  churches,
  navigateToHome,
  navigateToChurchDetails,
  navigateToIntentions,
  refreshing,
  handleRefresh,
}) => {
  const renderChurchCard = ({ item }: { item: Church }) => (
    <TouchableOpacity style={styles.churchCard} onPress={() => navigateToChurchDetails(item)}>
      <LinearGradient
        colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.1)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={["#3A86FF", "#4361EE"]}
            style={styles.iconContainer}
          >
            <FontAwesome5 name="church" size={24} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.churchInfo}>
            <Text style={styles.churchName}>{item.name}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{item.role || "Member"}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.churchDescription}>
          {item.description || "No description available"}
        </Text>

        <View style={styles.churchStats}>
          <View style={styles.statItem}>
            <FontAwesome5 name="users" size={14} color="#64748B" />
            <Text style={styles.statText}>{item.members_count || 0} Members</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => navigateToChurchDetails(item)}
          >
            <Text style={styles.viewButtonText}>Church Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.intentionsButton}
            onPress={() => navigateToIntentions(item)}
          >
            <FontAwesome5 name="praying-hands" size={16} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.intentionsButtonText}>Prayer Intentions</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={navigateToHome} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Churches</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <FlatList
        data={churches}
        renderItem={renderChurchCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            colors={["#4361EE"]} 
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="church" size={50} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              You are not a member of any churches yet
            </Text>
            <TouchableOpacity style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Join a Church</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default ChurchesView;