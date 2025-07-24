import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  InputAccessoryView,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

// Types
interface NewIntention {
  type: string;
  visibility: string;
  title: string;
  description: string;
  selectedGroups: string[];
  selectedFriends: string[];
}

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
}

interface Group {
  id: string;
  name: string;
}

interface Friend {
  id: string;
  friend: UserData;
}

interface VisibilityOption {
  label: string;
  icon: JSX.Element;
}

interface NewIntentionModalProps {
  visible: boolean;
  onClose: () => void;
  newIntention: NewIntention;
  setNewIntention: (intention: NewIntention) => void;
  showVisibilityDropdown: boolean;
  setShowVisibilityDropdown: (show: boolean) => void;
  visibilityOptions: VisibilityOption[];
  userGroups: Group[];
  friends: Friend[];
  createDescriptionFocused: boolean;
  setCreateDescriptionFocused: (focused: boolean) => void;
  toggleNewGroupSelection: (groupId: string) => void;
  toggleNewFriendSelection: (friendId: string) => void;
  onCreateIntention: () => void;
}

const intentionTypes = [
  "prayer",
  "resolution", 
  "goal",
  "spiritual",
  "family",
  "health",
  "work",
  "friends",
  "world",
  "personal",
  "other",
];

export default function NewIntentionModal({
  visible,
  onClose,
  newIntention,
  setNewIntention,
  showVisibilityDropdown,
  setShowVisibilityDropdown,
  visibilityOptions,
  userGroups,
  friends,
  createDescriptionFocused,
  setCreateDescriptionFocused,
  toggleNewGroupSelection,
  toggleNewFriendSelection,
  onCreateIntention,
}: NewIntentionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>New Intention</Text>
              
              {/* Type Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type</Text>
                <View style={styles.pickerContainer}>
                  {intentionTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        newIntention.type === type && styles.selectedTypeOption,
                      ]}
                      onPress={() =>
                        setNewIntention({
                          ...newIntention,
                          type: type,
                        })
                      }
                    >
                      <Text style={styles.typeOptionText}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Visibility Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Visibility</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowVisibilityDropdown(!showVisibilityDropdown)}
                >
                  <View style={styles.dropdownContent}>
                    {
                      visibilityOptions.find(
                        (option) => option.label === newIntention.visibility,
                      )?.icon
                    }
                    <Text style={[styles.dropdownText, { marginLeft: 8 }]}>
                      {newIntention.visibility}
                    </Text>
                  </View>
                  <Feather
                    name={showVisibilityDropdown ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#fbbf24"
                  />
                </TouchableOpacity>
                
                {showVisibilityDropdown && (
                  <View style={styles.dropdownOptions}>
                    {visibilityOptions.map((option) => (
                      <TouchableOpacity
                        key={option.label}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setNewIntention({
                            ...newIntention,
                            visibility: option.label,
                            selectedGroups: option.label === "Certain Groups" ? newIntention.selectedGroups : [],
                            selectedFriends: option.label === "Certain Friends" ? newIntention.selectedFriends : [],
                          });
                          setShowVisibilityDropdown(false);
                        }}
                      >
                        <View style={styles.dropdownOptionContent}>
                          {option.icon}
                          <Text style={styles.dropdownOptionText}>{option.label}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Group Selector */}
                {newIntention.visibility === "Certain Groups" && (
                  <View style={styles.groupSelectorContainer}>
                    <Text style={styles.groupSelectorLabel}>Select Groups:</Text>
                    <View style={styles.groupSelectorList}>
                      {userGroups.map((group) => (
                        <TouchableOpacity
                          key={group.id}
                          style={[
                            styles.groupOption,
                            newIntention.selectedGroups &&
                            newIntention.selectedGroups.includes(group.id)
                              ? styles.groupOptionSelected
                              : null,
                          ]}
                          onPress={() => toggleNewGroupSelection(group.id)}
                        >
                          <Text style={styles.groupOptionText}>{group.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Friend Selector */}
                {newIntention.visibility === "Certain Friends" && (
                  <View style={styles.friendSelectorContainer}>
                    <Text style={styles.friendSelectorLabel}>
                      Select Friends ({friends.length})
                    </Text>
                    <ScrollView
                      style={styles.friendSelectorList}
                      contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap" }}
                      showsVerticalScrollIndicator={true}
                    >
                      {friends.length === 0 ? (
                        <Text
                          style={[
                            styles.friendOptionText,
                            { textAlign: "center", marginTop: 10 },
                          ]}
                        >
                          No friends found. Add friends to share intentions with them.
                        </Text>
                      ) : (
                        friends.map((friend) => (
                          <TouchableOpacity
                            key={friend.id}
                            style={[
                              styles.friendOption,
                              newIntention.selectedFriends.includes(friend.friend.id)
                                ? styles.friendOptionSelected
                                : null,
                            ]}
                            onPress={() => toggleNewFriendSelection(friend.friend.id)}
                          >
                            <Text style={styles.friendOptionText}>
                              {friend.friend.first_name} {friend.friend.last_name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Title Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title</Text>
                <TextInput
                  style={styles.formInput}
                  value={newIntention.title}
                  onChangeText={(text) => setNewIntention({ ...newIntention, title: text })}
                  placeholder="Enter title..."
                  placeholderTextColor="rgba(254, 243, 199, 0.4)"
                  inputAccessoryViewID="accessoryViewID"
                />
              </View>

              {/* Description Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={[
                      styles.formTextarea,
                      createDescriptionFocused && styles.formTextareaFocused,
                    ]}
                    value={newIntention.description}
                    onChangeText={(text) =>
                      setNewIntention({ ...newIntention, description: text })
                    }
                    placeholder="Enter description..."
                    placeholderTextColor="rgba(254, 243, 199, 0.4)"
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                    inputAccessoryViewID="accessoryViewID"
                    onFocus={() => setCreateDescriptionFocused(true)}
                    onBlur={() => setCreateDescriptionFocused(false)}
                  />
                  {createDescriptionFocused && (
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        setCreateDescriptionFocused(false);
                      }}
                    >
                      <Feather name="check" size={20} color="#fbbf24" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <InputAccessoryView nativeID="accessoryViewID">
                <View style={styles.accessory}>
                  <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                    <Text style={styles.accessoryText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </InputAccessoryView>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.createButton} 
                  onPress={onCreateIntention}
                >
                  <Text style={styles.createButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalScrollView: {
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: 'rgba(28, 25, 23, 0.95)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fef3c7',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  selectedTypeOption: {
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    borderColor: 'rgba(251, 191, 36, 0.6)',
  },
  typeOptionText: {
    color: '#fef3c7',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    color: '#fef3c7',
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownOptions: {
    marginTop: 8,
    backgroundColor: 'rgba(41, 37, 36, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.1)',
  },
  dropdownOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownOptionText: {
    color: '#fef3c7',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  groupSelectorContainer: {
    marginTop: 12,
  },
  groupSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 8,
  },
  groupSelectorList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  groupOptionSelected: {
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    borderColor: 'rgba(251, 191, 36, 0.6)',
  },
  groupOptionText: {
    color: '#fef3c7',
    fontSize: 12,
    fontWeight: '500',
  },
  friendSelectorContainer: {
    marginTop: 12,
  },
  friendSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 8,
  },
  friendSelectorList: {
    maxHeight: 120,
  },
  friendOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    margin: 4,
  },
  friendOptionSelected: {
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    borderColor: 'rgba(251, 191, 36, 0.6)',
  },
  friendOptionText: {
    color: '#fef3c7',
    fontSize: 12,
    fontWeight: '500',
  },
  formInput: {
    backgroundColor: 'rgba(41, 37, 36, 0.6)',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#fef3c7',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  textInputContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    backgroundColor: 'rgba(41, 37, 36, 0.6)',
  },
  formTextarea: {
    padding: 12,
    fontSize: 16,
    color: '#fef3c7',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formTextareaFocused: {
    borderColor: 'rgba(251, 191, 36, 0.6)',
  },
  closeButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessory: {
    backgroundColor: 'rgba(28, 25, 23, 0.9)',
    padding: 12,
    alignItems: 'flex-end',
  },
  accessoryText: {
    color: '#fbbf24',
    fontWeight: '600',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  cancelButtonText: {
    color: '#f87171',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.9)',
  },
  createButtonText: {
    color: '#1c1917',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});