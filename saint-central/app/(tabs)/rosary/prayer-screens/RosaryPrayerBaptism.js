import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import RosaryPrayerBase from "../components/RosaryPrayerBase";

export default function RosaryPrayerBaptism() {
  const params = useLocalSearchParams();
  const mysteryKey = params.mysteryKey || "LUMINOUS";
  
  // Scripture passage for the Baptism in the Jordan
  const scripturePassage = (
    <View style={styles.scriptureContainer}>
      <Text style={styles.scriptureTitle}>Scripture Passage</Text>
      <Text style={styles.scriptureReference}>Matthew 3:13-17</Text>
      <Text style={styles.scriptureText}>
        Then Jesus came from Galilee to John at the Jordan to be baptized by him. John tried to prevent him, saying, "I need to be baptized by you, and yet you are coming to me?"
      </Text>
      <Text style={styles.scriptureText}>
        Jesus said to him in reply, "Allow it now, for thus it is fitting for us to fulfill all righteousness." Then he allowed him.
      </Text>
      <Text style={styles.scriptureText}>
        After Jesus was baptized, he came up from the water and behold, the heavens were opened, and he saw the Spirit of God descending like a dove and coming upon him. And a voice came from the heavens, saying, "This is my beloved Son, with whom I am well pleased."
      </Text>
    </View>
  );
  
  // Meditation for the Baptism
  const meditation = (
    <View style={styles.meditationContainer}>
      <Text style={styles.meditationTitle}>Meditation</Text>
      <Text style={styles.meditationText}>
        In this mystery, we contemplate the Baptism of Jesus in the Jordan River. Though sinless, Jesus humbled himself to be baptized, showing his solidarity with humanity. At this moment, the Holy Trinity is revealed: the Son is baptized, the Spirit descends like a dove, and the Father's voice is heard.
      </Text>
      <Text style={styles.meditationText}>
        As we pray this decade, let us reflect on our own baptism, through which we became children of God and members of the Church. Let us renew our baptismal promises and ask for the grace to live faithfully as disciples of Christ.
      </Text>
      <Text style={styles.meditationText}>
        Fruit of the Mystery: Openness to the Holy Spirit
      </Text>
    </View>
  );
  
  // Custom content with artwork and explanations
  const customContent = (
    <View style={styles.customContainer}>
      <Image 
        source={require('../../../../assets/images/baptism.png')} 
        style={styles.mysteryImage}
        resizeMode="contain"
      />
      {scripturePassage}
      {meditation}
    </View>
  );
  
  // Prayers for the First Luminous Mystery
  const firstLuminousMysteryPrayers = [
    {
      title: "Announce the First Mystery",
      content: [
        { 
          text: "The First Luminous Mystery: The Baptism of Jesus in the Jordan", 
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
          text: "Lord Jesus, at your baptism you were revealed as God's beloved Son. Help us to remember that we too are beloved children of God through our baptism. Send your Holy Spirit upon us, that we may be guided in truth and empowered to bear witness to your love in the world. May we, like you, embrace humility and service as the path to true greatness.", 
          type: "prayer" 
        }
      ]
    }
  ];
  
  return (
    <RosaryPrayerBase
      title="The Baptism in the Jordan"
      description="Jesus is baptized by John the Baptist in the Jordan River."
      prayers={firstLuminousMysteryPrayers}
      audioFile={require('../../../../assets/audio/rosary1.mp3')}
      customContent={customContent}
      nextScreen={{
        pathname: "/rosary/prayer-screens/RosaryPrayer7",
        params: {
          mysteryType: params.mysteryType,
          mysteryKey: mysteryKey,
          mysteryIndex: 1,
          mysteryTitle: "The Second Luminous Mystery",
          mysteryDescription: "The Wedding at Cana",
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