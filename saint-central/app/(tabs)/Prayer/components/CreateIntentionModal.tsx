import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  InputAccessoryView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Church, ChurchMember, Group, IntentionType, NewIntention, VisibilityType } from "../types";
import { styles } from "../styles";
import { VISIBILITY_OPTIONS } from "../utils";

interface CreateIntentionModalProps {
  visible: boolean;
  newIntention: NewIntention;
  setNewIntention: React.Dispatch<React.SetStateAction<NewIntention>>;
  churches: Church[];
  churchGroups: Group[];
  churchMembers: ChurchMember[];
  selectedChurch: Church | null;
  createDescriptionFocused: boolean;
  setCreateDescriptionFocused: React.Dispatch<React.SetStateAction<boolean>>;
  showVisibilityDropdownNew: boolean;
  setShowVisibilityDropdownNew: React.Dispatch<React.SetStateAction<boolean>>;
  toggleNewGroupSelection: (groupId: string) => void;
  toggleNewMemberSelection: (memberId: string) => void;
  handleCreateIntention: () => void;
  setShowIntentionModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const CreateIntentionModal: React.FC<CreateIntentionModalProps> = ({
  visible,
  newIntention,
  setNewIntention,
  churches,
  churchGroups,
  churchMembers,
  selectedChurch,
  createDescriptionFocused,
  setCreateDescriptionFocused,
  showVisibilityDropdownNew,
  setShowVisibilityDropdownNew,
  toggleNewGroupSelection,
  toggleNewMemberSelection,
  handleCreateIntention,
  setShowIntentionModal,
}) => {
  // Render member option for selection
  const renderMemberOption = (member: ChurchMember, isSelected: boolean) => {
    const isCurrentUser = member.user?.id === member.user_id;
    const showName = isCurrentUser || !member.hide_name;

    return (
      <TouchableOpacity
        key={member.id}
        style={[
          styles.memberOption,
          isSelected ? styles.memberOptionSelected : null,
        ]}
        onPress={() => toggleNewMemberSelection(member.user_id)}
      >
        <Text style={styles.memberOptionText}>
          {showName 
            ? `${member.user?.first_name || ''} ${member.user?.last_name || ''}`.trim() 
            : "Anonymous Member"}
          {isCurrentUser && " (You)"}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render church option for selection
  const renderChurchOption = (church: Church, selectedChurchId: string | null) => (
    <TouchableOpacity
      key={church.id}
      style={[
        styles.churchOption,
        church.id === selectedChurchId ? styles.churchOptionSelected : null,
      ]}
      onPress={() => setNewIntention({...newIntention, selected_church: church.id})}
    >
      <Text style={styles.churchOptionText}>{church.name}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowIntentionModal(false)}
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
                  {[
                    "prayer",
                    "praise",
                    "spiritual",
                    "family",
                    "health",
                    "work",
                    "personal",
                    "other",
                  ].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        newIntention.type === type && styles.selectedTypeOption,
                      ]}
                      onPress={() =>
                        setNewIntention({
                          ...newIntention,
                          type: type as IntentionType,
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
              
              {/* Church Selection - if no selectedChurch is provided */}
              {!selectedChurch && churches.length > 0 && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Select Church</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.churchesContainer}
                  >
                    {churches.map((church) => (
                      renderChurchOption(
                        church, 
                        newIntention.selected_church
                      )
                    ))}
                  </ScrollView>
                </View>
              )}
              
              {/* Visibility Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Visibility</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowVisibilityDropdownNew(!showVisibilityDropdownNew)}
                >
                  <View style={styles.dropdownContent}>
                    {
                      VISIBILITY_OPTIONS.find(
                        (option) => option.label === newIntention.visibility,
                      )?.iconName
                    }
                    <Text style={[styles.dropdownText, { marginLeft: 8 }]}>
                      {newIntention.visibility}
                    </Text>
                  </View>
                  <Feather
                    name={showVisibilityDropdownNew ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#4361EE"
                  />
                </TouchableOpacity>
                
                {showVisibilityDropdownNew && (
                  <View style={styles.dropdownOptions}>
                    {VISIBILITY_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.label}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setNewIntention({
                            ...newIntention,
                            visibility: option.label as VisibilityType,
                            selected_groups:
                              option.label === "Certain Groups"
                                ? newIntention.selected_groups
                                : [],
                            selected_friends:
                              option.label === "Certain Members"
                                ? newIntention.selected_friends
                                : [],
                          });
                          setShowVisibilityDropdownNew(false);
                        }}
                      >
                        <View style={styles.dropdownOptionContent}>
                          {option.iconName}
                          <Text style={styles.dropdownOptionText}>{option.label}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {/* Group selection section */}
                {newIntention.visibility === "Certain Groups" && (
                  <View style={styles.groupSelectorContainer}>
                    <Text style={styles.groupSelectorLabel}>Select Groups:</Text>
                    <View style={styles.groupSelectorList}>
                      {churchGroups.length === 0 ? (
                        <Text style={styles.noGroupsText}>No groups available</Text>
                      ) : (
                        churchGroups.map((group) => (
                          <TouchableOpacity
                            key={group.id}
                            style={[
                              styles.groupOption,
                              newIntention.selected_groups.includes(group.id)
                                ? styles.groupOptionSelected
                                : null,
                            ]}
                            onPress={() => toggleNewGroupSelection(group.id)}
                          >
                            <Text style={styles.groupOptionText}>{group.name}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </View>
                )}
                
                {/* Member selection section */}
                {newIntention.visibility === "Certain Members" && (
                  <View style={styles.memberSelectorContainer}>
                    <Text style={styles.memberSelectorLabel}>
                      Select Members ({churchMembers.length})
                    </Text>
                    <ScrollView
                      style={styles.memberSelectorList}
                      contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap" }}
                      showsVerticalScrollIndicator={true}
                    >
                      {churchMembers.length === 0 ? (
                        <Text style={styles.noMembersText}>
                          No members found. Please select a different visibility option.
                        </Text>
                      ) : (
                        churchMembers.map((member) => (
                          renderMemberOption(
                            member,
                            newIntention.selected_friends.includes(member.user_id)
                          )
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              {/* Title Field */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title</Text>
                <TextInput
                  style={styles.formInput}
                  value={newIntention.title}
                  onChangeText={(text) => setNewIntention({ ...newIntention, title: text })}
                  placeholder="Enter title..."
                  placeholderTextColor="rgba(67, 97, 238, 0.5)"
                  inputAccessoryViewID="accessoryViewID"
                />
              </View>
              
              {/* Description Field */}
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
                    placeholderTextColor="rgba(67, 97, 238, 0.5)"
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
                      <Feather name="check" size={20} color="#4361EE" />
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
              
              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowIntentionModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.createButton} onPress={handleCreateIntention}>
                  <Text style={styles.createButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CreateIntentionModal;