import Button from "@/components/ui/Button";
import theme from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Text, StyleSheet, SafeAreaView, TextInput, View } from "react-native";

type CourseField = {
  type: "TEXT";
  title: string;
  value?: string;
};

type CourseForm = {
  title: string;
  description: string;
  fields: CourseField[];
};

const CreateCourse = () => {
  const router = useRouter();
  const { churchId, userId, role } = useLocalSearchParams<{
    churchId?: string;
    userId?: string;
    role?: string;
  }>();

  if (!churchId || !userId || !role || (role !== "admin" && role !== "owner")) {
    if (!router.canGoBack()) {
      router.back();
    } else {
      router.navigate("/home");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>
        <Text style={styles.title}>Create Course</Text>
        <View style={styles.section}>
          <Text style={styles.subheader}>Course Information</Text>
          <TextInput
            style={styles.input}
            placeholder="Course Title"
            placeholderTextColor={theme.textLight}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Course Description"
            placeholderTextColor={theme.textLight}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.subheader}>Create Registration Form</Text>
          <Button>
            <Text style={{ color: theme.textWhite, fontWeight: theme.fontSemiBold }}>
              Add Section
            </Text>
          </Button>
          <Button style={{ backgroundColor: theme.success }}>
            <Text style={{ color: theme.textWhite, fontWeight: theme.fontSemiBold }}>Finish</Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "center",
    flexDirection: "row",
  },
  wrapper: {
    flex: 1,
    maxWidth: "90%",
  },
  title: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    marginBottom: 30,
  },
  subheader: {
    fontSize: 18,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  button: {
    backgroundColor: theme.primary,
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  finishButton: {
    backgroundColor: theme.success,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: theme.fontBold,
  },
});

export default CreateCourse;
