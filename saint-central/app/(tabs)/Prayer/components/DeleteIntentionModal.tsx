import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
} from "react-native";
import { DeleteModalState } from "../types";
import { styles } from "../styles";

interface DeleteIntentionModalProps {
  deleteModal: DeleteModalState;
  setDeleteModal: React.Dispatch<React.SetStateAction<DeleteModalState>>;
  handleDeleteIntention: () => void;
}

const DeleteIntentionModal: React.FC<DeleteIntentionModalProps> = ({
  deleteModal,
  setDeleteModal,
  handleDeleteIntention,
}) => {
  return (
    <Modal
      visible={deleteModal.isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setDeleteModal({ isOpen: false, intentionId: null })}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModalContent}>
          <Text style={styles.modalTitle}>Delete Intention</Text>
          <Text style={styles.modalText}>Are you sure you want to delete this intention?</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setDeleteModal({ isOpen: false, intentionId: null })}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteIntention}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default DeleteIntentionModal;