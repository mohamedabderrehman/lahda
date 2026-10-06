import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
export function FeedbackBanner({ tone='info', children }: { tone?: 'info'|'success'|'warning'|'error'; children: React.ReactNode }) { const t=useTheme(); const color=tone==='success'?t.colors.success:tone==='error'?t.colors.error:tone==='warning'?t.colors.warning:t.colors.primary; return <View style={[styles.wrap,{backgroundColor:color+'12',borderColor:color+'30'}]}><Text style={[styles.text,{color,fontFamily:t.fonts.medium}]}>{children}</Text></View>; }
const styles=StyleSheet.create({wrap:{padding:12,borderRadius:10,borderWidth:StyleSheet.hairlineWidth},text:{fontSize:13,lineHeight:20,textAlign:'right'}});
