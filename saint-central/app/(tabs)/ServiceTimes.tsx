import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/supabaseClient";
import { useLocalSearchParams } from "expo-router";
import saintcentral from "../../api/src/client/sdk";

// Define types
interface ServiceTime {
  id: number;
  date: string;
  time: string;
  church_id: number;
  created_by: string;
  image?: string;
}

interface User {
  id: string;
  role: string;
  church_id: string;
}

// Mock data - this would come from your backend in a real app
const mockUser: User = {
  id: "user123",
  role: "admin",
  church_id: "church456",
};

const mockServiceTimes: ServiceTime[] = [
  { id: 1, date: "Sunday", time: "9:00 AM", church_id: 456, created_by: "user123" },
  { id: 2, date: "Sunday", time: "11:00 AM", church_id: 456, created_by: "user123" },
  { id: 3, date: "Wednesday", time: "6:30 PM", church_id: 456, created_by: "user123" },
];

// Theme
const theme = {
  // Main colors
  primary: "#A87C5F", // Warm brown
  secondary: "#C27F55", // Soft terracotta
  tertiary: "#D8846B", // Soft coral

  // Accent colors
  accent1: "#9B8557", // Muted gold
  accent2: "#B97A65", // Muted rust
  accent3: "#7D9B6A", // Sage green
  accent4: "#C78D60", // Warm amber

  // Neutrals
  neutral900: "#2D241F", // Almost black with warm undertone
  neutral800: "#3A2E28",
  neutral700: "#4E3F37",
  neutral600: "#6B5A50",
  neutral500: "#8A7668",
  neutral400: "#A99686",
  neutral300: "#C7B9AD",
  neutral200: "#E2D7CE",
  neutral100: "#F2EBE4",
  neutral50: "#F9F5F1", // Almost white with warm undertone

  // Special colors
  success: "#7D9B6A", // Sage green
  warning: "#C78D60", // Warm amber
  error: "#BC6C64", // Dusty rose
  info: "#6B8A9B", // Muted blue

  // Text
  textDark: "#3A2E28",
  textMedium: "#6B5A50",
  textLight: "#A99686",
  textWhite: "#F9F5F1",

  // UI Elements
  cardBg: "#FFFFFF",
  pageBg: "#F9F5F1",
  divider: "#E2D7CE",
  overlay: "rgba(45, 36, 31, 0.5)",
  overlayLight: "rgba(45, 36, 31, 0.2)",

  // Typography
  fontRegular: "400",
  fontMedium: "500",
  fontSemiBold: "600",
  fontBold: "700",

  // Radius
  radiusSmall: 8,
  radiusMedium: 12,
  radiusLarge: 16,
  radiusXL: 24,
  radiusFull: 9999,

  // Spacing
  spacingXS: 4,
  spacingS: 8,
  spacingM: 12,
  spacingL: 16,
  spacingXL: 24,
  spacing2XL: 32,
  spacing3XL: 48,
  spacing4XL: 64,
};

const getSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
};

