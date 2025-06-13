import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  TextInputProps,
  SafeAreaView,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import { Feather, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  BounceIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const isIpad = width >= 768;

// API Configuration
const AUTH_API_BASE = "https://auth-worker.colinmcherney.workers.dev";
const CRUD_API_BASE = "https://crud-worker.colinmcherney.workers.dev";

// Types
interface User {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  created_at: string;
  updated_at: string;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

// --- SVG Cross Component ---
const CrossIcon = () => {
  // Using Reanimated for the cross icon animation
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withSequence(
      withTiming(45, { duration: 600, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(0, { duration: 600, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <Animated.View style={[styles.crossIconContainer, animatedStyle]}>
      <View style={styles.crossVertical} />
      <View style={styles.crossHorizontal} />
    </Animated.View>
  );
};

// --- Interfaces ---
interface CustomInputProps {
  placeholder: string;
  value: string;
  setValue: (text: string) => void;
  keyboardType?: TextInputProps["keyboardType"];
  icon: React.ReactNode;
  secureEntry?: boolean;
  toggleSecure?: () => void;
  index: number;
}

// --- Utility Functions ---

// Nonce generation for replay protection
const generateNonce = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
};

// --- Password Validation Function ---
const validatePassword = (password: string): string | null => {
  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one digit.";
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must contain at least one symbol.";
  }
  return null;
};

// --- API Helper Functions ---
const apiCall = async (url: string, options: RequestInit = {}) => {
  const token = await AsyncStorage.getItem("access_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({ error: "Network error" }));

  if (!response.ok) {
    // Handle structured error responses from the auth worker
    if (data.code && data.error) {
      // Handle specific error codes with user-friendly messages
      switch (data.code) {
        case "RATE_LIMITED":
          throw new Error("Too many attempts. Please wait a moment and try again.");
        case "WEAK_PASSWORD":
          throw new Error(
            "Password must be at least 12 characters with uppercase, lowercase, numbers, and symbols.",
          );
        case "INVALID_EMAIL":
          throw new Error("Please enter a valid email address.");
        case "AUTH_FAILED":
          throw new Error("Invalid email or password. Please check your credentials.");
        case "TOKEN_EXPIRED":
          throw new Error("Your session has expired. Please sign in again.");
        case "INVALID_RESET_TOKEN":
          throw new Error(
            "This password reset link is invalid or has expired. Please request a new one.",
          );
        case "REDIS_ERROR":
          throw new Error("Service temporarily unavailable. Please try again in a moment.");
        default:
          throw new Error(data.error);
      }
    } else if (data.error) {
      throw new Error(data.error);
    } else {
      throw new Error(`Network error (${response.status})`);
    }
  }

  return data;
};

const storeTokens = async (session: AuthSession) => {
  await AsyncStorage.multiSet([
    ["access_token", session.access_token],
    ["refresh_token", session.refresh_token],
    ["user", JSON.stringify(session.user)],
    ["expires_at", (Date.now() + session.expires_in * 1000).toString()],
  ]);
};

const clearTokens = async () => {
  await AsyncStorage.multiRemove([
    "access_token",
    "refresh_token",
    "user",
    "expires_at",
    "oauth_state",
  ]);
};

const checkSession = async (): Promise<User | null> => {
  try {
    const result = await apiCall(`${AUTH_API_BASE}/auth/session`);
    if (result.success && result.valid) {
      return {
        id: result.user_id,
        email: result.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  } catch (error: any) {
    console.error("Session check failed:", error);

    // If session is invalid, try to refresh the token
    if (error.message?.includes("expired") || error.message?.includes("invalid")) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Try session check again with new token
        try {
          const result = await apiCall(`${AUTH_API_BASE}/auth/session`);
          if (result.success && result.valid) {
            return {
              id: result.user_id,
              email: result.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
        } catch (retryError) {
          console.error("Session check retry failed:", retryError);
        }
      }
    }
  }
  return null;
};

const tryRefreshToken = async (): Promise<boolean> => {
  try {
    const refreshToken = await AsyncStorage.getItem("refresh_token");
    if (!refreshToken) {
      return false;
    }

    const response = await apiCall(`${AUTH_API_BASE}/auth/refresh`, {
      method: "POST",
      body: JSON.stringify({
        refresh_token: refreshToken,
        nonce: generateNonce(),
      }),
    });

    if (response.success && response.access_token) {
      await AsyncStorage.multiSet([
        ["access_token", response.access_token],
        ["refresh_token", response.refresh_token],
        ["expires_at", (Date.now() + response.expires_in * 1000).toString()],
      ]);
      return true;
    }
  } catch (error) {
    console.error("Token refresh failed:", error);
    // Clear invalid tokens
    await clearTokens();
  }
  return false;
};

// --- Animated Input Component ---
const AnimatedInput = Animated.createAnimatedComponent(TextInput);

// --- Main Component ---
const AuthScreen: React.FC = () => {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgotPassword" | "resetPassword">(
    "login",
  );
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [resetToken, setResetToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [secureTextEntry, setSecureTextEntry] = useState<boolean>(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState<boolean>(true);
  const [secureNewPasswordEntry, setSecureNewPasswordEntry] = useState<boolean>(true);
  const [secureConfirmNewPasswordEntry, setSecureConfirmNewPasswordEntry] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Animated values
  const formOpacity = useSharedValue(0);
  const titlePosition = useSharedValue(-50);
  const buttonScale = useSharedValue(0.8);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    // Sequence of animations
    titlePosition.value = withSpring(0, {
      damping: 12,
      stiffness: 90,
    });

    formOpacity.value = withDelay(
      400,
      withTiming(1, {
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    );

    buttonOpacity.value = withDelay(
      600,
      withTiming(1, {
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    );

    buttonScale.value = withDelay(
      600,
      withSpring(1, {
        damping: 14,
        stiffness: 100,
      }),
    );

    // Check for existing session on app start
    checkExistingSession();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (url.startsWith("myapp://auth/callback")) {
        // Handle OAuth callback
        handleOAuthCallback(url);
      } else if (url.includes("reset-password") || url.includes("token=")) {
        // Handle password reset link
        handlePasswordResetLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkExistingSession = async () => {
    try {
      const user = await checkSession();
      if (user) {
        setCurrentUser(user);
        // Check if user needs denomination selection
        await checkUserDenomination(user.id);
      }
    } catch (error) {
      console.error("Session check failed:", error);
    }
  };

  const checkUserDenomination = async (userId: string) => {
    try {
      const response = await apiCall(CRUD_API_BASE, {
        method: "POST",
        body: JSON.stringify({
          operation: "SELECT",
          table: "users",
          where: { id: userId },
          select: "denomination",
        }),
      });

      if (response.success && response.data.length > 0) {
        const userData = response.data[0];
        if (userData.denomination) {
          navigateToHome();
        } else {
          navigateToDenominationSelection();
        }
      } else {
        // User not found in database, need to select denomination
        navigateToDenominationSelection();
      }
    } catch (error) {
      console.error("Error checking user denomination:", error);
      navigateToHome();
    }
  };

  // Animate when changing auth mode
  useEffect(() => {
    // Reset animations
    formOpacity.value = 0;
    buttonScale.value = 0.8;
    buttonOpacity.value = 0;

    // Restart animations with delays
    formOpacity.value = withDelay(
      100,
      withTiming(1, {
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    );

    buttonOpacity.value = withDelay(
      300,
      withTiming(1, {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    );

    buttonScale.value = withDelay(
      300,
      withSpring(1, {
        damping: 14,
        stiffness: 100,
      }),
    );
  }, [authMode]);

  // Animated styles
  const titleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: titlePosition.value }],
    };
  });

  const formStyle = useAnimatedStyle(() => {
    return {
      opacity: formOpacity.value,
    };
  });

  const buttonStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonOpacity.value,
      transform: [{ scale: buttonScale.value }],
    };
  });

  // Automatically clear error after 15 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 15000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const navigateToHome = () => {
    if (!isLoggedIn) {
      setIsLoggedIn(true);
      router.replace("/(tabs)/home");
    }
  };

  const navigateToDenominationSelection = () => {
    if (!isLoggedIn) {
      setIsLoggedIn(true);
      router.replace("/selectDenomination");
    }
  };

  const createUserInDatabase = async (
    userId: string,
    userEmail: string,
    firstName?: string,
    lastName?: string,
  ) => {
    try {
      await apiCall(CRUD_API_BASE, {
        method: "POST",
        body: JSON.stringify({
          operation: "INSERT",
          table: "users",
          data: {
            id: userId,
            email: userEmail,
            first_name: firstName || "",
            last_name: lastName || "",
          },
        }),
      });
    } catch (err) {
      console.error("Error inserting user:", err);
    }
  };

  const handlePasswordResetLink = async (url: string) => {
    try {
      const urlParams = new URL(url);
      const token = urlParams.searchParams.get("token");

      if (token) {
        setResetToken(token);
        setAuthMode("resetPassword");
        setMessage("Please enter your new password below.");
      } else {
        setError("Invalid password reset link. Please request a new one.");
      }
    } catch (error) {
      setError("Invalid password reset link. Please request a new one.");
    }
  };

  const handleOAuthCallback = async (url: string) => {
    try {
      setLoading(true);
      const urlParams = new URL(url);
      const code = urlParams.searchParams.get("code");
      const state = urlParams.searchParams.get("state");
      const error = urlParams.searchParams.get("error");
      const errorDescription = urlParams.searchParams.get("error_description");

      if (error) {
        throw new Error(`OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`);
      }

      if (!code || !state) {
        throw new Error("Invalid OAuth callback parameters");
      }

      // Validate state parameter
      const storedState = await AsyncStorage.getItem("oauth_state");
      if (state !== storedState) {
        throw new Error("Invalid OAuth state parameter - possible CSRF attack");
      }

      // Clear stored state
      await AsyncStorage.removeItem("oauth_state");

      const response = await apiCall(`${AUTH_API_BASE}/auth/callback?code=${code}&state=${state}`);

      if (response.access_token) {
        await storeTokens(response);
        setCurrentUser(response.user);

        // Check if user exists in database
        try {
          await checkUserDenomination(response.user.id);
        } catch (error) {
          // User doesn't exist, create them
          await createUserInDatabase(response.user.id, response.user.email || "");
          navigateToDenominationSelection();
        }
      } else {
        throw new Error("No access token received from OAuth callback");
      }
    } catch (e: any) {
      setError(e.message || "OAuth authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios") {
      setError("Apple Sign In is only available on iOS devices.");
      return;
    }

    try {
      setLoading(true);

      // Use native Apple Sign In
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("Unable to authenticate with Apple");
      }

      // Send the Apple identity token to your auth worker
      const response = await apiCall(`${AUTH_API_BASE}/auth/apple-signin`, {
        method: "POST",
        body: JSON.stringify({
          identityToken: credential.identityToken,
          user: credential.user,
          fullName: credential.fullName,
          email: credential.email,
          nonce: generateNonce(),
        }),
      });

      if (response.success && response.access_token) {
        await storeTokens(response);
        setCurrentUser(response.user);

        // Check if user exists in database or create them
        try {
          await checkUserDenomination(response.user.id);
        } catch (error) {
          // User doesn't exist, create them
          await createUserInDatabase(
            response.user.id,
            response.user.email || credential.email || "",
            credential.fullName?.givenName || "",
            credential.fullName?.familyName || "",
          );
          navigateToDenominationSelection();
        }
      } else {
        throw new Error("Apple Sign In failed. Please try again.");
      }
    } catch (e: any) {
      if (e.code === "ERR_CANCELED") {
        // User canceled the sign-in, don't show an error
        return;
      }
      setError(e.message || "Something went wrong with Apple Sign In. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setError("");
    setMessage("");

    try {
      setLoading(true);
      if (authMode === "login") {
        if (!email || !password) {
          throw new Error("Please enter both email and password.");
        }

        const response = await apiCall(`${AUTH_API_BASE}/auth/login`, {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            nonce: generateNonce(),
          }),
        });

        if (response.success) {
          await storeTokens(response);
          setCurrentUser(response.user);
          await checkUserDenomination(response.user.id);
        } else {
          throw new Error("Login failed. Please check your credentials.");
        }
      } else if (authMode === "signup") {
        if (!email || !password || !firstName || !lastName || !confirmPassword) {
          throw new Error("Please fill in all fields to sign up.");
        }
        if (password !== confirmPassword)
          throw new Error("Passwords don't match. Please check and try again.");

        // Pre-validate the password on the client side.
        const validationError = validatePassword(password);
        if (validationError) {
          throw new Error(validationError);
        }

        const response = await apiCall(`${AUTH_API_BASE}/auth/register`, {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            metadata: {
              first_name: firstName,
              last_name: lastName,
            },
            nonce: generateNonce(),
          }),
        });

        if (response.success) {
          if (response.access_token) {
            await storeTokens(response);
            setCurrentUser(response.user);
            await createUserInDatabase(response.user.id, email, firstName, lastName);
            setMessage("Welcome! You've signed up successfully.");
            await checkUserDenomination(response.user.id);
          } else {
            setMessage("Check your email to confirm your account.");
          }
        } else {
          throw new Error("Registration failed. Please try again.");
        }
      } else if (authMode === "forgotPassword") {
        // Forgot password - use the new password reset endpoint
        if (!email) {
          throw new Error("Please enter your email to reset your password.");
        }

        const response = await apiCall(`${AUTH_API_BASE}/auth/reset-password`, {
          method: "POST",
          body: JSON.stringify({
            email,
            nonce: `reset-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          }),
        });

        if (response.success) {
          setMessage("If the email exists in our system, you will receive a password reset link.");
          // Optionally switch back to login mode after showing message
          setTimeout(() => {
            setAuthMode("login");
            setMessage("");
          }, 3000);
        } else {
          throw new Error("Failed to send password reset email. Please try again.");
        }
      } else if (authMode === "resetPassword") {
        // Password reset confirmation
        if (!resetToken || !newPassword || !confirmNewPassword) {
          throw new Error("Please fill in all fields to reset your password.");
        }

        if (newPassword !== confirmNewPassword) {
          throw new Error("Passwords don't match. Please check and try again.");
        }

        // Validate the new password
        const validationError = validatePassword(newPassword);
        if (validationError) {
          throw new Error(validationError);
        }

        const response = await apiCall(`${AUTH_API_BASE}/auth/reset-password/confirm`, {
          method: "POST",
          body: JSON.stringify({
            token: resetToken,
            password: newPassword,
            nonce: generateNonce(),
          }),
        });

        if (response.success) {
          await storeTokens(response);
          setCurrentUser(response.user);
          setMessage("Password has been reset successfully. You are now logged in.");
          await checkUserDenomination(response.user.id);
        } else {
          throw new Error("Failed to reset password. Please try again.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Call logout API
      await apiCall(`${AUTH_API_BASE}/auth/logout`, {
        method: "POST",
        body: JSON.stringify({
          nonce: generateNonce(),
        }),
      });

      // Clear local tokens
      await clearTokens();

      // Navigate to auth screen
      router.push("/(auth)/auth");
    } catch (err: unknown) {
      // Even if API call fails, still clear local tokens and redirect
      await clearTokens();
      router.push("/(auth)/auth");

      if (err instanceof Error) {
        console.error("Logout error:", err.message);
      }
    }
  };

  const renderInput = ({
    placeholder,
    value,
    setValue,
    keyboardType = "default",
    icon,
    secureEntry,
    toggleSecure,
    index,
  }: CustomInputProps) => (
    <Animated.View
      entering={FadeIn.delay(index * 100).duration(400)}
      style={[
        styles.inputContainer,
        authMode === "signup" && placeholder.includes("Name") ? styles.nameInput : null,
      ]}
    >
      {icon}
      <AnimatedInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(100, 100, 100, 0.8)"
        value={value}
        onChangeText={setValue}
        keyboardType={keyboardType}
        secureTextEntry={secureEntry}
        autoCapitalize="none"
      />
      {toggleSecure && (
        <TouchableOpacity onPress={toggleSecure} style={styles.eyeIcon}>
          <Feather name={secureEntry ? "eye-off" : "eye"} size={20} color="#6366F1" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Modern Gradient Background */}
        <LinearGradient
          colors={["#F9FAFB", "#EEF2FF"]}
          style={styles.background}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Decorative Elements */}
        <Animated.View
          style={styles.decorativeCircle1}
          entering={FadeIn.duration(800).delay(200)}
        />
        <Animated.View
          style={styles.decorativeCircle2}
          entering={FadeIn.duration(800).delay(350)}
        />
        <Animated.View
          style={styles.decorativeCircle3}
          entering={FadeIn.duration(800).delay(500)}
        />

        {/* Toast error message */}
        {error !== "" && (
          <Animated.View
            style={styles.toastContainer}
            entering={SlideInDown.springify().damping(12)}
            exiting={FadeOut}
            pointerEvents="none"
          >
            <Text style={styles.toastText}>{error}</Text>
          </Animated.View>
        )}

        <SafeAreaView
          style={[
            styles.safeArea,
            { alignItems: "center" },
            isIpad && {
              maxWidth: 600,
              alignSelf: "center",
              justifyContent: "center",
            },
          ]}
        >
          <View style={[styles.content, isIpad && { maxWidth: 600 }]}>
            <Animated.View style={[styles.crossContainer, titleStyle]}>
              <CrossIcon />
            </Animated.View>

            <Animated.Text style={[styles.title, titleStyle]} entering={BounceIn.duration(600)}>
              Saint Central
            </Animated.Text>

            <Animated.Text
              style={[styles.subtitle, titleStyle]}
              entering={BounceIn.duration(600).delay(200)}
            >
              {authMode === "login"
                ? "Let's begin the journey to your spiritual life"
                : authMode === "signup"
                  ? "Join today"
                  : authMode === "forgotPassword"
                    ? "Reset your password to continue your journey"
                    : "Enter your new password"}
            </Animated.Text>

            {!error && message !== "" && (
              <Animated.View
                style={[styles.messageContainer, styles.successContainer]}
                entering={FadeIn.duration(400)}
              >
                <Feather name="check-circle" size={18} color="#10b981" />
                <Text style={styles.message}>{message}</Text>
              </Animated.View>
            )}

            <Animated.View style={[styles.form, formStyle]}>
              {(authMode === "login" || authMode === "signup" || authMode === "forgotPassword") &&
                renderInput({
                  placeholder: "Email",
                  value: email,
                  setValue: setEmail,
                  keyboardType: "email-address",
                  icon: <Feather name="mail" size={20} color="#6366F1" />,
                  index: 0,
                })}

              {authMode === "resetPassword" && (
                <>
                  {renderInput({
                    placeholder: "New Password",
                    value: newPassword,
                    setValue: setNewPassword,
                    secureEntry: secureNewPasswordEntry,
                    toggleSecure: () => setSecureNewPasswordEntry(!secureNewPasswordEntry),
                    icon: <Feather name="lock" size={20} color="#6366F1" />,
                    index: 0,
                  })}
                  {renderInput({
                    placeholder: "Confirm New Password",
                    value: confirmNewPassword,
                    setValue: setConfirmNewPassword,
                    secureEntry: secureConfirmNewPasswordEntry,
                    toggleSecure: () =>
                      setSecureConfirmNewPasswordEntry(!secureConfirmNewPasswordEntry),
                    icon: <Feather name="lock" size={20} color="#6366F1" />,
                    index: 1,
                  })}
                </>
              )}

              {authMode === "signup" && (
                <View style={styles.nameRow}>
                  {renderInput({
                    placeholder: "First Name",
                    value: firstName,
                    setValue: setFirstName,
                    icon: <Feather name="user" size={20} color="#6366F1" />,
                    index: 1,
                  })}
                  {renderInput({
                    placeholder: "Last Name",
                    value: lastName,
                    setValue: setLastName,
                    icon: <Ionicons name="person" size={20} color="#6366F1" />,
                    index: 2,
                  })}
                </View>
              )}

              {(authMode === "login" || authMode === "signup") &&
                renderInput({
                  placeholder: "Password",
                  value: password,
                  setValue: setPassword,
                  secureEntry: secureTextEntry,
                  toggleSecure: () => setSecureTextEntry(!secureTextEntry),
                  icon: <Feather name="lock" size={20} color="#6366F1" />,
                  index: authMode === "login" ? 1 : 3,
                })}

              {authMode === "signup" &&
                renderInput({
                  placeholder: "Confirm Password",
                  value: confirmPassword,
                  setValue: setConfirmPassword,
                  secureEntry: secureConfirmTextEntry,
                  toggleSecure: () => setSecureConfirmTextEntry(!secureConfirmTextEntry),
                  icon: <Feather name="lock" size={20} color="#6366F1" />,
                  index: 4,
                })}

              {authMode === "login" && (
                <Animated.View entering={FadeIn.delay(200).duration(400)}>
                  <TouchableOpacity
                    style={styles.forgotLink}
                    onPress={() => setAuthMode("forgotPassword")}
                  >
                    <Text style={styles.forgotText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </Animated.View>

            <Animated.View style={[buttonStyle]}>
              <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonInner}>
                    <Text style={styles.buttonText}>
                      {authMode === "login"
                        ? "START HERE"
                        : authMode === "signup"
                          ? "SIGN UP"
                          : authMode === "forgotPassword"
                            ? "RESET PASSWORD"
                            : "UPDATE PASSWORD"}
                    </Text>
                    <Feather name="arrow-right" size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            {authMode !== "forgotPassword" && authMode !== "resetPassword" && (
              <Animated.View
                style={styles.socialSection}
                entering={FadeIn.delay(700).duration(400)}
              >
                <Text style={styles.orText}>Or continue with</Text>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleAppleSignIn}
                  disabled={loading}
                >
                  <FontAwesome5 name="apple" size={24} color="#333333" />
                  <Text style={styles.socialButtonText}>Sign in with Apple</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {authMode !== "resetPassword" && (
              <Animated.View entering={FadeIn.delay(800).duration(400)}>
                <TouchableOpacity
                  onPress={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                >
                  <Text style={styles.switchText}>
                    {authMode === "login" ? "Need an account? Sign up" : "Already a member? Log in"}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            <Animated.View style={styles.footer} entering={FadeIn.delay(900).duration(400)}>
              <Text style={styles.footerText}>Powered by faith</Text>
            </Animated.View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    width: "100%",
    paddingTop: Platform.OS === "ios" ? 40 : 20,
  },
  crossContainer: {
    alignSelf: "center",
    marginBottom: 8,
  },
  crossIconContainer: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  crossVertical: {
    position: "absolute",
    width: 8,
    height: 48,
    backgroundColor: "#6366F1",
    borderRadius: 4,
  },
  crossHorizontal: {
    position: "absolute",
    width: 48,
    height: 8,
    backgroundColor: "#6366F1",
    borderRadius: 4,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#374151",
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#4B5563",
    marginBottom: 30,
    textAlign: "center",
    fontWeight: "400",
    opacity: 0.9,
    letterSpacing: 0.5,
    maxWidth: 280,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    width: "100%",
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  successContainer: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  error: {
    color: "#ef4444",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  message: {
    color: "#10b981",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  form: {
    width: "100%",
    gap: 16,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    width: "100%",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  nameInput: {
    flex: 1,
    width: undefined,
  },
  input: {
    flex: 1,
    color: "#374151",
    fontSize: 16,
    marginLeft: 12,
    height: "100%",
  },
  eyeIcon: {
    padding: 8,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    width: "100%",
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 0,
  },
  forgotText: {
    color: "#6366F1",
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 24,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  socialSection: {
    marginTop: 24,
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  orText: {
    color: "#6B7280",
    fontSize: 14,
  },
  socialButton: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  socialButtonText: {
    color: "#333333",
    fontSize: 16,
    fontWeight: "500",
  },
  switchText: {
    color: "#6366F1",
    fontSize: 14,
    marginTop: 24,
    fontWeight: "500",
  },
  footer: {
    marginTop: 32,
    marginBottom: 24,
  },
  footerText: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  toastContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(239,68,68,0.9)",
    padding: 12,
    borderRadius: 12,
    zIndex: 100,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  // Decorative elements
  decorativeCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    top: -50,
    right: -50,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    bottom: 100,
    left: -50,
  },
  decorativeCircle3: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    bottom: 30,
    right: 30,
  },
});

export default AuthScreen;
