import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconCheckmarkOutline, IconBagOutline, IconPackageOutline } from '../components/Icons';
import { ThreeDAsset } from '../components/sunset';
import { formatPrice } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function ThankYouScreen() {
  const t = useTheme(); const s = useMemo(() => styles(t), [t]);
  const { orderId = '', orderNumber = '—', total = '0' } = useLocalSearchParams<{ orderId?: string; orderNumber?: string; total?: string }>();
  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View style={s.mark}><IconCheckmarkOutline size={30} color={t.colors.white} /></View>
    <Text style={s.title}>تم استلام طلبك</Text><Text style={s.copy}>يراجع المتجر الطلب الآن. سنرسل لك تحديثاً عند تغيّر حالته.</Text>
    <ThreeDAsset asset="success" style={s.art} />
    <View style={s.reference}><View><Text style={s.referenceLabel}>رقم الطلب</Text><Text style={s.referenceValue}>#{orderNumber}</Text></View>{Number(total) > 0 ? <View style={s.total}><Text style={s.referenceLabel}>الإجمالي</Text><Text style={s.totalValue}>{formatPrice(total)}</Text></View> : null}</View>
    <View style={s.note}><IconPackageOutline size={19} color={t.colors.primary}/><Text style={s.noteText}>يمكنك متابعة كل تحديث من صفحة طلباتك.</Text></View>
    <TouchableOpacity style={s.primary} onPress={() => orderId ? router.replace(`/order/${orderId}`) : router.replace('/(tabs)/orders')}><Text style={s.primaryText}>متابعة الطلب</Text></TouchableOpacity>
    <TouchableOpacity style={s.secondary} onPress={() => router.replace('/(tabs)')}><IconBagOutline size={18} color={t.colors.text}/><Text style={s.secondaryText}>العودة إلى المطاعم</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
}

const styles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe:{flex:1,backgroundColor:t.colors.background}, content:{padding:24,paddingTop:42,flexGrow:1,alignItems:'center'}, mark:{width:62,height:62,borderRadius:31,backgroundColor:t.colors.success,alignItems:'center',justifyContent:'center',marginBottom:18,...t.shadow.shadow2},
  title:{...t.typography.titleLarge,fontFamily:t.fonts.bold,color:t.colors.text,textAlign:'center'}, copy:{...t.typography.body,color:t.colors.textSecondary,textAlign:'center',marginTop:8,maxWidth:310},art:{width:168,height:132,marginVertical:24,borderRadius:18},
  reference:{width:'100%',flexDirection:'row',justifyContent:'space-between',paddingVertical:17,borderTopWidth:StyleSheet.hairlineWidth,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:t.colors.borderLight},referenceLabel:{...t.typography.caption,color:t.colors.textMuted},referenceValue:{...t.typography.titleMedium,fontFamily:t.fonts.bold,color:t.colors.text,marginTop:2},total:{alignItems:'flex-end'},totalValue:{...t.typography.titleMedium,fontFamily:t.fonts.bold,color:t.colors.primary,marginTop:2},
  note:{width:'100%',flexDirection:'row',alignItems:'center',gap:9,paddingVertical:18},noteText:{flex:1,...t.typography.caption,color:t.colors.textSecondary},primary:{width:'100%',height:52,borderRadius:14,backgroundColor:t.colors.primary,alignItems:'center',justifyContent:'center',marginTop:'auto'},primaryText:{...t.typography.body,fontFamily:t.fonts.bold,color:t.colors.white},secondary:{flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',paddingVertical:18},secondaryText:{...t.typography.body,fontFamily:t.fonts.medium,color:t.colors.text},
});
