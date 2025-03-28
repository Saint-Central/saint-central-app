import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { AntDesign, FontAwesome5, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

// Get theme colors
const getThemeColors = () => {
  return {
    primary: "#7158e2",
    secondary: "#5F45C2",
    accent: "#F0ECFF",
  };
};

// Category icons mapping
const CATEGORY_ICONS = {
  "Family": "users",
  "Health": "heart",
  "Work": "briefcase",
  "Spiritual": "pray",
  "Friends": "user-friends",
  "World": "globe-americas",
  "Personal": "user",
  "Other": "ellipsis-h",
};

// Sample intentions for fresh install
const SAMPLE_INTENTIONS = [
  {
    id: "1",
    title: "For my family's health and happiness",
    description: "Pray for protection and blessings for all family members",
    category: "Family",
    date: new Date().toISOString(),
    completed: false,
    favorite: true,
  },
  {
    id: "2",
    title: "For those suffering from illness",
    description: "Pray for healing and comfort for all who are sick",
    category: "Health",
    date: new Date().toISOString(),
    completed: false,
    favorite: false,
  },
];

export default function RosaryIntentions() {
  const router = useRouter();
  const theme = getThemeColors();
  
  // Refs for animations
  const newIntentionAnim = useRef(new Animated.Value(0)).current;
  
  // State management
  const [intentions, setIntentions] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // "all", "active", "completed"
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newIntention, setNewIntention] = useState({
    title: "",
    description: "",
    category: "Other",
    date: new Date().toISOString(),
    completed: false,
    favorite: false,
  });
  const [editingIntention, setEditingIntention] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  
  // Load intentions on mount
  useEffect(() => {
    loadIntentions();
  }, []);
  
  // Load intentions from AsyncStorage
  const loadIntentions = async () => {
    try {
      const intentionsJson = await AsyncStorage.getItem('rosaryIntentions');
      
      if (intentionsJson !== null) {
        setIntentions(JSON.parse(intentionsJson));
      } else {
        // First time use, load sample intentions
        setIntentions(SAMPLE_INTENTIONS);
        await AsyncStorage.setItem('rosaryIntentions', JSON.stringify(SAMPLE_INTENTIONS));
      }
    } catch (error) {
      console.error("Failed to load intentions:", error);
    }
  };
  
  // Save intentions to AsyncStorage
  const saveIntentions = async (updatedIntentions) => {
    try {
      await AsyncStorage.setItem('rosaryIntentions', JSON.stringify(updatedIntentions));
    } catch (error) {
      console.error("Failed to save intentions:", error);
    }
  };
  
  // Add new intention
  const addIntention = async () => {
    if (!newIntention.title.trim()) {
      Alert.alert("Error", "Please enter a title for your intention.");
      return;
    }
    
    try {
      // Generate unique ID
      const newId = Date.now().toString();
      
      // Create new intention object
      const intentionToAdd = {
        ...newIntention,
        id: newId,
        date: new Date().toISOString(),
      };
      
      // Update state
      const updatedIntentions = [...intentions, intentionToAdd];
      setIntentions(updatedIntentions);
      
      // Save to storage
      await saveIntentions(updatedIntentions);
      
      // Reset form and close modal
      setNewIntention({
        title: "",
        description: "",
        category: "Other",
        date: new Date().toISOString(),
        completed: false,
        favorite: false,
      });
      
      setShowAddModal(false);
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Animate new intention indicator
      Animated.sequence([
        Animated.timing(newIntentionAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(newIntentionAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } catch (error) {
      console.error("Failed to add intention:", error);
      Alert.alert("Error", "Failed to add intention. Please try again.");
    }
  };
  
  // Edit existing intention
  const startEditIntention = (intention) => {
    setEditingIntention(intention);
    setShowEditModal(true);
  };
  
  // Update edited intention
  const updateIntention = async () => {
    if (!editingIntention.title.trim()) {
      Alert.alert("Error", "Please enter a title for your intention.");
      return;
    }
    
    try {
      // Update state
      const updatedIntentions = intentions.map(item => 
        item.id === editingIntention.id ? editingIntention : item
      );
      
      setIntentions(updatedIntentions);
      
      // Save to storage
      await saveIntentions(updatedIntentions);
      
      // Close modal
      setShowEditModal(false);
      setEditingIntention(null);
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to update intention:", error);
      Alert.alert("Error", "Failed to update intention. Please try again.");
    }
  };
  
  // Delete intention
  const deleteIntention = (intentionId) => {
    Alert.alert(
      "Delete Intention",
      "Are you sure you want to delete this prayer intention?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              // Filter out the deleted intention
              const updatedIntentions = intentions.filter(item => item.id !== intentionId);
              
              // Update state
              setIntentions(updatedIntentions);
              
              // Save to storage
              await saveIntentions(updatedIntentions);
              
              // Close edit modal if open
              if (showEditModal && editingIntention && editingIntention.id === intentionId) {
                setShowEditModal(false);
                setEditingIntention(null);
              }
              
              // Haptic feedback
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error("Failed to delete intention:", error);
              Alert.alert("Error", "Failed to delete intention. Please try again.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };
  
  // Toggle completion status
  const toggleCompleted = async (intentionId) => {
    try {
      // Update intention completion status
      const updatedIntentions = intentions.map(item => {
        if (item.id === intentionId) {
          return { ...item, completed: !item.completed };
        }
        return item;
      });
      
      // Update state
      setIntentions(updatedIntentions);
      
      // Save to storage
      await saveIntentions(updatedIntentions);
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("Failed to toggle completion:", error);
    }
  };
  
  // Toggle favorite status
  const toggleFavorite = async (intentionId) => {
    try {
      // Update intention favorite status
      const updatedIntentions = intentions.map(item => {
        if (item.id === intentionId) {
          return { ...item, favorite: !item.favorite };
        }
        return item;
      });
      
      // Update state
      setIntentions(updatedIntentions);
      
      // Save to storage
      await saveIntentions(updatedIntentions);
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };
  
  // Filter intentions based on active tab and category
  const filteredIntentions = intentions.filter(intention => {
    // Filter by tab
    const tabMatch = activeTab === "all" || 
                     (activeTab === "active" && !intention.completed) ||
                     (activeTab === "completed" && intention.completed);
                     
    // Filter by category
    const categoryMatch = !filterCategory || intention.category === filterCategory;
    
    return tabMatch && categoryMatch;
  });
  
  // Get all unique categories from intentions
  const getCategories = () => {
    const categories = new Set(intentions.map(item => item.category));
    return Array.from(categories);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Render intention item
  const renderIntentionItem = ({ item }) => (
    <Animated.View>
      <TouchableOpacity
        style={styles.intentionCard}
        onPress={() => startEditIntention(item)}
        activeOpacity={0.8}
      >
        <View style={styles.intentionHeader}>
          <View style={styles.categoryAndDate}>
            <View style={[
              styles.categoryBadge,
              { backgroundColor: `${theme.primary}20` }
            ]}>
              <FontAwesome5 
                name={CATEGORY_ICONS[item.category] || "ellipsis-h"} 
                size={12} 
                color={theme.primary} 
              />
              <Text style={[styles.categoryText, { color: theme.primary }]}>
                {item.category}
              </Text>
            </View>
            
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          </View>
          
          <View style={styles.intentionActions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: item.favorite ? `${theme.primary}20` : 'transparent' }
              ]}
              onPress={() => toggleFavorite(item.id)}
            >
              <AntDesign 
                name={item.favorite ? "heart" : "hearto"} 
                size={18} 
                color={theme.primary} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: item.completed ? `${theme.primary}20` : 'transparent' }
              ]}
              onPress={() => toggleCompleted(item.id)}
            >
              <AntDesign 
                name={item.completed ? "checkcircle" : "checkcircleo"} 
                size={18} 
                color={theme.primary} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.intentionContent}>
          <Text 
            style={[
              styles.intentionTitle,
              item.completed && styles.completedText
            ]}
          >
            {item.title}
          </Text>
          
          {item.description ? (
            <Text 
              style={[
                styles.intentionDescription,
                item.completed && styles.completedText
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
  
  // Render Add Intention Modal
  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAddModal(false)}
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Prayer Intention</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowAddModal(false)}
            >
              <AntDesign name="close" size={20} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What would you like to pray for?"
              value={newIntention.title}
              onChangeText={(text) => setNewIntention({...newIntention, title: text})}
              maxLength={100}
            />
            
            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Add more details about your intention..."
              value={newIntention.description}
              onChangeText={(text) => setNewIntention({...newIntention, description: text})}
              multiline={true}
              numberOfLines={4}
              maxLength={500}
            />
            
            <Text style={styles.inputLabel}>Category</Text>
            <TouchableOpacity
              style={styles.categorySelector}
              onPress={() => {
                setShowCategoryModal(true);
              }}
            >
              <View style={styles.categoryDisplay}>
                <FontAwesome5 
                  name={CATEGORY_ICONS[newIntention.category] || "ellipsis-h"} 
                  size={16} 
                  color={theme.primary} 
                />
                <Text style={styles.categoryDisplayText}>{newIntention.category}</Text>
              </View>
              <AntDesign name="down" size={16} color="#666" />
            </TouchableOpacity>
            
            <View style={styles.optionsRow}>
              <Text style={styles.optionLabel}>Mark as favorite</Text>
              <TouchableOpacity
                style={[
                  styles.favoriteToggle,
                  newIntention.favorite && { backgroundColor: `${theme.primary}20` }
                ]}
                onPress={() => {
                  setNewIntention({...newIntention, favorite: !newIntention.favorite});
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <AntDesign 
                  name={newIntention.favorite ? "heart" : "hearto"} 
                  size={20} 
                  color={theme.primary} 
                />
              </TouchableOpacity>
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.primary }]}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={[styles.cancelButtonText, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={addIntention}
            >
              <Text style={styles.saveButtonText}>Add Intention</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
  
  // Render Edit Intention Modal
  const renderEditModal = () => {
    if (!editingIntention) return null;
    
    return (
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Prayer Intention</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowEditModal(false)}
              >
                <AntDesign name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="What would you like to pray for?"
                value={editingIntention.title}
                onChangeText={(text) => setEditingIntention({...editingIntention, title: text})}
                maxLength={100}
              />
              
              <Text style={styles.inputLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Add more details about your intention..."
                value={editingIntention.description}
                onChangeText={(text) => setEditingIntention({...editingIntention, description: text})}
                multiline={true}
                numberOfLines={4}
                maxLength={500}
              />
              
              <Text style={styles.inputLabel}>Category</Text>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => {
                  setShowCategoryModal(true);
                }}
              >
                <View style={styles.categoryDisplay}>
                  <FontAwesome5 
                    name={CATEGORY_ICONS[editingIntention.category] || "ellipsis-h"} 
                    size={16} 
                    color={theme.primary} 
                  />
                  <Text style={styles.categoryDisplayText}>{editingIntention.category}</Text>
                </View>
                <AntDesign name="down" size={16} color="#666" />
              </TouchableOpacity>
              
              <View style={styles.optionsRow}>
                <Text style={styles.optionLabel}>Mark as favorite</Text>
                <TouchableOpacity
                  style={[
                    styles.favoriteToggle,
                    editingIntention.favorite && { backgroundColor: `${theme.primary}20` }
                  ]}
                  onPress={() => {
                    setEditingIntention({...editingIntention, favorite: !editingIntention.favorite});
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <AntDesign 
                    name={editingIntention.favorite ? "heart" : "hearto"} 
                    size={20} 
                    color={theme.primary} 
                  />
                </TouchableOpacity>
              </View>
              
              <View style={styles.optionsRow}>
                <Text style={styles.optionLabel}>Mark as completed</Text>
                <TouchableOpacity
                  style={[
                    styles.favoriteToggle,
                    editingIntention.completed && { backgroundColor: `${theme.primary}20` }
                  ]}
                  onPress={() => {
                    setEditingIntention({...editingIntention, completed: !editingIntention.completed});
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <AntDesign 
                    name={editingIntention.completed ? "checkcircle" : "checkcircleo"} 
                    size={20} 
                    color={theme.primary} 
                  />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteIntention(editingIntention.id)}
              >
                <AntDesign name="delete" size={20} color="#FF4757" />
                <Text style={styles.deleteButtonText}>Delete Intention</Text>
              </TouchableOpacity>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.primary }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.primary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={updateIntention}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };
  
  // Render Category Selection Modal
  const renderCategoryModal = () => {
    const categories = Object.keys(CATEGORY_ICONS);
    
    return (
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowCategoryModal(false)}
              >
                <AntDesign name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={categories}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => {
                const isSelected = editingIntention 
                  ? editingIntention.category === item
                  : newIntention.category === item;
                
                return (
                  <TouchableOpacity
                    style={[
                      styles.categoryItem,
                      isSelected && [
                        styles.categoryItemSelected,
                        { backgroundColor: `${theme.primary}15` }
                      ]
                    ]}
                    onPress={() => {
                      if (editingIntention) {
                        setEditingIntention({...editingIntention, category: item});
                      } else {
                        setNewIntention({...newIntention, category: item});
                      }
                      
                      setShowCategoryModal(false);
                      
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <View style={styles.categoryIconContainer}>
                      <FontAwesome5 
                        name={CATEGORY_ICONS[item]} 
                        size={20} 
                        color={isSelected ? theme.primary : "#666"} 
                      />
                    </View>
                    
                    <Text style={[
                      styles.categoryItemText,
                      isSelected && { color: theme.primary, fontWeight: '600' }
                    ]}>
                      {item}
                    </Text>
                    
                    {isSelected && (
                      <AntDesign name="check" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    );
  };
  
  // Render add intention button
  const renderAddButton = () => (
    <TouchableOpacity
      style={[styles.floatingButton, { backgroundColor: theme.primary }]}
      onPress={() => setShowAddModal(true)}
      activeOpacity={0.8}
    >
      <AntDesign name="plus" size={26} color="#FFFFFF" />
    </TouchableOpacity>
  );
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome5 name="pray" size={60} color={`${theme.primary}50`} />
      <Text style={styles.emptyStateTitle}>No Intentions Found</Text>
      <Text style={styles.emptyStateDescription}>
        {filterCategory 
          ? `You don't have any ${activeTab === "completed" ? "completed" : ""} intentions in the ${filterCategory} category.`
          : activeTab === "all" 
            ? "Add your first prayer intention to get started."
            : activeTab === "active"
              ? "You don't have any active intentions."
              : "You don't have any completed intentions."}
      </Text>
      
      {(activeTab === "all" || activeTab === "active") && (
        <TouchableOpacity
          style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <AntDesign name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.emptyStateButtonText}>Add Intention</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.primary, theme.secondary]}
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
        
        <Text style={styles.headerTitle}>Prayer Intentions</Text>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterCategory(null)}
          activeOpacity={0.7}
        >
          <Feather name={filterCategory ? "filter" : "filter"} size={20} color={filterCategory ? "#FFCC00" : "#FFF"} />
        </TouchableOpacity>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "all" && [styles.activeTab, { borderColor: theme.primary }]
          ]}
          onPress={() => setActiveTab("all")}
        >
          <Text style={[
            styles.tabText,
            activeTab === "all" && { color: theme.primary, fontWeight: '600' }
          ]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "active" && [styles.activeTab, { borderColor: theme.primary }]
          ]}
          onPress={() => setActiveTab("active")}
        >
          <Text style={[
            styles.tabText,
            activeTab === "active" && { color: theme.primary, fontWeight: '600' }
          ]}>
            Active
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "completed" && [styles.activeTab, { borderColor: theme.primary }]
          ]}
          onPress={() => setActiveTab("completed")}
        >
          <Text style={[
            styles.tabText,
            activeTab === "completed" && { color: theme.primary, fontWeight: '600' }
          ]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Categories Filter */}
      {getCategories().length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {getCategories().map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryFilterChip,
                filterCategory === category && { backgroundColor: `${theme.primary}20` }
              ]}
              onPress={() => {
                if (filterCategory === category) {
                  setFilterCategory(null);
                } else {
                  setFilterCategory(category);
                }
                
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <FontAwesome5 
                name={CATEGORY_ICONS[category] || "ellipsis-h"} 
                size={14} 
                color={filterCategory === category ? theme.primary : "#666"} 
              />
              <Text style={[
                styles.categoryFilterText,
                filterCategory === category && { color: theme.primary, fontWeight: '600' }
              ]}>
                {category}
              </Text>
              
              {filterCategory === category && (
                <TouchableOpacity
                  style={styles.clearFilterButton}
                  onPress={() => setFilterCategory(null)}
                >
                  <AntDesign name="close" size={12} color={theme.primary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      
      {/* Intentions List */}
      {filteredIntentions.length > 0 ? (
        <FlatList
          data={filteredIntentions}
          keyExtractor={(item) => item.id}
          renderItem={renderIntentionItem}
          contentContainerStyle={styles.intentionsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}
      
      {/* Add Button */}
      {renderAddButton()}
      
      {/* Modals */}
      {renderAddModal()}
      {renderEditModal()}
      {renderCategoryModal()}
      
      {/* New Intention Added Indicator */}
      <Animated.View 
        style={[
          styles.newIntentionToast,
          { 
            backgroundColor: theme.primary,
            opacity: newIntentionAnim,
            transform: [
              { 
                translateY: newIntentionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0]
                }) 
              }
            ]
          }
        ]}
      >
        <AntDesign name="checkcircle" size={20} color="#FFFFFF" />
        <Text style={styles.newIntentionToastText}>Prayer intention added!</Text>
      </Animated.View>
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
    height: 140,
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    color: "#666666",
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
  },
  categoryFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    marginRight: 8,
  },
  categoryFilterText: {
    fontSize: 14,
    color: "#666666",
    marginLeft: 6,
  },
  clearFilterButton: {
    marginLeft: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  intentionsList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  intentionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  intentionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryAndDate: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    color: "#888888",
  },
  intentionActions: {
    flexDirection: "row",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  intentionContent: {
    marginTop: 4,
  },
  intentionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#242424",
    marginBottom: 8,
  },
  intentionDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
    maxHeight: "80%",
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
  modalBody: {
    padding: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333333",
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  categorySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  categoryDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryDisplayText: {
    fontSize: 16,
    color: "#333333",
    marginLeft: 10,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 16,
    color: "#333333",
  },
  favoriteToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 16,
    backgroundColor: "#FFF2F2",
    borderRadius: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF4757",
    marginLeft: 8,
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalList: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  categoryItemSelected: {
    borderRadius: 12,
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  categoryItemText: {
    flex: 1,
    fontSize: 16,
    color: "#333333",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  newIntentionToast: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  newIntentionToastText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 10,
  },
});