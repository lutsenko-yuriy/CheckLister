import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackHeaderLeftProps,
} from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from './types';
import { HomeScreen } from '../features/checklists/ui/HomeScreen';
import { ChecklistDetailScreen } from '../features/checklists/ui/ChecklistDetailScreen';
import { IconButton } from '../shared/ui/IconButton';
import { colors } from '../shared/theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

function FlatBackButton(_props: NativeStackHeaderLeftProps) {
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
        options={{ headerLeft: FlatBackButton }}
      />
    </Stack.Navigator>
  );
}
