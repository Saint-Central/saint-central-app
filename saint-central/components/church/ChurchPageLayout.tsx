import React from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import ChurchPage from "@/components/church/ChurchPage";

type Props = {
  userData: {
    username: string;
    profileImage: string;
  };
};

export default function ChurchPageLayout({ userData }: Props) {
  return (
    <Animated.View style={styles.animatedContainer}>
      <ChurchPage userData={userData} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
