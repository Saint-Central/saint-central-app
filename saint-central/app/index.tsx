import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  TextInputProps,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../supabaseClient";
import { LinearGradient } from "expo-linear-gradient";
import {
  MaterialCommunityIcons,
  Feather,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Session } from "@supabase/supabase-js";

const { width, height } = Dimensions.get("window");

interface CustomInputProps {
  placeholder: string;
  value: string;
  setValue: (text: string) => void;
  keyboardType?: TextInputProps["keyboardType"];
  icon: React.ReactNode;
  secureEntry?: boolean;
  toggleSecure?: () => void;
}

const AuthScreen: React.FC = () => {
  // Initialize router from expo-router
  const router = useRouter();

  // State variables
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [secureTextEntry, setSecureTextEntry] = useState<boolean>(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] =
    useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [session, setSession] = useState<Session | null>(null);

  // Animation values
  const fadeAnim = useState<Animated.Value>(new Animated.Value(0))[0];
  const slideAnim = useState<Animated.Value>(new Animated.Value(50))[0];
  const logoSize = useState<Animated.Value>(new Animated.Value(0.8))[0];

  // Navigate to home if user is logged in
  const navigateToHome = () => {
    if (!isLoggedIn) {
      setIsLoggedIn(true);
      router.replace("/(tabs)/home");
    }
  };

  // Check for session on mount and subscribe to auth state changes
  useEffect(() => {
    // Run the animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoSize, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Check if a session already exists
    // Modify checkSession function
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        console.log(
          "Session check:",
          data?.session ? "Found session" : "No session"
        );

        if (data?.session) {
          // Add delay to navigation
          setTimeout(() => router.replace("/(tabs)/home"), 100);
        }
      } catch (err) {
        console.error("Session check error:", err);
      }
    };

    checkSession();

    // Subscribe to auth state changes (e.g. sign in, sign out)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth state changed:", event);
        setSession(currentSession);

        if (
          currentSession &&
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")
        ) {
          navigateToHome();
        } else if (event === "SIGNED_OUT") {
          setIsLoggedIn(false);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  // Animation for switching between login and signup
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [authMode]);

  const handleSubmit = async (): Promise<void> => {
    Keyboard.dismiss();
    setError("");
    setMessage("");

    if (authMode === "login") {
      if (!email || !password) {
        setError("Please fill out all fields.");
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
        } else if (data?.session) {
          setSession(data.session);
          setMessage("Logged in successfully!");
          navigateToHome();
        }
      } catch (err) {
        console.error("Login error:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    } else if (authMode === "signup") {
      if (!email || !password || !firstName || !lastName || !confirmPassword) {
        setError("Please fill out all fields.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      try {
        setLoading(true);

        // Sign up with user metadata
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });

        if (error) {
          setError(error.message);
        } else if (data?.user) {
          if (data.session) {
            setSession(data.session);
            setMessage("Sign up successful!");
            navigateToHome();
          } else {
            // Handle email confirmation if required
            setMessage("Please check your email for confirmation link.");
          }

          // Create user profile in profiles table if needed
          // This depends on your database structure
          try {
            const { error: profileError } = await supabase
              .from("profiles")
              .insert([
                {
                  id: data.user.id,
                  first_name: firstName,
                  last_name: lastName,
                  email: email,
                },
              ]);

            if (profileError) {
              console.error("Error creating profile:", profileError);
            }
          } catch (profileErr) {
            console.error("Failed to create profile:", profileErr);
          }
        }
      } catch (err) {
        console.error("Signup error:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleAuthMode = (): void => {
    setAuthMode(authMode === "login" ? "signup" : "login");
    setError("");
    setMessage("");
    // Reset fields when toggling
    if (authMode === "signup") {
      setFirstName("");
      setLastName("");
      setConfirmPassword("");
    }
  };

  // Render input with icon
  const renderInput = ({
    placeholder,
    value,
    setValue,
    keyboardType = "default",
    icon,
    secureEntry = false,
    toggleSecure = undefined,
  }: CustomInputProps): React.ReactNode => {
    return (
      <View style={styles.inputContainer}>
        <View style={styles.iconContainer}>{icon}</View>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          autoCapitalize="none"
          keyboardType={keyboardType}
          value={value}
          onChangeText={setValue}
          secureTextEntry={secureEntry}
        />
        {toggleSecure && (
          <TouchableOpacity style={styles.secureButton} onPress={toggleSecure}>
            <Feather
              name={secureEntry ? "eye-off" : "eye"}
              size={20}
              color="rgba(255, 255, 255, 0.7)"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Stars background animation component
  const TwinklingStars = () => {
    return (
      <View style={styles.starsContainer}>
        {Array.from({ length: 50 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: new Animated.Value(Math.random()),
                transform: [{ scale: Math.random() * 0.5 + 0.5 }],
              },
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={["#1c1917", "#292524", "#44403c"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientContainer}
        >
          {/* Bottom Navigation - Only shown when logged in */}
          {isLoggedIn && (
            <View style={styles.bottomNav}>
              <TouchableOpacity style={styles.navItem}>
                <MaterialCommunityIcons
                  name="compass"
                  size={24}
                  color="#fcd34d"
                />
                <Text style={styles.navText}>Discover</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={24}
                  color="#fcd34d"
                />
                <Text style={styles.navText}>Community</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem}>
                <MaterialCommunityIcons
                  name="account"
                  size={24}
                  color="#fcd34d"
                />
                <Text style={styles.navText}>Me</Text>
              </TouchableOpacity>
            </View>
          )}
          <TwinklingStars />

          {/* Decorative circle */}
          <Animated.View
            style={[
              styles.decorativeCircle,
              { transform: [{ scale: logoSize }], opacity: 0.05 },
            ]}
          />

          {/* Header with logo */}
          <Animated.View
            style={[
              styles.header,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.logoWrap}>
              <MaterialCommunityIcons name="church" size={32} color="#fcd34d" />
            </View>
            <Text style={styles.headerText}>Saint Central</Text>
          </Animated.View>

          {/* Main content */}
          <Animated.View
            style={[
              styles.formContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
              {/* Error and success messages */}
              {error ? (
                <View style={styles.messageContainer}>
                  <Feather name="alert-circle" size={18} color="#ef4444" />
                  <Text style={styles.error}>{error}</Text>
                </View>
              ) : null}
              {message ? (
                <View style={styles.messageContainer}>
                  <Feather name="check-circle" size={18} color="#10b981" />
                  <Text style={styles.message}>{message}</Text>
                </View>
              ) : null}

              {/* Form inputs */}
              <View style={styles.inputsContainer}>
                {renderInput({
                  placeholder: "Email",
                  value: email,
                  setValue: setEmail,
                  keyboardType: "email-address",
                  icon: <Feather name="mail" size={20} color="#fcd34d" />,
                })}

                {authMode === "signup" && (
                  <>
                    {renderInput({
                      placeholder: "First Name",
                      value: firstName,
                      setValue: setFirstName,
                      icon: <Feather name="user" size={20} color="#fcd34d" />,
                    })}
                    {renderInput({
                      placeholder: "Last Name",
                      value: lastName,
                      setValue: setLastName,
                      icon: (
                        <Ionicons name="person" size={20} color="#fcd34d" />
                      ),
                    })}
                  </>
                )}

                {renderInput({
                  placeholder: "Password",
                  value: password,
                  setValue: setPassword,
                  icon: <Feather name="lock" size={20} color="#fcd34d" />,
                  secureEntry: secureTextEntry,
                  toggleSecure: () => setSecureTextEntry(!secureTextEntry),
                })}

                {authMode === "signup" &&
                  renderInput({
                    placeholder: "Confirm Password",
                    value: confirmPassword,
                    setValue: setConfirmPassword,
                    icon: <Feather name="lock" size={20} color="#fcd34d" />,
                    secureEntry: secureConfirmTextEntry,
                    toggleSecure: () =>
                      setSecureConfirmTextEntry(!secureConfirmTextEntry),
                  })}
              </View>

              {/* Forgot password link (for login mode) */}
              {authMode === "login" && (
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              )}

              {/* Submit button */}
              <TouchableOpacity
                style={styles.button}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#eab308", "#facc15"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#1c1917" size="small" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>
                        {authMode === "login" ? "Sign In" : "Sign Up"}
                      </Text>
                      <Feather name="arrow-right" size={20} color="#1c1917" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Toggle between login and signup */}
              <TouchableOpacity
                style={styles.toggleContainer}
                onPress={toggleAuthMode}
              >
                <Text style={styles.toggleText}>
                  {authMode === "login"
                    ? "Don't have an account? "
                    : "Already have an account? "}
                </Text>
                <Text style={styles.toggleTextBold}>
                  {authMode === "login" ? "Sign Up" : "Sign In"}
                </Text>
              </TouchableOpacity>

              {/* Social login options */}
              {authMode === "login" && (
                <>
                  <View style={styles.orContainer}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>OR</Text>
                    <View style={styles.orLine} />
                  </View>
                  <View style={styles.socialContainer}>
                    <TouchableOpacity style={styles.socialButton}>
                      <FontAwesome5 name="google" size={20} color="#fcd34d" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.socialButton}>
                      <FontAwesome5
                        name="facebook-f"
                        size={20}
                        color="#fcd34d"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.socialButton}>
                      <FontAwesome5 name="apple" size={20} color="#fcd34d" />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Footer with cross */}
              <View style={styles.footer}>
                <MaterialCommunityIcons
                  name="cross"
                  size={14}
                  color="rgba(255, 255, 255, 0.2)"
                />
              </View>
            </BlurView>
          </Animated.View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  starsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  star: {
    position: "absolute",
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#fcd34d",
  },
  decorativeCircle: {
    position: "absolute",
    width: height * 0.4,
    height: height * 0.4,
    borderRadius: height * 0.2,
    backgroundColor: "#fcd34d",
    top: -height * 0.1,
    right: -width * 0.1,
  },
  header: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 20,
  },
  logoWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#44403c",
    borderWidth: 1,
    borderColor: "rgba(252, 211, 77, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  headerText: {
    fontSize: 30,
    fontWeight: "600",
    color: "#fcd34d",
    marginLeft: 12,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    letterSpacing: 0.5,
  },
  formContainer: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    maxHeight: height * 0.8,
  },
  blurContainer: {
    padding: 24,
    paddingTop: 20,
    borderWidth: 1,
    borderColor: "rgba(252, 211, 77, 0.2)",
    backgroundColor: "rgba(41, 37, 36, 0.7)",
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 8,
    padding: 8,
  },
  error: {
    color: "#ef4444",
    marginLeft: 8,
    fontSize: 14,
  },
  message: {
    color: "#10b981",
    marginLeft: 8,
    fontSize: 14,
  },
  inputsContainer: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(41, 37, 36, 0.8)",
    borderRadius: 8,
    marginBottom: 12,
    height: 54,
    borderWidth: 1,
    borderColor: "rgba(252, 211, 77, 0.15)",
  },
  iconContainer: {
    width: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    color: "#FFF",
    fontSize: 16,
    height: "100%",
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
  secureButton: {
    width: 50,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: "#fcd34d",
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    width: "100%",
    height: 54,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#1c1917",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  toggleText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
  },
  toggleTextBold: {
    color: "#fcd34d",
    fontSize: 16,
    fontWeight: "600",
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(252, 211, 77, 0.15)",
  },
  orText: {
    color: "rgba(252, 211, 77, 0.5)",
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  socialButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(41, 37, 36, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(252, 211, 77, 0.15)",
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(28, 25, 23, 0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(252, 211, 77, 0.2)",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
  },
  navItem: {
    alignItems: "center",
    padding: 8,
  },
  navText: {
    color: "#fcd34d",
    fontSize: 12,
    marginTop: 4,
  },
});

export default AuthScreen;
