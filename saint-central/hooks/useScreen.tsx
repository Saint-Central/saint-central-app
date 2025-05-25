import { useWindowDimensions } from "react-native";

const useScreen = () => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const isTablet = SCREEN_WIDTH > 768;

  return { SCREEN_WIDTH, SCREEN_HEIGHT, isTablet };
};

export default useScreen;
