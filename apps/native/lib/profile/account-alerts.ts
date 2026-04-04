import { Alert } from 'react-native'

/**
 * Native confirmation dialogs for destructive account actions.
 * Keeps `Alert` wiring out of screen components so they stay easy to read.
 */

export function promptSignOut(onConfirm: () => void) {
  Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign Out', style: 'destructive', onPress: onConfirm },
  ])
}

export function promptDeleteAccount(onConfirmedDelete: () => void) {
  Alert.alert(
    'Delete account',
    'Your account and all associated data will be permanently deleted. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        onPress: () => {
          Alert.alert(
            'Are you sure?',
            'This action cannot be undone. Your account and data will be permanently removed.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete my account',
                style: 'destructive',
                onPress: onConfirmedDelete,
              },
            ],
            { cancelable: true }
          )
        },
      },
    ],
    { cancelable: true }
  )
}

export function alertDeleteAccountError(message: string) {
  Alert.alert('Could not delete account', message)
}
