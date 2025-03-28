import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AntDesign, FontAwesome5 } from "@expo/vector-icons";
import RosaryPrayerBase from "../components/RosaryPrayerBase";

export default function RosaryPrayer7() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const mysteryKey = params.mysteryKey || "JOYFUL";
  
  // Get mystery theme color
  const getMysteryTheme = (mysteryKey) => {
    switch (mysteryKey) {
      case "JOYFUL":
        return {
          primary: "#0ACF83",
          secondary: "#07A866",
          accent: "#E8FFF4",
        };
      case "SORROWFUL":
        return {
          primary: "#FF4757", 
          secondary: "#D63031",
          accent: "#FFE9EB",
        };
      case "GLORIOUS":
        return {
          primary: "#7158e2",
          secondary: "#5F45C2",
          accent: "#F0ECFF",
        };
      case "LUMINOUS":
        return {
          primary: "#18DCFF",
          secondary: "#0ABDE3",
          accent: "#E4F9FF",
        };
      default:
        return {
          primary: "#0ACF83",
          secondary: "#07A866",
          accent: "#E8FFF4",
        };
    }
  };
  
  const theme = getMysteryTheme(mysteryKey);
  
  // Summary of what was prayed
  const mysterySummary = (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>You've completed the Rosary!</Text>
      <Text style={styles.summaryText}>
        You prayed the {params.mysteryType} with {params.guideName} as your guide.
      </Text>
      
      <View style={styles.divider} />
      
      <Text style={styles.reflectionTitle}>Reflection</Text>
      <Text style={styles.reflectionText}>
        As you conclude this Rosary, take a moment to reflect on the mysteries you've contemplated. Consider how the lessons from these events in the life of Jesus and Mary might apply to your own life and circumstances.
      </Text>
      
      <TouchableOpacity 
        style={[styles.intentionButton, { backgroundColor: theme.accent }]}
        onPress={() => {
          // This would open a screen to save intentions, for now just go back to home
          router.push("/");
        }}
      >
        <FontAwesome5 name="heart" size={20} color={theme.primary} />
        <Text style={[styles.intentionButtonText, { color: theme.primary }]}>
          Save Your Intentions
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.shareButton, { backgroundColor: theme.primary }]}
        onPress={() => {
          // Share functionality would go here
          // For now just show an alert or navigate
          router.push("/");
        }}
      >
        <AntDesign name="sharealt" size={20} color="#FFFFFF" />
        <Text style={styles.shareButtonText}>
          Share Your Prayer
        </Text>
      </TouchableOpacity>
    </View>
  );
  
  // Concluding prayers
  const concludingPrayers = [
    {
      title: "Hail, Holy Queen",
      content: [
        { 
          text: "Hail, Holy Queen, Mother of Mercy, our life, our sweetness and our hope. To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears.",
          type: "prayer" 
        },
        { 
          text: "Turn then, most gracious advocate, thine eyes of mercy toward us, and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary.",
          type: "prayer" 
        },
        { 
          text: "℣. Pray for us, O Holy Mother of God.",
          type: "prayer" 
        },
        { 
          text: "℟. That we may be made worthy of the promises of Christ.",
          type: "response" 
        }
      ]
    },
    {
      title: "Let us pray",
      content: [
        { 
          text: "O God, whose Only Begotten Son, by his life, Death, and Resurrection, has purchased for us the rewards of eternal life, grant, we beseech thee, that while meditating on these mysteries of the most holy Rosary of the Blessed Virgin Mary, we may imitate what they contain and obtain what they promise, through the same Christ our Lord. Amen.",
          type: "prayer" 
        }
      ]
    },
    {
      title: "The Sign of the Cross",
      content: [
        { 
          text: "In the name of the Father, and of the Son, and of the Holy Spirit. Amen.", 
          type: "prayer" 
        },
        { 
          text: "Make the sign of the cross as you recite these words.", 
          type: "instruction" 
        }
      ]
    },
    {
      title: "Optional Closing Prayers",
      content: [
        { 
          text: "You may wish to add these optional closing prayers:", 
          type: "instruction" 
        },
        { 
          text: "Prayer to St. Michael the Archangel", 
          type: "prayer" 
        },
        { 
          text: "St. Michael the Archangel, defend us in battle. Be our defense against the wickedness and snares of the Devil. May God rebuke him, we humbly pray, and do thou, O Prince of the heavenly hosts, by the power of God, thrust into hell Satan, and all the evil spirits, who prowl about the world seeking the ruin of souls. Amen.", 
          type: "prayer" 
        },
        { 
          text: "The Memorare", 
          type: "prayer" 
        },
        { 
          text: "Remember, O most gracious Virgin Mary, that never was it known that anyone who fled to thy protection, implored thy help, or sought thy intercession was left unaided. Inspired by this confidence, I fly unto thee, O Virgin of virgins, my mother; to thee do I come, before thee I stand, sinful and sorrowful. O Mother of the Word Incarnate, despise not my petitions, but in thy mercy hear and answer me. Amen.", 
          type: "prayer" 
        }
      ]
    }
  ];
  
  return (
    <RosaryPrayerBase
      title="Conclusion"
      description={`Concluding prayers for the ${params.mysteryType}`}
      prayers={concludingPrayers}
      audioFile={require('../../../../assets/audio/rosary1.mp3')}
      customContent={mysterySummary}
      prevScreen={{
        pathname: "/RosaryPrayer6",
        params: {
          mysteryType: params.mysteryType,
          mysteryKey: mysteryKey,
          mysteryIndex: 4,
          mysteryTitle: "The Fifth Mystery",
          guideName: params.guideName
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  summaryContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#242424",
    textAlign: "center",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: "#555555",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 16,
  },
  reflectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#242424",
    marginBottom: 8,
  },
  reflectionText: {
    fontSize: 16,
    color: "#333333",
    lineHeight: 24,
    marginBottom: 20,
  },
  intentionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  intentionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 10,
  },
});