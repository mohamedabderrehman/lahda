import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export function ConfirmationDialog({ visible, title, message, confirmLabel = 'تأكيد', destructive, loading, onCancel, onConfirm }: { visible: boolean; title: string; message: string; confirmLabel?: string; destructive?: boolean; loading?: boolean; onCancel: () => void; onConfirm: () => void }) {
  const t = useTheme();
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
    <View style={styles.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onCancel} />
      <View style={[styles.dialog, { backgroundColor: t.colors.surface }]}> 
        <Text style={[styles.title, { color: t.colors.text, fontFamily: t.fonts.bold }]}>{title}</Text>
        <Text style={[styles.message, { color: t.colors.textSecondary, fontFamily: t.fonts.regular }]}>{message}</Text>
        <View style={styles.actions}><Pressable onPress={onCancel} disabled={loading} style={styles.cancel}><Text style={[styles.cancelText, { color: t.colors.textSecondary, fontFamily: t.fonts.medium }]}>إلغاء</Text></Pressable><Pressable onPress={onConfirm} disabled={loading} style={[styles.confirm, { backgroundColor: destructive ? t.colors.error : t.colors.primary, opacity: loading ? .6 : 1 }]}><Text style={[styles.confirmText, { fontFamily: t.fonts.bold }]}>{loading ? 'جارٍ التنفيذ…' : confirmLabel}</Text></Pressable></View>
      </View>
    </View>
  </Modal>;
}
const styles=StyleSheet.create({overlay:{flex:1,justifyContent:'center',padding:24,backgroundColor:'rgba(23,21,19,.38)'},dialog:{borderRadius:16,padding:20},title:{fontSize:18,lineHeight:26,textAlign:'right'},message:{fontSize:14,lineHeight:22,textAlign:'right',marginTop:7},actions:{flexDirection:'row',justifyContent:'flex-start',gap:8,marginTop:22},cancel:{minHeight:42,paddingHorizontal:14,justifyContent:'center'},cancelText:{fontSize:14},confirm:{minHeight:42,paddingHorizontal:16,borderRadius:10,justifyContent:'center'},confirmText:{fontSize:14,color:'#fff'}});
