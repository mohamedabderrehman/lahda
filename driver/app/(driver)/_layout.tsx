import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { IconCarOutline, IconReceiptOutline, IconCashOutline, IconPersonOutline, IconTrophyOutline } from '../../components/Icons';
import { theme } from '../../constants/theme';

export default function DriverTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.borderLight,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          ...theme.shadow.card,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Cairo_600SemiBold',
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: { marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, size }) => <IconCarOutline size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'الطلبات',
          tabBarIcon: ({ color, size }) => <IconReceiptOutline size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'الأرباح',
          tabBarIcon: ({ color, size }) => <IconCashOutline size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'المكافآت',
          tabBarIcon: ({ color, size }) => <IconTrophyOutline size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color, size }) => <IconPersonOutline size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
