import React from "react";
import { Image, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "../styles";
import { User, Ministry } from "../types";
import { getAvatarColor, getInitials } from "./avatarUtils";
import theme from "../../../../theme";

// Render a user avatar (for messages)
export const renderUserAvatar = (user?: User): JSX.Element => {
  if (user?.profile_image) {
    return <Image source={{ uri: user.profile_image }} style={styles.userAvatarImage} />;
  }

  // Placeholder with initials
  const name = user ? `${user.first_name} ${user.last_name}` : "";
  const avatarColor = getAvatarColor(name);
  const initials = getInitials(name);

  return (
    <LinearGradient
      colors={[avatarColor, avatarColor === theme.primary ? theme.secondary : theme.primary]}
      style={styles.userAvatarPlaceholder}
    >
      <Text style={styles.userAvatarInitials}>{initials}</Text>
    </LinearGradient>
  );
};

// Render ministry avatar
export const renderMinistryAvatar = (ministry?: Ministry | null): JSX.Element => {
  if (ministry?.image_url) {
    return <Image source={{ uri: ministry.image_url }} style={styles.ministryAvatarImage} />;
  }

  // Placeholder with initials
  const avatarColor = getAvatarColor(ministry?.name || "");
  const initials = getInitials(ministry?.name || "");

  return (
    <LinearGradient
      colors={[theme.primary, theme.secondary]}
      style={styles.ministryAvatarPlaceholder}
    >
      <Text style={styles.ministryAvatarInitials}>{initials}</Text>
    </LinearGradient>
  );
};
