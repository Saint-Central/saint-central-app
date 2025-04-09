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
  <View style={{ position: "absolute", bottom: 30, right: 30, opacity: 0.06 }}>
    <FontAwesome5 name="cross" size={100} color="#FFFFFF" />
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
  const cardScaleAnim = useRef(new Animated.Value(0.96)).current;

  // Handle animations
  useEffect(() => {
    // First animate the content upward
    Animated.sequence([
      // Fade in the main content
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      // Scale up card with subtle spring effect
      Animated.spring(cardScaleAnim, {
        toValue: 1,
        friction: 10,
        tension: 40,
        useNativeDriver: true,
      }),
      // Then animate content sliding up
      Animated.spring(contentAnim, {
        toValue: 1,
        friction: 10,
        tension: 40,
        useNativeDriver: true,
      }),
      // Then animate the register button
      Animated.spring(registerButtonAnim, {
        toValue: 1,
        friction: 8,
        tension: 35,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate buttons entrance with staggered delay
    Animated.stagger(
      120,
      buttonAnimValues.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [buttonAnimValues, fadeAnim, contentAnim, registerButtonAnim, cardScaleAnim]);

  // Button press animation
  const pressButton = (index: number, pressed: boolean) => {
    Animated.spring(buttonAnimValues[index], {
      toValue: pressed ? 0.96 : 1,
      friction: 6,
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
        styles={{ marginTop: theme.spacingTopBar, marginBottom: 30, marginLeft: 24 }}
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
              colors={["rgba(239, 68, 68, 0.08)", "rgba(220, 38, 38, 0.12)"]}
              style={styles.errorGradient}
            >
              <Ionicons name="alert-circle-outline" size={22} color={theme.textErrorColor} />
              <Text style={styles.errorText}>Something went wrong. Please try again.</Text>
            </LinearGradient>
          </View>
        ) : (
          <>
            <Animated.View
              style={[
                styles.infoCard,
                {
                  transform: [{ scale: cardScaleAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={["#6172E4", "#4C59C9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.infoCardGradient}
              >
                <CardDecoration />
                <View style={styles.infoIconContainer}>
                  <View style={styles.iconBackgroundOuter}>
                    <View style={styles.iconBackground}>
                      <FontAwesome5 name="church" size={28} color="#FFFFFF" />
                    </View>
                  </View>
                </View>
                <Text style={styles.infoTitle}>Join a Church Community</Text>
                <Text style={styles.infoDescription}>
                  Connect with a local church to grow in faith, access resources, and join
                  fellowship activities.
                </Text>

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
                            outputRange: [10, 0],
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
                        colors={["#5CAF70", "#419458"]}
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
              </LinearGradient>
            </Animated.View>

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
                          outputRange: [30, 0],
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
                  style={styles.buttonTouchable}
                >
                  <LinearGradient
                    colors={["#6172E4", "#4C59C9"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButton}
                  >
                    <View style={styles.primaryButtonContent}>
                      <View style={styles.iconCircle}>
                        <MaterialCommunityIcons name="magnify" size={18} color="#FFFFFF" />
                      </View>
                      <Text style={styles.primaryButtonText}>Search for a Church</Text>
                    </View>
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
                          outputRange: [30, 0],
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
                  style={styles.buttonTouchable}
                >
                  <LinearGradient
                    colors={["#E8A060", "#D88C44"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButton}
                  >
                    <View style={styles.primaryButtonContent}>
                      <View style={styles.iconCircle}>
                        <MaterialCommunityIcons name="account-group" size={18} color="#FFFFFF" />
                      </View>
                      <Text style={styles.primaryButtonText}>Search for a Community</Text>
                    </View>
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
    backgroundColor: "#F7F8FB",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  errorContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "rgba(239, 68, 68, 0.25)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  errorGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.15)",
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
    marginBottom: 20,
  },
  iconBackgroundOuter: {
    padding: 8,
    borderRadius: 38,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  iconBackground: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  infoTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  infoDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    marginBottom: 24,
  },
  buttonsContainer: {
    marginBottom: 30,
    marginTop: 16,
  },
  infoCard: {
    marginBottom: 24,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "rgba(67, 97, 238, 0.2)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  infoCardGradient: {
    borderRadius: 18,
    padding: 24,
  },
  registerButtonContainer: {
    alignSelf: "center",
  },
  registerButtonTouchable: {
    shadowColor: "rgba(46, 125, 50, 0.25)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  registerButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#FFFFFF",
    marginLeft: 6,
  },
  buttonWrapper: {
    marginBottom: 14,
    shadowColor: "rgba(67, 97, 238, 0.15)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonTouchable: {
    borderRadius: 12,
    overflow: "hidden",
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  primaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.buttonText,
  },
});
