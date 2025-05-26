import theme from "@/theme";
import React from "react";
import {Text, StyleSheet, SafeAreaView, TextInput, View, TouchableOpacity} from "react-native"

const CreateCourse = () => {
  return (
    <SafeAreaView style={styles.container}>
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
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Add Section</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.finishButton]}>
            <Text style={styles.buttonText}>Finish</Text>
          </TouchableOpacity>
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
  },
  title: {
    fontSize: 24,
    fontWeight: theme.fontBold,
    color: theme.textDark,
    marginBottom: 20,
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
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    backgroundColor: theme.primary,
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  finishButton: {
    backgroundColor: theme.success,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: theme.fontBold,
  },
});

export default CreateCourse;
