import { LinearGradient } from "expo-linear-gradient";
import {
  Animated,
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  GestureResponderEvent,
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

  useEffect(() => {
    // Animate content fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity style={styles.menuButtonHeader} onPress={onPressMenu}>
          <Ionicons name="menu" size={24} color="#3A86FF" />
        </TouchableOpacity>
        <DecoratedHeader label={church.name} />
      </View>

      <TouchableOpacity onPress={() => router.navigate("/profile")} style={styles.profileContainer}>
        {userData.profileImage ? (
          <Image
            source={{ uri: userData.profileImage }}
            style={styles.profilePic}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.profilePic}>
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
    marginTop: 10,
    zIndex: 1,
  },
  menuButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(58, 134, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileContainer: {
    position: "relative",
    zIndex: 1,
  },
  profilePic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  profileGradient: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
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
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF006E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
