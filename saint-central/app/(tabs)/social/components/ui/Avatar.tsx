import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { Feather } from "@expo/vector-icons";

interface AvatarProps {
  size?: "sm" | "md" | "lg";
  imageUrl?: string;
}

const Avatar: React.FC<AvatarProps> = ({ size = "md", imageUrl }) => {
  // Define sizes for different avatar variants
  const sizeMap = {
    sm: { container: 32, icon: 16 },
    md: { container: 40, icon: 20 },
    lg: { container: 50, icon: 24 },
  };

  const selectedSize = sizeMap[size];

  return (
    <View
      style={[
        styles.avatarContainer,
        {
          width: selectedSize.container,
          height: selectedSize.container,
          borderRadius: selectedSize.container / 2,
        },
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.avatarImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Feather name="user" size={selectedSize.icon} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    overflow: "hidden",
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#4A5568",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Avatar;
