import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackHeaderLeftProps,
} from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from './types';
import { HomeScreen } from '../features/checklists/ui/HomeScreen';
import { ChecklistDetailScreen } from '../features/checklists/ui/ChecklistDetailScreen';
import { RunScreen } from '../features/runs/ui/RunScreen';
import { IconButton } from '../shared/ui/IconButton';
import { colors } from '../shared/theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

function FlatBackButton(_props?: NativeStackHeaderLeftProps) {
  const navigation = useNavigation();
  return (
    <IconButton
      icon="arrow-back"
      accessibilityLabel="Back"
      onPress={() => navigation.goBack()}
      color={colors.text}
    />
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBackground },
        headerShadowVisible: false,
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'CheckLister' }}
      />
      <Stack.Screen
        name="ChecklistDetail"
        component={ChecklistDetailScreen}
        options={{
          headerLeft: FlatBackButton,
          // iOS 26 gives header bar buttons a "Liquid Glass" pill background
          // by default; hidesSharedBackground turns that off so the back
          // button stays flat as CheL-14 requires. `headerLeft` alone
          // handles Android and pre-26 iOS, where no such background exists.
          unstable_headerLeftItems: () => [
            {
              type: 'custom',
              element: <FlatBackButton />,
              hidesSharedBackground: true,
            },
          ],
        }}
      />
      <Stack.Screen
        name="Run"
        component={RunScreen}
        options={{
          // No gestureEnabled/headerLeft suppression here: RunScreen uses
          // usePreventRemove, which disables native-stack's swipe-back
          // gesture at the native level itself while a run is active and
          // incomplete (unlike a manual beforeRemove listener, which can
          // only block JS-dispatched actions and would desync from a native
          // swipe gesture already in progress). Same flat back button as
          // ChecklistDetail otherwise.
          headerLeft: FlatBackButton,
          unstable_headerLeftItems: () => [
            {
              type: 'custom',
              element: <FlatBackButton />,
              hidesSharedBackground: true,
            },
          ],
        }}
      />
    </Stack.Navigator>
  );
}
