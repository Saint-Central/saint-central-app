import theme from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Error() {
  return (
    <View style={styles.stateContainer}>
      <View style={styles.errorIconContainer}>
        <Ionicons name="alert-circle" size={36} color={theme.error} />
      </View>
      <Text style={styles.errorText}>Something went wrong!</Text>
      <Text style={styles.errorText}>Please try again later.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacingXL,
    marginTop: theme.spacing2XL,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.radiusFull,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacingL,
  },
  errorText: {
    fontSize: 16,
    fontWeight: theme.fontMedium,
    color: theme.error,
    textAlign: "center",
  },
});
