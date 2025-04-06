import theme from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { StyleProp, ViewStyle, StyleSheet, View, Text } from "react-native";

type Props = { label: string; styles?: StyleProp<ViewStyle>; topBarMargin?: boolean };

export default function DecoratedHeader({ label, styles }: Props) {
  return (
    <View style={[componentStyles.headerContainer, styles]}>
      <LinearGradient
        colors={["#3A86FF", "#4361EE"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={componentStyles.titleAccent}
      />
      <Text style={componentStyles.headerTitle}>{label}</Text>
    </View>
  );
}

const componentStyles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleAccent: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: theme.textWeightBold,
    color: theme.textColor,
    letterSpacing: -0.5,
  },
});
