import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigationHistory } from '../../contexts/NavigationHistoryContext';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { usePathname } from 'expo-router';

export default function GlobalBackButton() {
  const { canGoBack, goBack } = useNavigationHistory();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Don't show back button on home/church landing page, courses page, church members page, volunteering page, Lent 2025, events, ministries, or discover
  const isHomePage = pathname === '/home' || pathname === '/(tabs)/home';
  const isCoursesPage = pathname === '/coursehomepage' || pathname === '/(tabs)/coursehomepage';
  const isChurchMembersPage = pathname === '/church_members' || pathname === '/(tabs)/church_members';
  const isVolunteeringPage = pathname === '/volunteerhomepage' || pathname === '/(tabs)/volunteerhomepage';
  const isCreateVolunteerPage = pathname === '/createvolunteerpage' || pathname === '/(tabs)/createvolunteerpage';
  const isLent2025Page = pathname === '/Lent2025' || pathname === '/(tabs)/Lent2025';
  const isEventsPage = pathname === '/events' || pathname === '/(tabs)/events';
  const isMinistriesPage = pathname === '/MinistriesScreen' || pathname === '/(tabs)/MinistriesScreen';
  const isDiscoverPage = pathname === '/discover' || pathname === '/(tabs)/discover';
  const isFaithPage = pathname === '/faith' || pathname === '/(tabs)/faith' || pathname.includes('/faith/');
  const isWomensMinistryPage = pathname === '/womens-ministry' || pathname === '/(tabs)/womens-ministry' || pathname.includes('/womens-ministry/');
  const isCultureTestimoniesPage = pathname === '/culture-and-testimonies' || pathname === '/(tabs)/culture-and-testimonies' || pathname.includes('/culture-and-testimonies/');
  const isNewsPage = pathname === '/news' || pathname === '/(tabs)/news' || pathname.includes('/news/');
  const isBiblePage = pathname === '/Bible' || pathname === '/(tabs)/Bible';
  const isChurchEventsPage = pathname === '/church_events' || pathname === '/(tabs)/church_events' || pathname.includes('/church_events/');
  const shouldHideButton = isHomePage || isCoursesPage || isChurchMembersPage || isVolunteeringPage || isCreateVolunteerPage || isLent2025Page || isEventsPage || isMinistriesPage || isDiscoverPage || isFaithPage || isWomensMinistryPage || isCultureTestimoniesPage || isNewsPage || isBiblePage || isChurchEventsPage;
  
  // Check if on Prayer Intentions page for special positioning
  const isPrayerIntentionsPage = pathname === '/PrayerIntentions' || pathname === '/(tabs)/PrayerIntentions';
  
  // Check if on Donate page for special styling
  const isDonatePage = pathname === '/donate' || pathname === '/(tabs)/donate';

  useEffect(() => {
    if (canGoBack && !shouldHideButton) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [canGoBack, shouldHideButton, fadeAnim, scaleAnim]);

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    goBack();
  };

  if (!canGoBack || shouldHideButton) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: isPrayerIntentionsPage ? insets.top + 80 : insets.top + 10,
          left: isPrayerIntentionsPage ? 20 : 20,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      pointerEvents={canGoBack ? 'auto' : 'none'}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[styles.button, isPrayerIntentionsPage && styles.buttonSmall]}
      >
        <BlurView 
          intensity={isDonatePage ? 50 : 85} 
          tint={isDonatePage ? "dark" : "light"} 
          style={styles.blur}
        >
          <View style={[
            styles.iconContainer,
            isDonatePage && styles.donateIconContainer
          ]}>
            <Ionicons 
              name="arrow-back" 
              size={isPrayerIntentionsPage ? 18 : 22} 
              color={isDonatePage ? "#f59e0b" : "#1E293B"} 
            />
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    zIndex: 9999,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  blur: {
    flex: 1,
    borderRadius: 20,
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  donateIconContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
});