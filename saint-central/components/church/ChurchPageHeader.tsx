import { LinearGradient } from "expo-linear-gradient";
import {
  Animated,
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  GestureResponderEvent,
  Platform,
} from "react-native";
import DecoratedHeader from "../ui/DecoratedHeader";
import { Ionicons } from "@expo/vector-icons";
import { Church } from "@/types/church";
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";

type Props = {
  church: Church;
  userData: { username: string; profileImage: string };
  onPressMenu: ((event: GestureResponderEvent) => void) | undefined;
};

export default function ChurchPageHeader({ church, userData, onPressMenu }: Props) {
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Animate content fade in with spring effect
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.headerLeft}>
        <TouchableOpacity style={styles.menuButtonHeader} onPress={onPressMenu}>
          <LinearGradient
            colors={["rgba(58, 134, 255, 0.15)", "rgba(58, 134, 255, 0.05)"]}
            style={styles.menuGradient}
          >
            <Ionicons name="menu" size={24} color="#3A86FF" />
          </LinearGradient>
        </TouchableOpacity>
        <DecoratedHeader label={church.name} />
      </View>

      <TouchableOpacity
        onPress={() => router.navigate("/profile")}
        style={styles.profileContainer}
        activeOpacity={0.8}
      >
        {userData.profileImage ? (
          <View style={styles.profileWrapper}>
            <Image
              source={{ uri: userData.profileImage }}
              style={styles.profilePic}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={styles.profileWrapper}>
            <LinearGradient colors={["#3A86FF", "#4361EE"]} style={styles.profileGradient}>
              <Text style={styles.profileInitial}>
                {userData.username ? userData.username[0].toUpperCase() : "?"}
              </Text>
            </LinearGradient>
          </View>
        )}
        <View style={styles.notificationBadge} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: Platform.OS === "ios" ? 10 : 20,
    zIndex: 1,
  },
  menuButtonHeader: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "rgba(58, 134, 255, 0.3)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  menuGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileContainer: {
    position: "relative",
    zIndex: 1,
  },
  profileWrapper: {
    borderRadius: 24,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  profilePic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  profileGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  profileInitial: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FF006E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
