import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

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
      <LinearGradient
        colors={["#1DA1F2", "#0077B5"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Feather name="user" size={selectedSize.icon} color="#FFFFFF" />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden",
  },
  gradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Avatar;
