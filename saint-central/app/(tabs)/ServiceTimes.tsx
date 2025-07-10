import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, FlatList, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useCRUD } from '@/utils/crudClient';
import { useLocalSearchParams } from 'expo-router';

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

// Christian Dark Theme - Simplified for React Native
const theme = {
  // Main colors
  primary: "#f59e0b",
  secondary: "#ef4444", 
  tertiary: "#3b82f6",
  
  // Accent colors
  accent1: "#fbbf24",
  accent2: "#fef3c7",
  accent3: "#f87171",
  
  // Neutrals
  neutral900: "#1c1917",
  neutral800: "#292524",
  neutral700: "#3f3a36",
  neutral600: "#57534e",
  neutral500: "#78716c",
  neutral400: "#a8a29e",
  neutral300: "#d6d3d1",
  neutral200: "#e7e5e4",
  neutral100: "#f5f5f4",
  neutral50: "#fafaf9",
  
  // Text colors
  textDark: "#1a1815",
  textMedium: "#fef3c7",
  textLight: "#fef3c7",
  textWhite: "#fef3c7",
  
  // UI Elements
  cardBg: "#292524",
  pageBg: "#1c1917",
  divider: "#57534e",
  overlay: "rgba(28, 25, 23, 0.85)",
};

const ChurchServiceTimesPage = () => {
  const { churchId } = useLocalSearchParams();
  const [serviceTimes, setServiceTimes] = useState<ServiceTime[]>([]);
  const [currentService, setCurrentService] = useState<ServiceTime | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasEditPermission, setHasEditPermission] = useState(false);
  
  // Use custom auth and CRUD
  const { user } = useAuth();
  const { select, selectOne, insert, update } = useCRUD();
  
  // Debug logging
  console.log('ServiceTimes component loaded with params:', { churchId });
  console.log('ChurchId type:', typeof churchId, 'Value:', churchId);
  
  // Fetch service times and check permissions
  useEffect(() => {
    if (churchId) {
      fetchServiceTimes();
      checkPermissions();
    } else {
      console.log('No churchId provided, skipping data fetch');
      setIsLoading(false);
    }
  }, [churchId, user]);

  const fetchServiceTimes = async () => {
    if (!churchId) {
      console.log('Cannot fetch service times: churchId is undefined');
      setServiceTimes([]);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch service times using CRUD client
      const data = await select('service_times', {
        where: { church_id: Number(churchId) }
      });

      if (data) {
        // Sort by date (ascending) since we can't use database ordering
        data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setServiceTimes(data);
      } else {
        setServiceTimes([]);
      }
    } catch (error) {
      console.error('Error fetching service times:', error);
      Alert.alert('Error', 'Failed to load service times');
      setServiceTimes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermissions = async () => {
    if (!churchId) {
      console.log('Cannot check permissions: churchId is undefined');
      setHasEditPermission(false);
      return;
    }

    try {
      if (!user) {
        console.log('No user found for permission check');
        setHasEditPermission(false);
        return;
      }

      console.log('Checking permissions for user:', user.id, 'in church:', churchId);

      // Check user's role in this church using CRUD client
      const membershipData = await selectOne('church_members', {
        where: { 
          church_id: Number(churchId),
          user_id: user.id 
        },
        select: 'role'
      });

      console.log('Membership data:', membershipData);

      if (membershipData) {
        const hasPermission = membershipData.role === 'admin' || membershipData.role === 'owner';
        console.log('User role:', membershipData.role, 'Has permission:', hasPermission);
        setHasEditPermission(hasPermission);
      } else {
        console.log('No membership found for user in this church');
        setHasEditPermission(false);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasEditPermission(false);
    }
  };
  
  const handleAddNew = () => {
    setCurrentService({
      date: "",
      time: "",
      church_id: Number(churchId),
      created_by: "",
      image: ""
    } as ServiceTime);
    setIsEditMode(false);
    setIsModalOpen(true);
  };
  
  const handleEdit = (service: ServiceTime) => {
    setCurrentService({...service});
    setIsEditMode(true);
    setIsModalOpen(true);
  };
  
  const handleSave = async () => {
    if (!currentService || !user) {
      Alert.alert('Error', 'You must be logged in to perform this action');
      return;
    }

    try {
      if (isEditMode) {
        // Update existing service time
        await update(
          'service_times',
          {
            date: currentService.date,
            time: currentService.time,
            image: currentService.image
          },
          { id: currentService.id }
        );
      } else {
        // Insert new service time
        await insert('service_times', {
          date: currentService.date,
          time: currentService.time,
          church_id: currentService.church_id,
          created_by: user.id,
          image: currentService.image
        });
      }

      await fetchServiceTimes();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving service time:', error);
      Alert.alert('Error', 'Failed to save service time');
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
  const renderItem = ({ item, index }: { item: ServiceTime; index: number }) => (
    <View style={[styles.row, { backgroundColor: index % 2 === 0 ? theme.cardBg : theme.neutral700 }]}>
      <View style={styles.cell}>
        <View style={styles.dayContainer}>
          <Ionicons name="calendar-outline" size={16} color={theme.primary} />
          <Text style={styles.dayText}>{item.date}</Text>
        </View>
      </View>
      <View style={styles.cell}>
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={16} color={theme.accent1} />
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
      </View>
      {hasEditPermission && (
        <View style={styles.actionCell}>
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            style={styles.editButton}
          >
            <Ionicons name="create-outline" size={16} color={theme.textWhite} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Render empty state
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={48} color={theme.neutral500} />
      <Text style={styles.emptyTitle}>No Service Times</Text>
      <Text style={styles.emptyText}>Start by adding your first service time</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.headerBackground}>
          <View style={styles.header}>
            <Ionicons name="home-outline" size={28} color={theme.textWhite} />
            <Text style={styles.title}>Service Times</Text>
          </View>
        </View>
        
        {/* Show error if no churchId */}
        {!churchId ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.neutral500} />
            <Text style={styles.errorTitle}>No Church Selected</Text>
            <Text style={styles.errorText}>Please navigate from a church page to view service times</Text>
          </View>
        ) : (
          <>
            {/* Table Container */}
            <View style={styles.tableContainer}>
              {renderHeader()}
              <FlatList
                data={serviceTimes}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                ListEmptyComponent={renderEmptyComponent}
                showsVerticalScrollIndicator={false}
              />
            </View>
            
            {/* Footer text */}
            <View style={styles.footerContainer}>
              <Ionicons name="shield-checkmark-outline" size={16} color={theme.neutral400} />
              <Text style={styles.footerText}>
                Only church administrators and owners can edit service times
              </Text>
            </View>
            
            {/* Add Service button */}
            {hasEditPermission && (
              <TouchableOpacity 
                onPress={handleAddNew}
                style={styles.addButton}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.textWhite} />
                <Text style={styles.buttonText}>Add New Service</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
      
      {/* Modal */}
      <Modal
        visible={isModalOpen}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Ionicons 
                name={isEditMode ? "create-outline" : "add-circle-outline"} 
                size={24} 
                color={theme.textWhite} 
              />
              <Text style={styles.modalTitle}>
                {isEditMode ? 'Edit Service Time' : 'Add New Service Time'}
              </Text>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="calendar-outline" size={16} color={theme.primary} />
                  <Text style={styles.inputLabel}>Day</Text>
                </View>
                <TextInput 
                  style={styles.input}
                  value={currentService?.date || ''}
                  onChangeText={(text) => currentService && setCurrentService({...currentService, date: text})}
                  placeholder="e.g., Sunday"
                  placeholderTextColor={theme.neutral400}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="time-outline" size={16} color={theme.primary} />
                  <Text style={styles.inputLabel}>Time</Text>
                </View>
                <TextInput 
                  style={styles.input}
                  value={currentService?.time || ''}
                  onChangeText={(text) => currentService && setCurrentService({...currentService, time: text})}
                  placeholder="e.g., 10:00 AM"
                  placeholderTextColor={theme.neutral400}
                />
              </View>
            </View>
            
            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color={theme.textWhite} />
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
    padding: 24,
    paddingTop: 64,
  },
  card: {
    backgroundColor: theme.cardBg,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  headerBackground: {
    backgroundColor: theme.primary,
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.textWhite,
    fontWeight: '700',
    fontSize: 28,
    marginLeft: 12,
  },
  tableContainer: {
    margin: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.neutral800,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    backgroundColor: theme.primary,
  },
  headerCell: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  headerText: {
    color: theme.textWhite,
    fontWeight: '700',
    fontSize: 16,
  },
  actionCell: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  dayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayText: {
    color: theme.textMedium,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  timeText: {
    color: theme.textMedium,
    fontSize: 16,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: theme.primary,
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    color: theme.textMedium,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyText: {
    color: theme.textLight,
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    padding: 48,
    alignItems: 'center',
    margin: 24,
  },
  errorTitle: {
    color: theme.textMedium,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  errorText: {
    color: theme.textLight,
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: theme.neutral800,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 13,
    color: theme.textLight,
    fontStyle: 'italic',
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 24,
    marginTop: 0,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonText: {
    color: theme.textWhite,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.cardBg,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.divider,
  },
  modalHeader: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  modalTitle: {
    color: theme.textWhite,
    fontWeight: '700',
    fontSize: 20,
    marginLeft: 12,
  },
  modalBody: {
    padding: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    color: theme.textMedium,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.divider,
    backgroundColor: theme.neutral800,
    color: theme.textMedium,
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 24,
    backgroundColor: theme.neutral800,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.divider,
    backgroundColor: theme.neutral700,
    marginRight: 12,
  },
  cancelButtonText: {
    color: theme.textMedium,
    fontWeight: '500',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    color: theme.textWhite,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 4,
  },
});

export default ChurchServiceTimesPage;