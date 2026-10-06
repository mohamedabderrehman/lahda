import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconArrowForward, IconAddCircleOutline, IconLocationOutline, IconTrashOutline } from '../../components/Icons';
import { Badge } from '../../components/Badge';
import { getAddresses, deleteAddress } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomerHeader } from '../../components/customer-header';
import { ConfirmationDialog } from '../../components/confirmation-dialog';

type Address = {
  id: string;
  addressText: string;
  label?: string | null;
  isDefault?: boolean;
  building?: string | null;
  floor?: string | null;
};

export default function AddressesListScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAddresses();
      setList(Array.isArray(res) ? (res as unknown as Address[]) : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try { await deleteAddress(pendingDelete.id); await load(); setPendingDelete(null); }
    catch { Alert.alert('تعذر الحذف', 'تعذر حذف العنوان. حاول مرة أخرى.'); }
    finally { setDeleting(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CustomerHeader title="عناويني" />

      {loading ? (
        <ActivityIndicator size="large" color={t.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/addresses/pick-location')}
              activeOpacity={0.8}
            >
              <IconAddCircleOutline size={24} color={t.colors.white} />
              <Text style={styles.addBtnText}>إضافة عنوان جديد</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, item.isDefault && styles.cardDefault]}>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  {item.label ? (
                    <Text style={styles.label}>{item.label}</Text>
                  ) : null}
                  {item.isDefault ? (
                    <Badge variant="neutral">افتراضي</Badge>
                  ) : null}
                </View>
                <Text style={styles.addrText}>{item.addressText}</Text>
                {(item.building || item.floor) ? (
                  <Text style={styles.extra}>
                    {[item.building, item.floor].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push({ pathname: '/addresses/edit', params: { id: item.id } })}
                  hitSlop={8}
                >
                  <Text style={styles.actionBtnText}>تعديل</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                  onPress={() => setPendingDelete(item)}
                  hitSlop={8}
                >
                  <IconTrashOutline size={18} color={t.colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <IconLocationOutline size={48} color={t.colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>لا عناوين بعد</Text>
              <Text style={styles.emptyText}>أضف عنواناً لتوصيل الطلبات</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/addresses/pick-location')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyBtnText}>إضافة عنوان</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      <ConfirmationDialog visible={Boolean(pendingDelete)} title="حذف العنوان" message={`هل تريد حذف ${pendingDelete?.label || 'هذا العنوان'}؟`} confirmLabel="حذف" destructive loading={deleting} onCancel={() => setPendingDelete(null)} onConfirm={handleDelete} />
    </SafeAreaView>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderLight,
  },
  backBtn: { padding: t.spacing.md },
  headerTitle: { flex: 1, ...t.typography.titleLarge, color: t.colors.text, textAlign: 'center' },
  loader: { flex: 1 },
  list: { padding: t.spacing.screenPadding, paddingBottom: t.spacing.xxl + t.spacing.sm },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.sm,
    height: t.button.primaryHeight,
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.lg,
    marginBottom: t.spacing.xl,
    ...t.shadow.shadow3,
  },
  addBtnText: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.white },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.borderLight,
  },
  cardDefault: { borderWidth: 2, borderColor: t.colors.primary },
  cardContent: { marginBottom: t.spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, marginBottom: t.spacing.xs },
  label: { ...t.typography.titleMedium, fontFamily: t.fonts.extraBold, color: t.colors.text },
  addrText: { ...t.typography.body, color: t.colors.textSecondary, lineHeight: 22 },
  extra: { ...t.typography.caption, color: t.colors.textMuted, marginTop: t.spacing.xs },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  actionBtn: { paddingVertical: t.spacing.sm, paddingHorizontal: t.spacing.md },
  actionBtnText: { ...t.typography.body, fontFamily: t.fonts.medium, color: t.colors.text },
  actionBtnDanger: { marginRight: 'auto' },
  empty: {
    paddingVertical: t.spacing.xxl * 2,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: t.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: t.spacing.xl,
  },
  emptyTitle: { ...t.typography.titleMedium, color: t.colors.text, marginBottom: t.spacing.sm },
  emptyText: { ...t.typography.body, color: t.colors.textSecondary, marginBottom: t.spacing.xl },
  emptyBtn: {
    height: t.button.primaryHeight,
    justifyContent: 'center',
    paddingHorizontal: t.spacing.xl,
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.lg,
  },
  emptyBtnText: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.white },
});
