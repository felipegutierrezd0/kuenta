import { Alert, Platform } from 'react-native';

// `Alert.alert` de react-native-web es un no-op (no muestra nada), así que en web ningún diálogo
// de confirmación "¿Eliminar...?" llegaba a mostrarse y el botón de "Eliminar" nunca se disparaba.
// Estos helpers usan los diálogos nativos del navegador en web y Alert real en iOS/Android.
export function confirmDestructive(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
