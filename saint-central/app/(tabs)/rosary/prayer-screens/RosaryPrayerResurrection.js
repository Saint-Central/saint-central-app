import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import RosaryPrayerBase from "../components/RosaryPrayerBase";

export default function RosaryPrayerResurrection() {
  const params = useLocalSearchParams();
  const mysteryKey = params.mysteryKey || "GLORIOUS";
  
  // Scripture passage for the Resurrection
  const scripturePassage = (
    <View style={styles.scriptureContainer}>
      <Text style={styles.scriptureTitle}>Scripture Passage</Text>
      <Text style={styles.scriptureReference}>Matthew 28:1-10</Text>
      <Text style={styles.scriptureText}>
        After the sabbath, as the first day of the week was dawning, Mary Magdalene and the other Mary came to see the tomb. And behold, there was a great earthquake; for an angel of the Lord descended from heaven, approached, rolled back the stone, and sat upon it.
      </Text>
      <Text style={styles.scriptureText}>
        His appearance was like lightning and his clothing was white as snow. The guards were shaken with fear of him and became like dead men. Then the angel said to the women in reply, "Do not be afraid! I know that you are seeking Jesus the crucified. He is not here, for he has been raised just as he said. Come and see the place where he lay.
      </Text>
      <Text style={styles.scriptureText}>
        Then go quickly and tell his disciples, 'He has been raised from the dead, and he is going before you to Galilee; there you will see him.' Behold, I have told you."
      </Text>
      <Text style={styles.scriptureText}>
        They went away quickly from the tomb, fearful yet overjoyed, and ran to announce this to his disciples. And behold, Jesus met them on their way and greeted them. They approached, embraced his feet, and did him homage. Then Jesus said to them, "Do not be afraid. Go tell my brothers to go to Galilee, and there they will see me."
      </Text>
    </View>
  );
  
  // Meditation for the Resurrection
  const meditation = (
    <View style={styles.meditationContainer}>
      <Text style={styles.meditationTitle}>Meditation</Text>
      <Text style={styles.meditationText}>
        In this mystery, we contemplate the Resurrection of Jesus Christ, the foundational event of our faith. After suffering and dying on the cross, Jesus rose triumphantly from the dead, conquering sin and death. His Resurrection gives meaning to our faith and hope for eternal life.
      </Text>
      <Text style={styles.meditationText}>
        As we pray this decade, let us reflect on the transformative power of the Resurrection in our own lives. How does the reality of Christ's victory over death impact how we face our own struggles and sufferings? Let us ask for the grace to live as people of the Resurrection, filled with joy and hope.
      </Text>
      <Text style={styles.meditationText}>
        Fruit of the Mystery: Faith
      </Text>
    </View>
  );
  
  // Custom content with artwork and explanations
  const customContent = (
    <View style={styles.customContainer}>
      <Image 
        source={require('../../../../assets/images/resurrection.png')} 
        style={styles.mysteryImage}
        resizeMode="contain"
      />
      {scripturePassage}
      {meditation}
    </View>
  );
  
  // Prayers for the First Glorious Mystery
  const firstGloriousMysteryPrayers = [
    {
      title: "Announce the First Mystery",
      content: [
        { 
          text: "The First Glorious Mystery: The Resurrection", 
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
          text: "Lord Jesus, your Resurrection has transformed the world and offers us the promise of eternal life. Fill us with the same joy that the disciples experienced when they saw you risen from the dead. May we, like them, become witnesses to your Resurrection, sharing the Good News with all we encounter. Strengthen our faith, that we might live as people of hope, confident in your victory over sin and death.", 
          type: "prayer" 
        }
      ]
    }
  ];
  
  return (
    <RosaryPrayerBase
      title="The Resurrection"
      description="Jesus rises from the dead on the third day."
      prayers={firstGloriousMysteryPrayers}
      audioFile={require('../../../../assets/audio/rosary1.mp3')}
      customContent={customContent}
      nextScreen={{
        pathname: "/rosary/prayer-screens/RosaryPrayerBaptism",
        params: {
          mysteryType: params.mysteryType,
          mysteryKey: mysteryKey,
          mysteryIndex: 1,
          mysteryTitle: "The Second Glorious Mystery",
          mysteryDescription: "The Ascension",
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