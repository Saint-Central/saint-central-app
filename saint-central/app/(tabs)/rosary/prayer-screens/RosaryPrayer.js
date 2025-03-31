import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import RosaryPrayerBase from '../components/RosaryPrayerBase';

const DynamicRosaryPrayer = ({ navigation, route }) => {
  // Initialize with default values - no longer requiring route.params
  const [currentScreen, setCurrentScreen] = useState('introduction');
  const [currentDecade, setCurrentDecade] = useState(1);
  const [mysteryType, setMysteryType] = useState(null);
  
  // Initialize the mystery type based on the day
  useEffect(() => {
    // Try to get mystery type from navigation params if available
    const paramMysteryType = route?.params?.mysteryType;
    
    if (paramMysteryType) {
      setMysteryType(paramMysteryType);
    } else {
      // Default to today's mystery if no params
      setMysteryType(getTodaysMystery());
    }
  }, [route?.params?.mysteryType]);
  
  // Define the mysteries based on the day of the week
  const getTodaysMystery = () => {
    const today = new Date().getDay();
    // Sunday: Glorious, Monday: Joyful, Tuesday: Sorrowful, 
    // Wednesday: Glorious, Thursday: Luminous, Friday: Sorrowful, Saturday: Joyful
    const mysteryByDay = {
      0: 'glorious',  // Sunday
      1: 'joyful',    // Monday
      2: 'sorrowful', // Tuesday
      3: 'glorious',  // Wednesday
      4: 'luminous',  // Thursday
      5: 'sorrowful', // Friday
      6: 'joyful'     // Saturday
    };
    
    return mysteryByDay[today];
  };

  // Get prayers and mysteries based on mystery type
  const getMysteryContent = () => {
    const currentMysteryType = mysteryType || getTodaysMystery();
    
    const introductionPrayers = {
      joyful: "In the Joyful Mysteries, we contemplate the joy of Mary's heart in the Incarnation. We ask for the virtue of humility, love of neighbor, and detachment from the world.",
      sorrowful: "In the Sorrowful Mysteries, we contemplate the suffering and death of Our Lord. We ask for contrition for our sins, patience in adversity, and strength in temptation.",
      glorious: "In the Glorious Mysteries, we contemplate the victory of Christ and the glory of Mary. We ask for perseverance, devotion to Mary, and the grace of a happy death.",
      luminous: "In the Luminous Mysteries, we contemplate Christ's public ministry. We ask for openness to the Holy Spirit, Christian witness, and trust in Christ."
    };
    
    const mysteries = {
      joyful: [
        "The Annunciation",
        "The Visitation",
        "The Nativity",
        "The Presentation",
        "The Finding of Jesus in the Temple"
      ],
      sorrowful: [
        "The Agony in the Garden",
        "The Scourging at the Pillar",
        "The Crowning with Thorns",
        "The Carrying of the Cross",
        "The Crucifixion"
      ],
      glorious: [
        "The Resurrection",
        "The Ascension",
        "The Descent of the Holy Spirit",
        "The Assumption of Mary",
        "The Coronation of Mary"
      ],
      luminous: [
        "The Baptism in the Jordan",
        "The Wedding Feast at Cana",
        "The Proclamation of the Kingdom",
        "The Transfiguration",
        "The Institution of the Eucharist"
      ]
    };
    
    return {
      introductionPrayer: introductionPrayers[currentMysteryType] || introductionPrayers['joyful'],
      mysteries: mysteries[currentMysteryType] || mysteries['joyful']
    };
  };
  
  const navigateToNextScreen = () => {
    if (currentScreen === 'introduction') {
      setCurrentScreen('decade');
    } else if (currentScreen === 'decade') {
      if (currentDecade < 5) {
        setCurrentDecade(currentDecade + 1);
      } else {
        setCurrentScreen('conclusion');
      }
    }   else if (currentScreen === 'conclusion') {
      // Check if navigation exists before trying to use it
      if (navigation) {
        // Navigate back to RosaryHome when finished
        navigation.navigate('RosaryHome');
      } else {
        // If navigation is undefined, reset to start (fallback behavior)
        setCurrentScreen('introduction');
        setCurrentDecade(1);
      }
    }
  };
  
  const navigateToPreviousScreen = () => {
    if (currentScreen === 'decade') {
      if (currentDecade > 1) {
        setCurrentDecade(currentDecade - 1);
      } else {
        setCurrentScreen('introduction');
      }
    } else if (currentScreen === 'conclusion') {
      setCurrentScreen('decade');
      setCurrentDecade(5);
    }
  };
  
  // Get mystery content only after mysteryType is set
  const { introductionPrayer, mysteries } = getMysteryContent();
  
  const renderContent = () => {
    if (currentScreen === 'introduction') {
      const currentMysteryType = mysteryType || getTodaysMystery();
      
      return (
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Introduction</Text>
          <Text style={styles.mysteryTitle}>{currentMysteryType.toUpperCase()} MYSTERIES</Text>
          <Text style={styles.prayer}>{introductionPrayer}</Text>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Sign of the Cross</Text>
            <Text style={styles.prayer}>In the name of the Father, and of the Son, and of the Holy Spirit. Amen.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Apostles' Creed</Text>
            <Text style={styles.prayer}>I believe in God, the Father Almighty, Creator of heaven and earth; and in Jesus Christ, His only Son, our Lord; who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died, and was buried. He descended into hell; the third day He arose again from the dead. He ascended into heaven, sits at the right hand of God, the Father Almighty; from thence He shall come to judge the living and the dead. I believe in the Holy Spirit, the Holy Catholic Church, the communion of Saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Our Father</Text>
            <Text style={styles.prayer}>Our Father, who art in heaven, hallowed be Thy name; Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Three Hail Marys</Text>
            <Text style={styles.prayer}>Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen. (3x)</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Glory Be</Text>
            <Text style={styles.prayer}>Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen.</Text>
          </View>
        </View>
      );
    } else if (currentScreen === 'decade') {
      return (
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Decade {currentDecade}</Text>
          <Text style={styles.mysteryTitle}>{mysteries[currentDecade - 1]}</Text>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Announcement of the Mystery</Text>
            <Text style={styles.prayer}>Let us contemplate {mysteries[currentDecade - 1]}.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Our Father</Text>
            <Text style={styles.prayer}>Our Father, who art in heaven, hallowed be Thy name; Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Ten Hail Marys</Text>
            <Text style={styles.prayer}>Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen. (10x)</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Glory Be</Text>
            <Text style={styles.prayer}>Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Fatima Prayer</Text>
            <Text style={styles.prayer}>O my Jesus, forgive us our sins, save us from the fires of hell, lead all souls to heaven, especially those in most need of Thy mercy.</Text>
          </View>
        </View>
      );
    } else if (currentScreen === 'conclusion') {
      return (
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Conclusion</Text>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Hail Holy Queen</Text>
            <Text style={styles.prayer}>Hail, Holy Queen, Mother of Mercy, our life, our sweetness and our hope! To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears. Turn, then, most gracious Advocate, thine eyes of mercy toward us, and after this, our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Pray for us, O Holy Mother of God</Text>
            <Text style={styles.prayer}>That we may be made worthy of the promises of Christ.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Final Prayer</Text>
            <Text style={styles.prayer}>Let us pray. O God, whose only-begotten Son, by His life, death and resurrection, has purchased for us the rewards of eternal life; grant, we beseech Thee, that by meditating upon these mysteries of the Most Holy Rosary of the Blessed Virgin Mary, we may imitate what they contain and obtain what they promise, through the same Christ our Lord. Amen.</Text>
          </View>
          
          <View style={styles.prayerContainer}>
            <Text style={styles.prayerTitle}>Sign of the Cross</Text>
            <Text style={styles.prayer}>In the name of the Father, and of the Son, and of the Holy Spirit. Amen.</Text>
          </View>
        </View>
      );
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {renderContent()}
        
        <View style={styles.navigationContainer}>
          {(currentScreen !== 'introduction') && (
            <TouchableOpacity 
              style={styles.navigationButton} 
              onPress={navigateToPreviousScreen}
            >
              <Text style={styles.buttonText}>Previous</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.navigationButton} 
            onPress={navigateToNextScreen}
          >
            <Text style={styles.buttonText}>
              {currentScreen === 'conclusion' ? 'Finish' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8'
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20
  },
  contentContainer: {
    flex: 1,
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333'
  },
  mysteryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#3f51b5'
  },
  prayerContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  prayerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#555'
  },
  prayer: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444'
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20
  },
  navigationButton: {
    backgroundColor: '#3f51b5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default DynamicRosaryPrayer;