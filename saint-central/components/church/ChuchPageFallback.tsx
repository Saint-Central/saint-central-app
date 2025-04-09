import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Animated,
  StatusBar,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import theme from "@/theme";
import DecoratedHeader from "@/components/ui/DecoratedHeader";
import Button from "@/components/ui/Button";
import { useRouter } from "expo-router";

type Props = {
  error?: Error | null;
};

const CardDecoration = () => (
  <View style={{ position: "absolute", top: 10, right: 10, opacity: 0.15 }}>
    <FontAwesome5 name="cross" size={90} color="#FFFFFF" />
  </View>
);

export default function ChurchPageFallback({ error }: Props) {
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const buttonAnimValues = [0, 1, 2].map(() => useRef(new Animated.Value(0)).current);
  const registerButtonAnim = useRef(new Animated.Value(0)).current;

  // Handle animations
  useEffect(() => {
    // First animate the content upward
    Animated.sequence([
      // Fade in the main content
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Then animate content sliding up
      Animated.spring(contentAnim, {
        toValue: 1,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
      // Then animate the register button
      Animated.spring(registerButtonAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate buttons entrance with staggered delay
    Animated.stagger(
      150,
      buttonAnimValues.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [buttonAnimValues, fadeAnim, contentAnim, registerButtonAnim]);

  // Button press animation
  const pressButton = (index: number, pressed: boolean) => {
    Animated.spring(buttonAnimValues[index], {
      toValue: pressed ? 0.95 : 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Not a church member UI
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <DecoratedHeader
        label="Find Your Community"
        styles={{ marginTop: theme.spacingTopBar, marginBottom: 30, marginLeft: 20 }}
      />
      <Animated.View
        style={[
          styles.mainContent,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <LinearGradient
              colors={["rgba(239, 68, 68, 0.1)", "rgba(220, 38, 38, 0.15)"]}
              style={styles.errorGradient}
            >
              <Ionicons name="alert-circle-outline" size={22} color={theme.textErrorColor} />
              <Text style={styles.errorText}>Something went wrong. Please try again.</Text>
            </LinearGradient>
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <LinearGradient
                colors={[theme.cardInfoGradientStart, theme.cardInfoGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.infoCardGradient}
              >
                <CardDecoration />
                <Animated.View
                  style={[
                    styles.registerButtonContainer,
                    {
                      opacity: registerButtonAnim,
                      transform: [
                        { scale: registerButtonAnim },
                        {
                          translateY: registerButtonAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-10, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPressIn={() => pressButton(2, true)}
                    onPressOut={() => pressButton(2, false)}
                    onPress={() => router.navigate("/registerChurch")}
                    style={styles.registerButtonTouchable}
                  >
                    <Animated.View
                      style={[
                        {
                          transform: [{ scale: buttonAnimValues[2] }],
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={["#4CAF50", "#2E7D32"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.registerButton}
                      >
                        <FontAwesome5 name="plus-circle" size={12} color="#FFFFFF" />
                        <Text style={styles.registerButtonText}>Register Church</Text>
                      </LinearGradient>
                    </Animated.View>
                  </TouchableOpacity>
                </Animated.View>
                <View style={styles.infoIconContainer}>
                  <LinearGradient
                    colors={["#3A86FF", "#4361EE"]}
                    style={styles.infoIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <FontAwesome5 name="church" size={26} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={styles.infoTitle}>Join a Church Community</Text>
                <Text style={styles.infoDescription}>
                  Connect with a local church to grow in faith, access resources, and join
                  fellowship activities.
                </Text>
              </LinearGradient>
            </View>

            <View style={styles.buttonsContainer}>
              <Animated.View
                style={[
                  styles.buttonWrapper,
                  {
                    transform: [
                      { scale: buttonAnimValues[0] },
                      {
                        translateY: buttonAnimValues[0].interpolate({
                          inputRange: [0, 1],
                          outputRange: [40, 0],
                        }),
                      },
                    ],
                    opacity: buttonAnimValues[0],
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPressIn={() => pressButton(0, true)}
                  onPressOut={() => pressButton(0, false)}
                  onPress={() => router.navigate("/churchSearch")}
                >
                  <LinearGradient
                    colors={["#3A86FF", "#4361EE"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButton}
                  >
                    <MaterialCommunityIcons
                      name="magnify"
                      size={20}
                      color="#FFFFFF"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.primaryButtonText}>Search for a Church</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={[
                  styles.buttonWrapper,
                  {
                    transform: [
                      { scale: buttonAnimValues[1] },
                      {
                        translateY: buttonAnimValues[1].interpolate({
                          inputRange: [0, 1],
                          outputRange: [40, 0],
                        }),
                      },
                    ],
                    opacity: buttonAnimValues[1],
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPressIn={() => pressButton(1, true)}
                  onPressOut={() => pressButton(1, false)}
                  onPress={() => alert("In progress")}
                >
                  <LinearGradient
                    colors={["#FF9800", "#F57C00"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButton}
                  >
                    <MaterialCommunityIcons
                      name="account-group"
                      size={20}
                      color="#FFFFFF"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.primaryButtonText}>Search for a Community</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  errorContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "rgba(239, 68, 68, 0.5)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  errorGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  errorText: {
    fontSize: 14,
    color: theme.textErrorColor,
    marginLeft: 12,
    fontWeight: theme.fontMedium,
    flex: 1,
  },
  infoIconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  infoIcon: {
    width: 65,
    height: 65,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: theme.fontBold,
    color: theme.textForeground,
    textAlign: "center",
    marginBottom: 12,
  },
  infoDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.textForegroundMuted,
    textAlign: "center",
  },
  buttonsContainer: {
    marginBottom: 40,
    marginTop: 10,
  },
  infoCard: {
    marginBottom: 30,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "rgba(67, 97, 238, 0.3)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  infoCardGradient: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.cardInfoBorderColor,
  },
  registerButtonContainer: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  registerButtonTouchable: {
    shadowColor: "rgba(46, 125, 50, 0.5)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  registerButtonText: {
    fontSize: 12,
    fontWeight: theme.fontMedium,
    color: "#FFFFFF",
    marginLeft: 6,
  },
  buttonWrapper: {
    marginBottom: 16,
    shadowColor: "rgba(67, 97, 238, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: theme.fontBold,
    color: theme.buttonText,
  },
});
