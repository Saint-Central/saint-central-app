import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import RosaryPrayerBase from "../components/RosaryPrayerBase";

export default function RosaryPrayer2() {
  const params = useLocalSearchParams();
  const mysteryKey = params.mysteryKey || "JOYFUL";
  
  // Scripture passage for the Annunciation
  const scripturePassage = (
    <View style={styles.scriptureContainer}>
      <Text style={styles.scriptureTitle}>Scripture Passage</Text>
      <Text style={styles.scriptureReference}>Luke 1:26-38</Text>
      <Text style={styles.scriptureText}>
        In the sixth month, the angel Gabriel was sent from God to a town of Galilee called Nazareth, to a virgin betrothed to a man named Joseph, of the house of David, and the virgin's name was Mary.
      </Text>
      <Text style={styles.scriptureText}>
        And coming to her, he said, "Hail, full of grace! The Lord is with you." But she was greatly troubled at what was said and pondered what sort of greeting this might be.
      </Text>
      <Text style={styles.scriptureText}>
        Then the angel said to her, "Do not be afraid, Mary, for you have found favor with God. Behold, you will conceive in your womb and bear a son, and you shall name him Jesus. He will be great and will be called Son of the Most High, and the Lord God will give him the throne of David his father, and he will rule over the house of Jacob forever, and of his kingdom there will be no end."
      </Text>
      <Text style={styles.scriptureText}>
        But Mary said to the angel, "How can this be, since I have no relations with a man?" And the angel said to her in reply, "The Holy Spirit will come upon you, and the power of the Most High will overshadow you. Therefore the child to be born will be called holy, the Son of God. And behold, Elizabeth, your relative, has also conceived a son in her old age, and this is the sixth month for her who was called barren; for nothing will be impossible for God."
      </Text>
      <Text style={styles.scriptureText}>
        Mary said, "Behold, I am the handmaid of the Lord. May it be done to me according to your word." Then the angel departed from her.
      </Text>
    </View>
  );
  
  // Meditation for the Annunciation
  const meditation = (
    <View style={styles.meditationContainer}>
      <Text style={styles.meditationTitle}>Meditation</Text>
      <Text style={styles.meditationText}>
        In this mystery, we contemplate Mary's humble acceptance of God's will. When the angel Gabriel announced that she would conceive and bear the Son of God, Mary responded with complete trust and surrender: "Let it be done to me according to your word."
      </Text>
      <Text style={styles.meditationText}>
        As we pray this decade, let us reflect on our own response to God's call in our lives. Do we say "yes" to God's plan, even when it involves uncertainty or sacrifice? Let us ask Mary to help us cultivate a spirit of openness and trust in God's providence.
      </Text>
      <Text style={styles.meditationText}>
        Fruit of the Mystery: Humility
      </Text>
    </View>
  );
  
  // Custom content with artwork and explanations
  const customContent = (
    <View style={styles.customContainer}>
      <Image 
        source={require('../../../../assets/images/annunciation.png')} 
        style={styles.mysteryImage}
        resizeMode="contain"
      />
      {scripturePassage}
      {meditation}
    </View>
  );
  
  // Prayers for the First Mystery
  const firstMysteryPrayers = [
    {
      title: "Announce the First Mystery",
      content: [
        { 
          text: "The First Joyful Mystery: The Annunciation", 
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
          text: "O Mary, you humbly accepted God's will with complete faith and trust. Help us to say 'yes' to God in all things, following your example of humility and obedience. May we, like you, be open to God's plan in our lives and respond with love and courage.", 
          type: "prayer" 
        }
      ]
    }
  ];
  
  return (
    <RosaryPrayerBase
      title="The Annunciation"
      description="The Angel Gabriel announces to Mary that she shall conceive the Son of God."
      prayers={firstMysteryPrayers}
      audioFile={require('../../../../assets/audio/rosary1.mp3')}
      customContent={customContent}
      nextScreen={{
        pathname: "/rosary/prayer-screens/RosaryPrayerAgony",
        params: {
          mysteryType: params.mysteryType,
          mysteryKey: mysteryKey,
          mysteryIndex: 1,
          mysteryTitle: "The Second Mystery",
          mysteryDescription: `The second of the ${params.mysteryType}`,
          guideName: params.guideName
        }
      }}
      prevScreen={{
        pathname: "/rosary/prayer-screens/RosaryPrayer",
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