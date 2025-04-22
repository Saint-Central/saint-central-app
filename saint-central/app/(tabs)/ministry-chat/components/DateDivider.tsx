import React from "react";
import { View, Text } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { MotiView } from "moti";
import { styles } from "../styles";
import { formatMessageDate } from "../utils/formatting";

interface DateDividerProps {
  date: string;
}

const DateDivider = ({ date }: DateDividerProps) => {
  return (
    <MotiView
      style={styles.dateDividerContainer}
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "timing", duration: 400 }}
    >
      <View style={styles.dateDividerLine} />
      <Animated.View style={styles.dateDividerTextContainer} entering={FadeIn.duration(500)}>
        <Text style={styles.dateDividerText}>{formatMessageDate(date)}</Text>
      </Animated.View>
      <View style={styles.dateDividerLine} />
    </MotiView>
  );
};

export default React.memo(DateDivider);
