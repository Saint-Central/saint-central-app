import { Church, ChurchMember } from "@/types/church";
import { FontAwesome5, Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Animated,
  View,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Text,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import theme from "@/theme";

type Props = {
  church: Church;
  member?: ChurchMember | null;
};

export default function ChurchProfileCard({ church, member }: Props) {
  // Animation for button press
  const [actionScale1] = useState(new Animated.Value(1));
  const [actionScale2] = useState(new Animated.Value(1));

  const handlePressIn = (buttonNumber: 1 | 2) => {
    Animated.spring(buttonNumber === 1 ? actionScale1 : actionScale2, {
      toValue: 0.97,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (buttonNumber: 1 | 2) => {
    Animated.spring(buttonNumber === 1 ? actionScale1 : actionScale2, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

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
        colors={[theme.cardInfoBackground, theme.cardInfoGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* About Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={[theme.primary, theme.indigo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBackgroundGradient}
            >
              <FontAwesome5 name="info-circle" size={15} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <Text style={styles.sectionText}>{church.description}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Founded:</Text>
            <Text style={styles.detailText}>{church.founded}</Text>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={[theme.violet, theme.fuchsia]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBackgroundGradient}
            >
              <FontAwesome5 name="address-book" size={15} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Contact & Location</Text>
          </View>

          <View style={styles.contactGrid}>
            <TouchableOpacity onPress={callPhone} style={styles.contactCard} activeOpacity={0.8}>
              <LinearGradient
                colors={[theme.primary, theme.indigo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.contactIconGradient}
              >
                <FontAwesome5 name="phone" size={14} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.contactLabel}>Phone</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={sendEmail} style={styles.contactCard} activeOpacity={0.8}>
              <LinearGradient
                colors={[theme.pink, theme.rose]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.contactIconGradient}
              >
                <FontAwesome5 name="envelope" size={14} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.contactLabel}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={openWebsite} style={styles.contactCard} activeOpacity={0.8}>
              <LinearGradient
                colors={[theme.emerald, theme.teal]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.contactIconGradient}
              >
                <FontAwesome5 name="globe" size={14} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.contactLabel}>Website</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactCard}
              activeOpacity={0.8}
              onPress={() =>
                Linking.openURL(`https://maps.google.com/?q=${church.lat},${church.lng}`)
              }
            >
              <LinearGradient
                colors={[theme.violet, theme.fuchsia]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.contactIconGradient}
              >
                <FontAwesome5 name="map-pin" size={14} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.contactLabel}>Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mass Schedule Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={[theme.pink, theme.rose]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBackgroundGradient}
            >
              <FontAwesome5 name="calendar-alt" size={15} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>Mass Schedule</Text>
          </View>
          <View style={styles.scheduleContainer}>
            <Text style={styles.sectionText}>{church.mass_schedule}</Text>
          </View>
        </View>

        {/* Membership Section (conditional) */}
        {member && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={[theme.pink, theme.rose]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconBackgroundGradient}
              >
                <FontAwesome5 name="user-circle" size={15} color="#FFFFFF" />
              </LinearGradient>
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
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButtonWrapper}
            activeOpacity={0.95}
            onPressIn={() => handlePressIn(1)}
            onPressOut={() => handlePressOut(1)}
            onPress={() => {
              /* Navigate to events */
              return;
            }}
          >
            <Animated.View style={[styles.actionButton, { transform: [{ scale: actionScale1 }] }]}>
              <LinearGradient
                colors={[theme.primary, theme.indigo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionGradient}
              >
                <FontAwesome5
                  name="calendar-alt"
                  size={15}
                  color="#FFFFFF"
                  style={styles.actionIcon}
                />
                <Text style={styles.actionText}>Church Events</Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButtonWrapper}
            activeOpacity={0.95}
            onPressIn={() => handlePressIn(2)}
            onPressOut={() => handlePressOut(2)}
            onPress={() => {
              /* Navigate to members */
              return;
            }}
          >
            <Animated.View style={[styles.actionButton, { transform: [{ scale: actionScale2 }] }]}>
              <LinearGradient
                colors={[theme.sky, theme.cyan]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionGradient}
              >
                <FontAwesome5 name="users" size={15} color="#FFFFFF" style={styles.actionIcon} />
                <Text style={styles.actionText}>Members</Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  card: {
    borderRadius: theme.cardBorderRadius,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: theme.indigo + "30",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cardGradient: {
    borderRadius: theme.cardBorderRadius,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.cardInfoBorderColor,
  },
  sectionContainer: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBackgroundGradient: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.textForeground,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.textForegroundMuted,
    marginBottom: 10,
  },
  scheduleContainer: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textForegroundMuted,
    width: 80,
  },
  detailText: {
    fontSize: 14,
    color: theme.textForeground,
    flex: 1,
  },
  contactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 6,
  },
  contactCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
    alignItems: "center",
  },
  contactIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textForeground,
    marginTop: 4,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
  },
  contactIconContainer: {
    marginRight: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  chevronContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(241, 245, 249, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  contactText: {
    fontSize: 15,
    color: theme.textForeground,
    flex: 1,
  },
  membershipContainer: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
  },
  membershipInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  membershipLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textForegroundMuted,
    width: 110,
  },
  membershipText: {
    fontSize: 14,
    color: theme.textForeground,
  },
  roleBadge: {
    backgroundColor: theme.accent1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.15)",
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.indigo,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  actionButtonWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  actionButton: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: theme.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  actionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
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
