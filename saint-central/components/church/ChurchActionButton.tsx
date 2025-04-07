import { MaterialIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { TouchableOpacity, View, StyleSheet, type GestureResponderEvent } from "react-native";

type Props = {
  icon?: ReactNode;
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
};

export function ChurchActionButton({ icon, children, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.buttonContent}>
        {icon && <View style={styles.buttonIconWrapper}>{icon}</View>}
        {children}
        <View style={styles.arrowContainer}>
          <MaterialIcons name="arrow-forward-ios" size={14} color="#CBD5E1" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  buttonIconWrapper: {
    marginRight: 16,
  },
  arrowContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionButton: {
    borderRadius: 16,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
});
