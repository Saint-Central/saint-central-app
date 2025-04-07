import theme from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { View, StyleSheet } from "react-native";

type Props = {
  decorate?: boolean;
  children?: ReactNode;
  variant?: "info";
};

export default function Card({ decorate = false, children }: Props) {
  return (
    <View style={styles.infoCard}>
      <LinearGradient
        colors={[theme.cardInfoGradientStart, theme.cardInfoGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.infoCardGradient}
      >
        {decorate && <CardDecoration />}
        {children}
      </LinearGradient>
    </View>
  );
}

function CardDecoration() {
  return (
    <View style={styles.cardDecoration}>
      <View style={[styles.decorationDot, styles.decorationDot1]} />
      <View style={[styles.decorationDot, styles.decorationDot2]} />
      <View style={[styles.decorationDot, styles.decorationDot3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    marginBottom: 30,
    borderRadius: 20,
    overflow: "hidden",
  },
  infoCardGradient: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.cardInfoBorderColor,
  },
  cardDecoration: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 60,
    height: 60,
  },
  decorationDot: {
    position: "absolute",
    borderRadius: 50,
  },
  decorationDot1: {
    width: 12,
    height: 12,
    backgroundColor: "rgba(58, 134, 255, 0.2)",
    top: 15,
    right: 15,
  },
  decorationDot2: {
    width: 8,
    height: 8,
    backgroundColor: "rgba(58, 134, 255, 0.15)",
    top: 30,
    right: 22,
  },
  decorationDot3: {
    width: 6,
    height: 6,
    backgroundColor: "rgba(58, 134, 255, 0.1)",
    top: 24,
    right: 35,
  },
});
