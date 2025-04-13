import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

// Community cover page component
const CommunityPage: React.FC = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['right', 'left', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
      <View style={styles.container}>
        {/* Header with extra space - placed outside of top safe area */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Our Church Community</Text>
          <Text style={styles.headerSubtitle}>Connect, Serve, and Grow Together in Faith</Text>
        </View>

        {/* Main content */}
        <ScrollView style={styles.mainContent} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.welcomeText}>
            Welcome to our church community hub. Please select where you'd like to go:
          </Text>

          {/* Navigation cards */}
          <View style={styles.cardContainer}>
            {/* Church Community Card */}
        <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/churchcommunity')}
        >
              <View style={styles.iconContainer}>
                <FontAwesome5 name="users" size={42} color="#3B82F6" />
      </View>
              <Text style={styles.cardTitle}>Community Members</Text>
              <Text style={styles.cardDescription}>
                Connect with our church family, find small groups, and discover ways to get involved in our community.
          </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardFooterText}>Enter Community Section</Text>
                <FontAwesome5 name="chevron-right" size={20} color="#3B82F6" />
        </View>
        </TouchableOpacity>

            {/* Church Intentions Card */}
      <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/churchintentions')}
      >
              <View style={styles.iconContainer}>
                <FontAwesome5 name="hands-helping" size={42} color="#3B82F6" />
    </View>
              <Text style={styles.cardTitle}>Prayer Intentions</Text>
              <Text style={styles.cardDescription}>
                Share your prayer intentions, pray for others, and see how our community supports one another through faith.
            </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardFooterText}>View Prayer Intentions</Text>
                <FontAwesome5 name="chevron-right" size={20} color="#3B82F6" />
              </View>
            </TouchableOpacity>
</View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              "For where two or three gather in my name, there am I with them." — Matthew 18:20
                          </Text>
                    </View>
        </ScrollView>
                  </View>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#3B82F6', // Changed to blue to extend the header color
    // We explicitly don't include 'top' in the edges prop to handle that separately
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#3B82F6',
    paddingTop: 10, // Moderate top padding
    paddingBottom: 30, // More bottom padding for better spacing
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? Constants.statusBarHeight + 20 : 20, // Moderate spacing for status bar plus a bit extra
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    marginTop: 8,
  },
  mainContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 20, // More top padding for content
  },
  welcomeText: {
    fontSize: 18,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
  },
  cardContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16, // Added for devices that don't support gap
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    color: '#1F2937',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  cardFooterText: {
    color: '#3B82F6',
    fontWeight: '500',
    marginRight: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: '#F3F4F6',
  },
  footerText: {
    textAlign: 'center',
    color: '#6B7280',
    fontStyle: 'italic',
  },
});

export default CommunityPage;