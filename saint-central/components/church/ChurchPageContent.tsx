import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
  Text,
  Alert,
} from "react-native";
import { Church, ChurchMember } from "@/types/church";
import { ChurchActionButton } from "./ChurchActionButton";
import ChurchProfileCard from "./ChurchProfileCard";
import theme from "@/theme";
import { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  church: Church;
  userData: { username: string; profileImage: string };
  member?: ChurchMember | null;
};

export default function ChurchPageContent({ church, member, userData }: Props) {
  const router = useRouter();
  const [leavingChurch, setLeavingChurch] = useState<boolean>(false);

  const handleLeaveChurch = async (): Promise<void> => {
    if (!member) return;

    try {
      setLeavingChurch(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("No user logged in");

      // Delete the membership record
      const { error: deleteError } = await supabase
        .from("church_members")
        .delete()
        .eq("id", member.id);
      if (deleteError) throw deleteError;

      router.navigate("/home");
    } catch (error) {
      console.error("Error leaving church:", error);
      Alert.alert("Error", "Failed to leave the church. Please try again later.");
    } finally {
      setLeavingChurch(false);
    }
  };

  const confirmLeaveChurch = () => {
    Alert.alert(
      "Leave Church",
      "Are you sure you want to leave this church? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes, Leave",
          onPress: handleLeaveChurch,
          style: "destructive",
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <>
      {church.image && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: church.image }} style={styles.churchImage} resizeMode="cover" />
        </View>
      )}

      {/* Quick Action Buttons - MOVED UP HERE */}
      <ScrollView contentContainerStyle={styles.quickActionsScrollContainer}>
        <ChurchActionButton
          icon={
            <LinearGradient
              colors={["#3A86FF", "#4361EE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <FontAwesome5 name="church" size={26} color="#FFFFFF" />
            </LinearGradient>
          }
          onPress={() => {}}
        >
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonText}>Ministries</Text>
            <Text style={styles.buttonDescription}>Faith in action</Text>
          </View>
        </ChurchActionButton>
        <ChurchActionButton
          icon={
            <LinearGradient
              colors={["#FF006E", "#FB5607"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="book-outline" size={26} color="#FFFFFF" />
            </LinearGradient>
          }
          onPress={() => {}}
        >
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonText}>Courses</Text>
            <Text style={styles.buttonDescription}>Grow in knowledge</Text>
          </View>
        </ChurchActionButton>
        <ChurchActionButton
          icon={
            <LinearGradient
              colors={["#8338EC", "#6A0DAD"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <MaterialCommunityIcons name="calendar-clock" size={26} color="#FFFFFF" />
            </LinearGradient>
          }
          onPress={() => {}}
        >
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonText}>Schedule</Text>
            <Text style={styles.buttonDescription}>Plan your worship</Text>
          </View>
        </ChurchActionButton>
        <ChurchActionButton
          icon={
            <LinearGradient
              colors={["#06D6A0", "#1A936F"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="people" size={26} color="#FFFFFF" />
            </LinearGradient>
          }
          onPress={() => {}}
        >
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonText}>Community</Text>
            <Text style={styles.buttonDescription}>Connect with others</Text>
          </View>
        </ChurchActionButton>
      </ScrollView>

      <ChurchProfileCard church={church} member={member} />

      <TouchableOpacity
        style={styles.leaveChurchButton}
        onPress={confirmLeaveChurch}
        disabled={leavingChurch}
      >
        {leavingChurch ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name="exit-outline"
              size={18}
              color="#FFFFFF"
              style={styles.leaveChurchIcon}
            />
            <Text style={styles.leaveChurchText}>Leave Church</Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  leaveChurchButton: {
    marginTop: 20,
    marginBottom: 70,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBlock: 14,
    backgroundColor: theme.backgroundDestructive,
  },
  leaveChurchIcon: {
    marginRight: 10,
  },
  leaveChurchText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    flex: 1,
  },
  titleAccent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 12,
  },
  floatingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.5,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  imageContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
    height: 200,
  },
  churchImage: {
    width: "100%",
    height: "100%",
  },
  quickActionsScrollContainer: {
    width: "100%",
    marginBottom: 20,
    gap: 10,
  },
  iconGradient: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4.5,
    elevation: 3,
  },
});