const ChurchServiceTimesPage = () => {
  const { churchId } = useLocalSearchParams();
  const [serviceTimes, setServiceTimes] = useState<ServiceTime[]>([]);
  const [currentService, setCurrentService] = useState<ServiceTime | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasEditPermission, setHasEditPermission] = useState(false);

  // Fetch service times and check permissions
  useEffect(() => {
    fetchServiceTimes();
    checkPermissions();
  }, [churchId]);

  const fetchServiceTimes = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await saintcentral
        .withAuth(getSession())
        .from("service_times")
        .select("*")
        .where("church_id", churchId)
        .get();

      if (error) throw error;
      setServiceTimes(data || []);
    } catch (error) {
      console.error("Error fetching service times:", error);
      Alert.alert("Error", "Failed to load service times");
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermissions = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        setHasEditPermission(false);
        return;
      }

      // Check if user is admin or owner of the church
      const { data, error } = await saintcentral
        .withAuth(getSession())
        .from("church_members")
        .select("role")
        .where("church_id", churchId)
        .where("user_id", user.id)
        .single()
        .get();

      if (error) throw error;

      setHasEditPermission(data?.role === "admin" || data?.role === "owner");
    } catch (error) {
      console.error("Error checking permissions:", error);
      setHasEditPermission(false);
    }
  };

  const handleAddNew = () => {
    setCurrentService({
      date: "",
      time: "",
      church_id: Number(churchId),
      created_by: "", // Will be set during save
      image: "",
    } as ServiceTime); // Type assertion to satisfy TypeScript
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (service: ServiceTime) => {
    setCurrentService({ ...service });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentService) return;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        Alert.alert("Error", "You must be logged in to perform this action");
        return;
      }

      // Get session first
      const session = await getSession();

      if (isEditMode) {
        // Update existing service time
        const { error } = await saintcentral
          .withAuth(session)
          .from("service_times")
          .where("id", currentService.id)
          .update({
            date: currentService.date,
            time: currentService.time,
            image: currentService.image,
          });

        if (error) throw error;
      } else {
        // Add new service time - omit the id field to let Supabase generate it
        const { error } = await saintcentral.withAuth(session).from("service_times").insert({
          date: currentService.date,
          time: currentService.time,
          church_id: currentService.church_id,
          created_by: user.id,
          image: currentService.image,
        });

        if (error) throw error;
      }

      // Refresh the list
      await fetchServiceTimes();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving service time:", error);
      Alert.alert("Error", "Failed to save service time");
    }
  };

  // Render table header
  const renderHeader = () => (
    <View style={styles.headerRow}>
      <View style={styles.headerCell}>
        <Text style={styles.headerText}>Day</Text>
      </View>
      <View style={styles.headerCell}>
        <Text style={styles.headerText}>Time</Text>
      </View>
      {hasEditPermission && <View style={styles.actionCell} />}
    </View>
  );

  // Render a service time row
  const renderItem = ({ item }: { item: ServiceTime }) => (
    <View style={styles.row}>
      <View style={styles.cell}>
        <Text style={styles.dayText}>{item.date}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.timeText}>{item.time}</Text>
      </View>
      {hasEditPermission && (
        <View style={styles.actionCell}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editButton}>
            <Ionicons name="create-outline" size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Render empty state
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No service times available</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Church Service Times</Text>
        </View>

        <View style={styles.tableContainer}>
          {renderHeader()}
          <FlatList
            data={serviceTimes}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={renderEmptyComponent}
          />
        </View>

        <Text style={styles.footerText}>
          Only church administrators and owners can edit service times.
        </Text>

        {/* Add Service button moved below the table */}
        {hasEditPermission && (
          <TouchableOpacity
            onPress={handleAddNew}
            style={[styles.addButton, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="add" size={16} color={theme.textWhite} />
            <Text style={styles.buttonText}>Add Service</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={isModalOpen} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditMode ? "Edit Service Time" : "Add New Service Time"}
              </Text>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Day</Text>
                <TextInput
                  style={styles.input}
                  value={currentService?.date || ""}
                  onChangeText={(text) =>
                    currentService && setCurrentService({ ...currentService, date: text })
                  }
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Time</Text>
                <TextInput
                  style={styles.input}
                  value={currentService?.time || ""}
                  onChangeText={(text) =>
                    currentService && setCurrentService({ ...currentService, time: text })
                  }
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsModalOpen(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.pageBg,
    padding: theme.spacingXL,
    paddingTop: theme.spacing3XL, // Added more top padding to move everything down
  },
  card: {
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusMedium,
    padding: theme.spacingXL,
    shadowColor: theme.neutral900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center", // Center the title now that button is removed
    alignItems: "center",
    marginBottom: theme.spacingXL,
  },
  title: {
    color: theme.primary,
    fontWeight: "600",
    fontSize: 24,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // Center the button content
    padding: theme.spacingS,
    paddingHorizontal: theme.spacingL,
    borderRadius: theme.radiusSmall,
    gap: theme.spacingXS,
    marginTop: theme.spacingXL, // Add space above the button
    alignSelf: "center", // Center the button horizontally
    width: "60%", // Make button wider
  },
  buttonText: {
    color: theme.textWhite,
    fontWeight: "500",
    marginLeft: 4,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: theme.divider,
    borderRadius: theme.radiusSmall,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: theme.neutral100,
  },
  headerCell: {
    flex: 1,
    padding: theme.spacingM,
    paddingHorizontal: theme.spacingL,
  },
  headerText: {
    color: theme.textMedium,
    fontWeight: "500",
  },
  actionCell: {
    width: 60,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: theme.spacingL,
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.divider,
  },
  cell: {
    flex: 1,
    padding: theme.spacingM,
    paddingHorizontal: theme.spacingL,
  },
  dayText: {
    color: theme.textDark,
    fontWeight: "500",
  },
  timeText: {
    color: theme.textDark,
  },
  editButton: {
    padding: theme.spacingXS,
  },
  emptyContainer: {
    padding: theme.spacing2XL,
    alignItems: "center",
  },
  emptyText: {
    color: theme.textMedium,
    textAlign: "center",
  },
  footerText: {
    textAlign: "center",
    marginTop: theme.spacingL,
    fontSize: 14,
    color: theme.textMedium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacingL,
  },
  modalContent: {
    backgroundColor: theme.cardBg,
    borderRadius: theme.radiusLarge,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    padding: theme.spacingL,
    paddingHorizontal: theme.spacingXL,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  modalTitle: {
    color: theme.primary,
    fontWeight: "500",
    fontSize: 18,
  },
  modalBody: {
    padding: theme.spacingXL,
  },
  inputContainer: {
    marginBottom: theme.spacingL,
  },
  inputLabel: {
    marginBottom: theme.spacingS,
    color: theme.textDark,
    fontWeight: "500",
  },
  input: {
    width: "100%",
    padding: theme.spacingM,
    borderWidth: 1,
    borderColor: theme.divider,
    borderRadius: theme.radiusSmall,
    backgroundColor: theme.neutral50,
  },
  modalFooter: {
    padding: theme.spacingL,
    paddingHorizontal: theme.spacingXL,
    backgroundColor: theme.neutral50,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacingS,
    borderBottomLeftRadius: theme.radiusLarge,
    borderBottomRightRadius: theme.radiusLarge,
  },
  cancelButton: {
    padding: theme.spacingS,
    paddingHorizontal: theme.spacingL,
    borderWidth: 1,
    borderColor: theme.divider,
    borderRadius: theme.radiusSmall,
    backgroundColor: theme.cardBg,
  },
  cancelButtonText: {
    color: theme.textDark,
  },
  saveButton: {
    padding: theme.spacingS,
    paddingHorizontal: theme.spacingL,
    borderRadius: theme.radiusSmall,
  },
  saveButtonText: {
    color: theme.textWhite,
  },
});

export default ChurchServiceTimesPage;
