import { Church, ChurchMember } from "@/types/church";
import { FontAwesome5, Feather } from "@expo/vector-icons";
import React from "react";
import { Animated, View, TouchableOpacity, Linking, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  church: Church;
  member?: ChurchMember | null;
};

export default function ChurchProfileCard({ church, member }: Props) {
  // Open phone call
  const callPhone = () => {
    if (church && church.phone) {
      Linking.openURL(`tel:${church.phone}`);
    }
  };

  // Open email
  const sendEmail = () => {
    if (church && church.email) {
      Linking.openURL(`mailto:${church.email}`);
    }
  };

  // Open website
  const openWebsite = () => {
    if (church && church.website) {
      Linking.openURL(
        church.website.startsWith("http") ? church.website : `https://${church.website}`,
      );
    }
  };

  return (
    <Animated.View style={styles.card}>
      <LinearGradient
        colors={["rgba(58, 134, 255, 0.05)", "rgba(67, 97, 238, 0.1)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="info-circle" size={16} color="#3A86FF" />
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <Text style={styles.sectionText}>{church.description}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Founded:</Text>
            <Text style={styles.detailText}>{church.founded}</Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="calendar-alt" size={16} color="#3A86FF" />
            <Text style={styles.sectionTitle}>Mass Schedule</Text>
          </View>
          <Text style={styles.sectionText}>{church.mass_schedule}</Text>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="address-book" size={16} color="#3A86FF" />
            <Text style={styles.sectionTitle}>Contact</Text>
          </View>

          <TouchableOpacity onPress={callPhone} style={styles.contactItem}>
            <View style={styles.contactIconContainer}>
              <FontAwesome5 name="phone" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.contactText}>{church.phone}</Text>
            <Feather name="chevron-right" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity onPress={sendEmail} style={styles.contactItem}>
            <View style={styles.contactIconContainer}>
              <FontAwesome5 name="envelope" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.contactText}>{church.email}</Text>
            <Feather name="chevron-right" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity onPress={openWebsite} style={styles.contactItem}>
            <View style={styles.contactIconContainer}>
              <FontAwesome5 name="globe" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.contactText}>{church.website}</Text>
            <Feather name="chevron-right" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="map-marker-alt" size={16} color="#3A86FF" />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>

          <View style={styles.contactItem}>
            <View style={styles.contactIconContainer}>
              <FontAwesome5 name="map-pin" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.contactText}>{church.address}</Text>
          </View>
        </View>

        {member ? (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="user-circle" size={16} color="#3A86FF" />
              <Text style={styles.sectionTitle}>Membership</Text>
            </View>

            <View style={styles.membershipContainer}>
              <View style={styles.membershipInfo}>
                <Text style={styles.membershipLabel}>Your Role:</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{member.role || "Member"}</Text>
                </View>
              </View>

              <View style={styles.membershipInfo}>
                <Text style={styles.membershipLabel}>Member Since:</Text>
                <Text style={styles.membershipText}>
                  {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : "Unknown"}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <></>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              /* Navigate to events */
              return;
            }}
          >
            <LinearGradient
              colors={["#3A86FF", "#4361EE"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <FontAwesome5
                name="calendar-alt"
                size={16}
                color="#FFFFFF"
                style={styles.actionIcon}
              />
              <Text style={styles.actionText}>Church Events</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              /* Navigate to members */
              return;
            }}
          >
            <LinearGradient
              colors={["#4CC9F0", "#4895EF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <FontAwesome5 name="users" size={16} color="#FFFFFF" style={styles.actionIcon} />
              <Text style={styles.actionText}>Members</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(203, 213, 225, 0.5)",
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 8,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    width: 80,
  },
  detailText: {
    fontSize: 14,
    color: "#1E293B",
    flex: 1,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  contactIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#3A86FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contactText: {
    fontSize: 14,
    color: "#334155",
    flex: 1,
  },
  membershipContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
  },
  membershipInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  membershipLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    width: 120,
  },
  membershipText: {
    fontSize: 14,
    color: "#1E293B",
  },
  roleBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4F46E5",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 12,
    overflow: "hidden",
  },
  actionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
