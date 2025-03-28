import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import RosaryPrayerBase from "../components/RosaryPrayerBase";

export default function RosaryPrayerAgony() {
  const params = useLocalSearchParams();
  const mysteryKey = params.mysteryKey || "SORROWFUL";
  
  // Scripture passage for the Agony in the Garden
  const scripturePassage = (
    <View style={styles.scriptureContainer}>
      <Text style={styles.scriptureTitle}>Scripture Passage</Text>
      <Text style={styles.scriptureReference}>Luke 22:39-46</Text>
      <Text style={styles.scriptureText}>
        Then going out he went, as was his custom, to the Mount of Olives, and the disciples followed him. When he arrived at the place he said to them, "Pray that you may not undergo the test."
      </Text>
      <Text style={styles.scriptureText}>
        After withdrawing about a stone's throw from them and kneeling, he prayed, saying, "Father, if you are willing, take this cup away from me; still, not my will but yours be done."
      </Text>
      <Text style={styles.scriptureText}>
        And to strengthen him an angel from heaven appeared to him. He was in such agony and he prayed so fervently that his sweat became like drops of blood falling on the ground.
      </Text>
      <Text style={styles.scriptureText}>
        When he rose from prayer and returned to his disciples, he found them sleeping from grief. He said to them, "Why are you sleeping? Get up and pray that you may not undergo the test."
      </Text>
    </View>
  );
  
  // Meditation for the Agony in the Garden
  const meditation = (
    <View style={styles.meditationContainer}>
      <Text style={styles.meditationTitle}>Meditation</Text>
      <Text style={styles.meditationText}>
        In this mystery, we contemplate Jesus in the Garden of Gethsemane, where He experienced profound anguish as He anticipated His suffering and death. Despite His fear and sorrow, Jesus submitted completely to the Father's will, praying, "Not my will but yours be done."
      </Text>
      <Text style={styles.meditationText}>
        As we pray this decade, let us reflect on our own struggles to accept God's will, especially in times of suffering or uncertainty. Let us ask Jesus to help us surrender our own plans and desires to God, trusting in His wisdom and love.
      </Text>
      <Text style={styles.meditationText}>
        Fruit of the Mystery: Sorrow for sin, conformity to God's will
      </Text>
    </View>
  );
  
  // Custom content with artwork and explanations
  const customContent = (
    <View style={styles.customContainer}>
      <Image 
        source={require('../../../../assets/images/agony-garden.png')} 
        style={styles.mysteryImage}
        resizeMode="contain"
      />
      {scripturePassage}
      {meditation}
    </View>
  );
  
  // Prayers for the First Sorrowful Mystery
  const firstSorrowfulMysteryPrayers = [
    {
      title: "Announce the First Mystery",
      content: [
        { 
          text: "The First Sorrowful Mystery: The Agony in the Garden", 
          type: "instruction" 
        }
      ]
    },
    {
      title: "The Lord's Prayer",
      content: [
        { 
          text: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven.", 
          type: "prayer" 
        },
        { 
          text: "Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.", 
          type: "prayer" 
        }
      ]
    },
    {
      title: "Hail Mary (10 times)",
      content: [
        { 
          text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus.", 
          type: "prayer" 
        },
        { 
          text: "Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.", 
          type: "prayer" 
        },
        { 
          text: "(Repeat 10 times, you may meditate on the mystery during the repetitions)", 
          type: "instruction" 
        }
      ]
    },
    {
      title: "Glory Be",
      content: [
        { 
          text: "Glory be to the Father, and to the Son, and to the Holy Spirit.", 
          type: "prayer" 
        },
        { 
          text: "As it was in the beginning, is now, and ever shall be, world without end. Amen.", 
          type: "prayer" 
        }
      ]
    },
    {
      title: "Fatima Prayer",
      content: [
        { 
          text: "O my Jesus, forgive us our sins, save us from the fires of hell; lead all souls to heaven, especially those in most need of thy mercy.", 
          type: "prayer" 
        }
      ]
    },
    {
      title: "Optional Prayer",
      content: [
        { 
          text: "You may add this optional prayer:", 
          type: "instruction" 
        },
        { 
          text: "Lord Jesus, in your agony, you accepted the Father's will despite your fear and suffering. Grant us the grace to surrender to God's will in our own lives, especially in moments of trial and difficulty. Help us to find strength in prayer as you did, trusting in the Father's plan even when it leads through suffering.", 
          type: "prayer" 
        }
      ]
    }
  ];
  
  return (
    <RosaryPrayerBase
      title="The Agony in the Garden"
      description="Jesus prays in the Garden of Gethsemane on the night of His betrayal."
      prayers={firstSorrowfulMysteryPrayers}
      audioFile={require('../../../../assets/audio/rosary1.mp3')}
      customContent={customContent}
      nextScreen={{
        pathname: "/rosary/prayer-screens/RosaryPrayerResurrection",
        params: {
          mysteryType: params.mysteryType,
          mysteryKey: mysteryKey,
          mysteryIndex: 1,
          mysteryTitle: "The Second Sorrowful Mystery",
          mysteryDescription: "The Scourging at the Pillar",
          guideName: params.guideName
        }
      }}
      prevScreen={{
        pathname: "/RosaryPrayer",
        params: {
          mysteryType: params.mysteryType,
          mysteryKey: mysteryKey,
          mysteryIndex: 0,
          mysteryTitle: "Introduction",
          mysteryDescription: `Introduction to the ${params.mysteryType}`,
          guideName: params.guideName
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  customContainer: {
    marginBottom: 20,
  },
  mysteryImage: {
    width: "100%",
    height: 200,
    marginBottom: 16,
    borderRadius: 12,
  },
  scriptureContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  scriptureTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#242424",
    marginBottom: 8,
    textAlign: "center",
  },
  scriptureReference: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 16,
    textAlign: "center",
    fontStyle: "italic",
  },
  scriptureText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333333",
    marginBottom: 12,
  },
  meditationContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  meditationTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#242424",
    marginBottom: 16,
    textAlign: "center",
  },
  meditationText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333333",
    marginBottom: 12,
  },
});