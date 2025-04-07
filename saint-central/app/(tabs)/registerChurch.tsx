import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  StatusBar,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../supabaseClient";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DecoratedHeader from "@/components/ui/DecoratedHeader";
import theme from "@/theme";

// Church registration form interface
interface ChurchFormData {
  name: string;
  address: string;
  denomination: string;
  description: string;
  founded: string;
  phone: string;
  email: string;
  mass_schedule: string;
  website: string;
}

export default function RegisterChurchScreen(): JSX.Element {
  const navigation = useNavigation();
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<ChurchFormData>({
    name: "",
    address: "",
    denomination: "",
    description: "",
    founded: "",
    phone: "",
    email: "",
    mass_schedule: "",
    website: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ChurchFormData, string>>>({});

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  // Handle animations
  useEffect(() => {
    // Animate content fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Animate form entrance
    Animated.spring(formAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, formAnim]);

  // Update form data
  const handleChange = (field: keyof ChurchFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field when user types
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ChurchFormData, string>> = {};

    // Required fields validation
    if (!formData.name.trim()) {
      newErrors.name = "Church name is required";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    // Email validation if provided
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Website validation if provided
    if (formData.website && !formData.website.includes(".")) {
      newErrors.website = "Please enter a valid website";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form to Supabase
  const handleSubmit = async () => {
    if (!validateForm()) {
      // Scroll to the first error
      Alert.alert("Error", "Please fix the errors in the form");
      return;
    }

    try {
      setLoading(true);

      // Get current user
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        Alert.alert("Authentication Error", "You must be logged in to register a church");
        return;
      }

      // Submit to pending_churches table
      const { error: submitError } = await supabase.from("pending_churches").insert([
        {
          ...formData,
          submitted_by: userId,
          status: "pending",
          submitted_at: new Date().toISOString(),
        },
      ]);

      if (submitError) throw submitError;

      // Success alert
      Alert.alert(
        "Church Submitted",
        "Your church registration has been submitted for review. You will be notified once it's approved.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("home" as never),
          },
        ],
      );
    } catch (error) {
      console.error("Error submitting church:", error);
      Alert.alert("Error", "Failed to submit church. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Main UI
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header with back button and title */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <DecoratedHeader label="Register Church" topBarMargin={false} />
      </View>

      {/* Main Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Animated.View
          style={[
            styles.mainContent,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Form intro */}
            <View style={styles.introContainer}>
              <FontAwesome5 name="church" size={30} color="#3A86FF" style={styles.introIcon} />
              <Text style={styles.introTitle}>Register Your Church</Text>
              <Text style={styles.introText}>
                Complete the form below to register your church. All submissions will be reviewed
                before being added to our directory.
              </Text>
            </View>

            {/* Form fields */}
            <Animated.View
              style={[
                styles.formContainer,
                {
                  transform: [
                    { scale: formAnim },
                    {
                      translateY: formAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                  opacity: formAnim,
                },
              ]}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Church Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, errors.name ? styles.inputError : null]}
                  placeholder="Enter church name"
                  value={formData.name}
                  onChangeText={(text) => handleChange("name", text)}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Address <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, errors.address ? styles.inputError : null]}
                  placeholder="Enter full address"
                  value={formData.address}
                  onChangeText={(text) => handleChange("address", text)}
                  multiline
                />
                {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Denomination</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Catholic, Protestant, Orthodox"
                  value={formData.denomination}
                  onChangeText={(text) => handleChange("denomination", text)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  placeholder="Brief description of your church"
                  value={formData.description}
                  onChangeText={(text) => handleChange("description", text)}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Founded Year</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 1980"
                  value={formData.founded}
                  onChangeText={(text) => handleChange("founded", text)}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter contact phone number"
                  value={formData.phone}
                  onChangeText={(text) => handleChange("phone", text)}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[styles.textInput, errors.email ? styles.inputError : null]}
                  placeholder="Enter contact email"
                  value={formData.email}
                  onChangeText={(text) => handleChange("email", text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mass/Service Schedule</Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  placeholder="Enter schedule details"
                  value={formData.mass_schedule}
                  onChangeText={(text) => handleChange("mass_schedule", text)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Website</Text>
                <TextInput
                  style={[styles.textInput, errors.website ? styles.inputError : null]}
                  placeholder="e.g., www.yourchurch.com"
                  value={formData.website}
                  onChangeText={(text) => handleChange("website", text)}
                  autoCapitalize="none"
                />
                {errors.website && <Text style={styles.errorText}>{errors.website}</Text>}
              </View>

              {/* Submit button */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                <LinearGradient
                  colors={["#3A86FF", "#4361EE"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <FontAwesome5
                        name="church"
                        size={18}
                        color="#FFFFFF"
                        style={styles.submitButtonIcon}
                      />
                      <Text style={styles.submitButtonText}>Submit Church</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.noticeContainer}>
                <Text style={styles.noticeText}>
                  <Text style={styles.noticeHighlight}>Note:</Text> All church submissions are
                  reviewed by our team before being added to the directory. This process may take
                  1-2 business days.
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacingTopBar,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  introContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  introIcon: {
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
  },
  formContainer: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  requiredStar: {
    color: "#FF006E",
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1E293B",
    backgroundColor: "#F8FAFC",
  },
  textAreaInput: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#FF006E",
    backgroundColor: "rgba(255, 0, 110, 0.05)",
  },
  errorText: {
    fontSize: 12,
    color: "#FF006E",
    marginTop: 4,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#3A86FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonGradient: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: theme.textWeightSemibold,
    color: "#FFFFFF",
  },
  noticeContainer: {
    backgroundColor: "rgba(58, 134, 255, 0.1)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#334155",
  },
  noticeHighlight: {
    fontWeight: "700",
  },
});
