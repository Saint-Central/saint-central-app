import React from "react";
import { View, Text } from "react-native";
import { styles } from "../styles";
import { formatMessageDate } from "../utils/formatting";

interface DateDividerProps {
  date: string;
}

const DateDivider = ({ date }: DateDividerProps): JSX.Element => (
  <View style={styles.dateDividerContainer}>
    <View style={styles.dateDividerLine} />
    <View style={styles.dateDividerTextContainer}>
      <Text style={styles.dateDividerText}>{formatMessageDate(date)}</Text>
    </View>
    <View style={styles.dateDividerLine} />
  </View>
);

export default React.memo(DateDivider);
