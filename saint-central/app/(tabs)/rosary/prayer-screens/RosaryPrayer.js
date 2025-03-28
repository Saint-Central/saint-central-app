import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import RosaryPrayerBase from "../components/RosaryPrayerBase";

export default function RosaryPrayer() {
  const params = useLocalSearchParams();
  const mysteryKey = params.mysteryKey || "JOYFUL";
  
  // Introduction prayers are the same regardless of mystery type
  const introductionPrayers = [
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
      title: "Apostles' Creed",
      content: [
        { 
          text: "I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, his only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died and was buried; he descended into hell; on the third day he rose again from the dead; he ascended into heaven, and is seated at the right hand of God the Father almighty; from there he will come to judge the living and the dead.", 
          type: "prayer" 
        },
        { 
          text: "I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.", 
          type: "prayer" 
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
      title: "Hail Mary (3 times)",
      content: [
        { 
          text: "Recite the Hail Mary three times for an increase in faith, hope, and charity:", 
          type: "instruction" 
        },
        { 
          text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus.", 
          type: "prayer" 
        },
        { 
          text: "Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.", 
          type: "prayer" 
        },
        { 
          text: "(Repeat 3 times)", 
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
      title: "Optional Opening Prayer",
      content: [
        { 
          text: "You may also wish to add this opening prayer:", 
          type: "instruction" 
        },
        { 
          text: "Queen of the Holy Rosary, you have deigned to come to us once more to inspire us to pray the Holy Rosary. It is your desire that the Holy Rosary be prayed by all people and in all places. You desire that the Holy Rosary be prayed with devotion and concentration. Grant us today the grace to pray the Holy Rosary as you desire: attentively, devoutly, and peacefully, so that through your intercession, we may be filled with faith, hope, and charity. Amen.", 
          type: "prayer" 
        }
      ]
    }
  ];
  
  // Custom introduction content with image
  const customIntroContent = (
    <View style={styles.customIntroContainer}>
      <Image 
        source={require('../../../../assets/images/rosary-diagram.png')} 
        style={styles.rosaryDiagram}
        resizeMode="contain"
      />
      <Text style={styles.introText}>
        The Rosary is a Scripture-based prayer centered on the life of Christ. It begins with the Apostles' Creed, followed by one Our Father, three Hail Marys, and a Glory Be. Then, for each of the five decades, we announce the Mystery, recite one Our Father, ten Hail Marys, one Glory Be, and the Fatima Prayer.
      </Text>
      <Text style={styles.introText}>
        Today we will be praying the {params.mysteryType}. Follow along with the prayers below or listen to the audio guide.
      </Text>
    </View>
  );
  
  return (
    <RosaryPrayerBase
      title="Introduction to the Rosary"
      description="Begin your prayer with these introductory prayers"
      prayers={introductionPrayers}
      audioFile={require('../../../../assets/audio/rosary1.mp3')}
      customContent={customIntroContent}
      nextScreen={{
        pathname: "/rosary/prayer-screens/RosaryPrayer2",
        params: {
          mysteryType: params.mysteryType,
          mysteryKey: mysteryKey,
          mysteryIndex: 0,
          mysteryTitle: "The First Mystery",
          mysteryDescription: `The first of the ${params.mysteryType}`,
          guideName: params.guideName
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  customIntroContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  rosaryDiagram: {
    width: "100%",
    height: 200,
    marginBottom: 16,
  },
  introText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#444444",
    marginBottom: 12,
    textAlign: "center",
  }
});