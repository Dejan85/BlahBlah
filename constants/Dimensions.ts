import { Dimensions, StatusBar, Platform } from "react-native";

const { width, height } = Dimensions.get("window");
export const STATUSBAR_HEIGHT =
  Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
export const POST_HEIGHT = height - STATUSBAR_HEIGHT;
export const POST_WIDTH = width;
