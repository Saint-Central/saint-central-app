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
import { Church, ChurchMember, EditingIntention, Group, IntentionType, VisibilityType } from "../types";
import { styles } from "../styles";
import { VISIBILITY_OPTIONS } from "../utils";

interface EditIntentionModalProps {
  visible: boolean;
  editingIntention: EditingIntention | null;
  setEditingIntention: React.Dispatch<React.SetStateAction<EditingIntention | null>>;
  churches: Church[];
  churchGroups: Group[];
  churchMembers: ChurchMember[];
  selectedChurch: Church | null;
  editDescriptionFocused: boolean;
  setEditDescriptionFocused: React.Dispatch<React.SetStateAction<boolean>>;
  showVisibilityDropdownEdit: boolean;
  setShowVisibilityDropdownEdit: React.Dispatch<React.SetStateAction<boolean>>;
  toggleEditGroupSelection: (groupId: string) => void;
  toggleEditMemberSelection: (memberId: string) => void;
  handleUpdateIntention: () => void;
  setShowEditModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const EditIntentionModal: React.FC<EditIntentionModalProps> = ({
  visible,
  editingIntention,
  setEditingIntention,
  churches,
  churchGroups,
  churchMembers,
  selectedChurch,
  editDescriptionFocused,
  setEditDescriptionFocused,
  showVisibilityDropdownEdit,
  setShowVisibilityDropdownEdit,
  toggleEditGroupSelection,
  toggleEditMemberSelection,
  handleUpdateIntention,
  setShowEditModal,
}) => {
  if (!editingIntention) return null;

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
        onPress={() => toggleEditMemberSelection(member.user_id)}
      >
        <Text style={styles.memberOptionText}>
          {showName 
            ? `${member.user?.first_name || ''} ${member.user?.last_name || ''}`.trim() 
            : "Anonymous Member"}
          {isCurrentUser && <Text> (You)</Text>}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render church option for selection
  const renderChurchOption = (church: Church, selectedChurchId: string) => (
    <TouchableOpacity
      key={church.id}
      style={[
        styles.churchOption,
        church.id === selectedChurchId ? styles.churchOptionSelected : null,
      ]}
      onPress={() => {
        if (editingIntention) {
          setEditingIntention({
            ...editingIntention,
            selected_church: church.id
          });
        }
      }}
    >
      <Text style={styles.churchOptionText}>{church.name}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setShowEditModal(false);
        setEditingIntention(null);
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Intention</Text>
            
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
                      editingIntention.type === type && styles.selectedTypeOption,
                    ]}
                    onPress={() =>
                      setEditingIntention({
                        ...editingIntention,
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
                      editingIntention.selected_church
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
                onPress={() => setShowVisibilityDropdownEdit(!showVisibilityDropdownEdit)}
              >
                <View style={styles.dropdownContent}>
                  {
                    VISIBILITY_OPTIONS.find(
                      (option) => option.label === editingIntention.visibility,
                    )?.iconName
                  }
                  <Text style={[styles.dropdownText, { marginLeft: 8 }]}>
                    {editingIntention.visibility}
                  </Text>
                </View>
                <Feather
                  name={showVisibilityDropdownEdit ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#4361EE"
                />
              </TouchableOpacity>
              
              {showVisibilityDropdownEdit && (
                <View style={styles.dropdownOptions}>
                  {VISIBILITY_OPTIONS.map((option) => (
                    <TouchableOpacity 
                      key={option.label}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setEditingIntention({
                          ...editingIntention,
                          visibility: option.label as VisibilityType,
                        });
                        setShowVisibilityDropdownEdit(false);
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
            </View>
            
            {/* Title Field */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title</Text>
              <TextInput
                style={styles.formInput}
                value={editingIntention.title}
                onChangeText={(text) =>
                  setEditingIntention({
                    ...editingIntention,
                    title: text,
                  })
                }
                placeholder="Enter title..."
                placeholderTextColor="rgba(67, 97, 238, 0.5)"
                inputAccessoryViewID="accessoryViewID"
              />
            </View>
            
            {/* Description Field */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[
                  styles.formTextarea,
                  editDescriptionFocused && styles.formTextareaFocused,
                ]}
                value={editingIntention.description}
                onChangeText={(text) =>
                  setEditingIntention({
                    ...editingIntention,
                    description: text,
                  })
                }
                placeholder="Enter description..."
                placeholderTextColor="rgba(67, 97, 238, 0.5)"
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                inputAccessoryViewID="accessoryViewID"
                onFocus={() => setEditDescriptionFocused(true)}
                onBlur={() => setEditDescriptionFocused(false)}
              />
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
                onPress={() => {
                  setShowEditModal(false);
                  setEditingIntention(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createButton} onPress={handleUpdateIntention}>
                <Text style={styles.createButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditIntentionModal;