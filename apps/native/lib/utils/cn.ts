import { StyleSheet, ViewStyle, TextStyle, ImageStyle, StyleProp } from 'react-native'

type Style = StyleProp<ViewStyle | TextStyle | ImageStyle>

export function cn(...styles: Style[]): ViewStyle | TextStyle | ImageStyle {
  return StyleSheet.flatten(styles.filter(Boolean))
}
