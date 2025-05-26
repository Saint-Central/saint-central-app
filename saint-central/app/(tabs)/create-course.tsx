import theme from "@/theme";
import React from "react";
import { Text, StyleSheet, SafeAreaView } from "react-native";

const CreateCourse = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Create Course</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.textDark,
  },
  subheader: {},
});

export default CreateCourse;
