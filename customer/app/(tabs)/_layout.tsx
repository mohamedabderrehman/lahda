import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { FigmaTabBar } from '../../components/FigmaTabBar';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
        }}
        tabBar={() => <FigmaTabBar />}
      >
        <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
        <Tabs.Screen name="search" options={{ title: 'بحث' }} />
        <Tabs.Screen name="delivery" options={{ href: null }} />
        <Tabs.Screen name="cart" options={{ title: 'السلة' }} />
        <Tabs.Screen name="orders" options={{ title: 'طلباتي' }} />
        <Tabs.Screen name="account" options={{ title: 'حسابي' }} />
      </Tabs>
    </View>
  );
}
