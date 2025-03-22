import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

interface AvatarProps {
  size?: "sm" | "md" | "lg";
}

const Avatar: React.FC<AvatarProps> = ({ size = "md" }) => {
  // Define sizes for different avatar variants
  const sizeMap = {
    sm: { container: 32, icon: 18 },
    md: { container: 40, icon: 22 },
    lg: { container: 50, icon: 28 },
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
      <Feather name="user" size={selectedSize.icon} color="#FAC898" />
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
});

export default Avatar;
