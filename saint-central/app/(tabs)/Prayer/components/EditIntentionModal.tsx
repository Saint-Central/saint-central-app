import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Church, EditingIntention } from '../types';
import { FontAwesome5 } from '@expo/vector-icons';

interface EditIntentionModalProps {
  visible: boolean;
  editingIntention: EditingIntention | null;
  setEditingIntention: React.Dispatch<React.SetStateAction<EditingIntention | null>>;
  churches: Church[];
  churchGroups: any[];
  churchMembers: any[];
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowEditModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Intention</Text>
            <TouchableOpacity
              onPress={() => setShowEditModal(false)}
              style={styles.closeButton}
            >
              <FontAwesome5 name="times" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            <TextInput
              style={styles.input}
              value={editingIntention.title}
              onChangeText={(text) => setEditingIntention(prev => ({ ...prev!, title: text }))}
              placeholder="Title"
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editingIntention.description}
              onChangeText={(text) => setEditingIntention(prev => ({ ...prev!, description: text }))}
              placeholder="Description"
              multiline
              numberOfLines={4}
              onFocus={() => setEditDescriptionFocused(true)}
              onBlur={() => setEditDescriptionFocused(false)}
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleUpdateIntention}
            >
              <Text style={styles.submitButtonText}>Update Intention</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 8,
  },
  form: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4361EE',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditIntentionModal; 