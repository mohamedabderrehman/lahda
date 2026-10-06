import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  getMerchantPromoCodes,
  createMerchantPromoCode,
  updateMerchantPromoCode,
  deleteMerchantPromoCode,
  type MerchantPromoCodeItem,
} from '../../../api/client';
import { theme, formatPrice } from '../../../constants/theme';
import {
  IconTicketOutline,
  IconPencilOutline,
  IconTrashOutline,
  IconCloseOutline,
  IconCheckmarkOutline,
} from '../../../components/Icons';
import { Card, CardSection } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { EmptyState } from '../../../components/ui/EmptyState';

type FilterType = 'all' | 'active' | 'expired';
type SortType = 'newest' | 'oldest';

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

function isPromoActive(item: MerchantPromoCodeItem): boolean {
  if (!item.isActive) return false;
  return !isExpired(item.expiresAt);
}

export default function MerchantPromoCodesScreen() {
  const [list, setList] = useState<MerchantPromoCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortType>('newest');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setFormError(null);
    try {
      const data = await getMerchantPromoCodes();
      setList(data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredAndSorted = useMemo(() => {
    let items = list;
    if (filter === 'active') items = items.filter((i) => isPromoActive(i));
    else if (filter === 'expired') items = items.filter((i) => !isPromoActive(i));
    const q = searchQuery.trim().toUpperCase();
    if (q) items = items.filter((i) => i.code.toUpperCase().includes(q));
    items = [...items].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return sort === 'newest' ? tb - ta : ta - tb;
    });
    return items;
  }, [list, filter, searchQuery, sort]);

  const handleCreate = useCallback(() => {
    setEditingId(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((id: string) => {
    setEditingId(id);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((item: MerchantPromoCodeItem) => {
    Alert.alert(
      'حذف كود الخصم',
      `هل أنت متأكد من حذف الكود "${item.code}"؟ لا يمكن التراجع.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await deleteMerchantPromoCode(item.id);
              await load(true);
            } catch (e) {
              Alert.alert('خطأ', (e as Error).message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }, [load]);

  const handleToggleActive = useCallback(
    async (item: MerchantPromoCodeItem) => {
      try {
        await updateMerchantPromoCode(item.id, { isActive: !item.isActive });
        await load(true);
      } catch (e) {
        Alert.alert('خطأ', (e as Error).message);
      }
    },
    [load]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>أكواد الخصم</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero / Info */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <IconTicketOutline size={28} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>أكواد خصم متجرك</Text>
            <Text style={styles.heroSub}>
              أنشئ أكواداً خاصة بمتجرك لزيادة المبيعات. يستخدمها العملاء عند الدفع.
            </Text>
          </View>
        </View>

        {/* Filters + Search + Sort */}
        <View style={styles.toolbar}>
          <View style={styles.filterRow}>
            {(['all', 'active', 'expired'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f === 'all' ? 'الكل' : f === 'active' ? 'نشط' : 'منتهي'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="بحث بالكود..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>ترتيب:</Text>
            <TouchableOpacity
              onPress={() => setSort(sort === 'newest' ? 'oldest' : 'newest')}
              style={styles.sortBtn}
            >
              <Text style={styles.sortBtnText}>{sort === 'newest' ? 'الأحدث أولاً' : 'الأقدم أولاً'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CTA */}
        <Button
          title="+ إضافة كود خصم"
          onPress={handleCreate}
          style={styles.addBtn}
        />

        {loading && list.length === 0 ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : filteredAndSorted.length === 0 ? (
          <Card>
            <CardSection>
              <EmptyState
                title={list.length === 0 ? 'لا توجد أكواد خصم بعد' : 'لا توجد نتائج'}
                subtitle={
                  list.length === 0
                    ? 'أضف كود خصم أولاً ليستخدمه العملاء عند الطلب'
                    : 'غيّر الفلتر أو كلمة البحث'
                }
                action={
                  list.length === 0 ? (
                    <Button title="إضافة أول كود" onPress={handleCreate} variant="secondary" style={{ marginTop: theme.spacing.md }} />
                  ) : undefined
                }
              />
            </CardSection>
          </Card>
        ) : (
          <View style={styles.list}>
            <SectionHeader
              title="قائمة الأكواد"
              subtitle={`${filteredAndSorted.length} كود`}
            />
            {filteredAndSorted.map((item) => (
              <PromoCard
                key={item.id}
                item={item}
                onEdit={() => handleEdit(item.id)}
                onDelete={() => handleDelete(item)}
                onToggleActive={() => handleToggleActive(item)}
                isDeleting={deletingId === item.id}
              />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <PromoFormModal
        visible={showForm}
        editingId={editingId}
        initialItem={editingId ? list.find((i) => i.id === editingId) ?? null : null}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
          setFormError(null);
        }}
        onSaved={async () => {
          setShowForm(false);
          setEditingId(null);
          setFormError(null);
          await load(true);
        }}
        error={formError}
        setError={setFormError}
        saving={saving}
        setSaving={setSaving}
      />
    </SafeAreaView>
  );
}

function PromoCard({
  item,
  onEdit,
  onDelete,
  onToggleActive,
  isDeleting,
}: {
  item: MerchantPromoCodeItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isDeleting: boolean;
}) {
  const active = isPromoActive(item);
  const expired = isExpired(item.expiresAt);

  return (
    <Card style={styles.card}>
      <CardSection>
        <View style={styles.cardHeader}>
          <View style={styles.cardCodeWrap}>
            <Text style={styles.cardCode} numberOfLines={1}>{item.code}</Text>
            <Badge
              label={active ? 'نشط' : expired ? 'منتهي' : 'معطل'}
              variant={active ? 'success' : expired ? 'neutral' : 'warning'}
            />
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={onToggleActive} style={styles.iconBtn} disabled={isDeleting}>
              <IconCheckmarkOutline size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onEdit} style={styles.iconBtn} disabled={isDeleting}>
              <IconPencilOutline size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.iconBtn} disabled={isDeleting}>
              <IconTrashOutline size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>الخصم</Text>
          <Text style={styles.cardValue}>{item.percentage}%</Text>
        </View>
        {item.maxDiscount != null && (
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>حد أقصى خصم</Text>
            <Text style={styles.cardValue}>{formatPrice(item.maxDiscount)}</Text>
          </View>
        )}
        {item.minSubtotal != null && (
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>حد أدنى طلب</Text>
            <Text style={styles.cardValue}>{formatPrice(item.minSubtotal)}</Text>
          </View>
        )}
        {item.expiresAt && (
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>ينتهي</Text>
            <Text style={[styles.cardValue, expired && styles.cardValueMuted]}>
              {new Date(item.expiresAt).toLocaleDateString('ar-IQ', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </CardSection>
    </Card>
  );
}

function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function PromoFormModal({
  visible,
  editingId,
  initialItem,
  onClose,
  onSaved,
  error,
  setError,
  saving,
  setSaving,
}: {
  visible: boolean;
  editingId: string | null;
  initialItem: MerchantPromoCodeItem | null;
  onClose: () => void;
  onSaved: () => void;
  error: string | null;
  setError: (s: string | null) => void;
  saving: boolean;
  setSaving: (b: boolean) => void;
}) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [percentage, setPercentage] = useState('10');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [minSubtotal, setMinSubtotal] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (initialItem) {
      setCode(initialItem.code);
      setDescription(initialItem.description ?? '');
      setPercentage(String(initialItem.percentage));
      setMaxDiscount(initialItem.maxDiscount != null ? String(initialItem.maxDiscount) : '');
      setMinSubtotal(initialItem.minSubtotal != null ? String(initialItem.minSubtotal) : '');
      setExpiresAt(initialItem.expiresAt ? initialItem.expiresAt.slice(0, 16) : '');
      setIsActive(initialItem.isActive);
    } else {
      setCode('');
      setDescription('');
      setPercentage('10');
      setMaxDiscount('');
      setMinSubtotal('');
      setExpiresAt('');
      setIsActive(true);
    }
  }, [visible, initialItem, setError]);

  const handleGenerateCode = useCallback(() => {
    setCode(generateRandomCode());
  }, []);

  const handleSubmit = useCallback(async () => {
    const codeTrim = code.trim().toUpperCase();
    if (!codeTrim) {
      setError('أدخل الكود');
      return;
    }
    const pct = parseInt(percentage, 10);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      setError('النسبة يجب أن تكون بين 1 و 100');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        code: codeTrim,
        description: description.trim() || undefined,
        percentage: pct,
        maxDiscount: maxDiscount === '' ? null : Number(maxDiscount),
        minSubtotal: minSubtotal === '' ? null : Number(minSubtotal),
        expiresAt: expiresAt || null,
        isActive,
      };
      if (editingId) {
        await updateMerchantPromoCode(editingId, payload);
      } else {
        await createMerchantPromoCode(payload);
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [
    code,
    percentage,
    description,
    maxDiscount,
    minSubtotal,
    expiresAt,
    isActive,
    editingId,
    setError,
    setSaving,
    onSaved,
  ]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? 'تعديل كود الخصم' : 'إضافة كود خصم'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <IconCloseOutline size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={styles.formError}>
                <Text style={styles.formErrorText}>{error}</Text>
              </View>
            ) : null}
            <View style={styles.field}>
              <Text style={styles.label}>الكود *</Text>
              <View style={styles.codeRow}>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  onChangeText={setCode}
                  placeholder="مثال: SUMMER20"
                  placeholderTextColor={theme.colors.textMuted}
                  editable={!editingId}
                  autoCapitalize="characters"
                />
                {!editingId && (
                  <TouchableOpacity onPress={handleGenerateCode} style={styles.generateBtn}>
                    <Text style={styles.generateBtnText}>توليد</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>النسبة المئوية * (1–100)</Text>
              <TextInput
                style={styles.input}
                value={percentage}
                onChangeText={setPercentage}
                keyboardType="number-pad"
                placeholder="10"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>الحد الأقصى للخصم (اختياري) د.ع</Text>
              <TextInput
                style={styles.input}
                value={maxDiscount}
                onChangeText={setMaxDiscount}
                keyboardType="number-pad"
                placeholder="بدون حد"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>الحد الأدنى لقيمة الطلب (اختياري) د.ع</Text>
              <TextInput
                style={styles.input}
                value={minSubtotal}
                onChangeText={setMinSubtotal}
                keyboardType="number-pad"
                placeholder="بدون حد"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>ينتهي في (اختياري)</Text>
              <TextInput
                style={styles.input}
                value={expiresAt}
                onChangeText={setExpiresAt}
                placeholder="YYYY-MM-DDTHH:mm"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={styles.fieldRow}>
              <TouchableOpacity
                onPress={() => setIsActive(!isActive)}
                style={[styles.checkbox, isActive && styles.checkboxChecked]}
              >
                {isActive && <IconCheckmarkOutline size={18} color="#fff" />}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>كود نشط (يمكن للعملاء استخدامه)</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>ملاحظات (اختياري)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="وصف قصير للعرض"
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />
            </View>
            <View style={styles.modalActions}>
              <Button
                title={saving ? 'جاري الحفظ...' : 'حفظ'}
                onPress={handleSubmit}
                loading={saving}
                disabled={saving}
                style={{ flex: 1 }}
              />
              <Button title="إلغاء" onPress={onClose} variant="secondary" style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backBtn: { marginLeft: theme.spacing.sm },
  backText: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', color: theme.colors.primary },
  headerTitle: { flex: 1, fontSize: 20, fontFamily: 'Cairo_800ExtraBold', color: theme.colors.text, textAlign: 'right' },

  scroll: { flex: 1 },
  content: { padding: theme.spacing.screenPadding, paddingBottom: 40 },
  loader: { marginVertical: 40 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentPurple,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.lg,
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 18, fontFamily: 'Cairo_800ExtraBold', color: '#fff', textAlign: 'right' },
  heroSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.9)', textAlign: 'right', marginTop: 6, lineHeight: 20 },

  toolbar: { marginBottom: theme.spacing.lg },
  filterRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: theme.spacing.sm },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: theme.colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Cairo_500Medium',
    color: theme.colors.text,
    textAlign: 'right',
    marginBottom: theme.spacing.sm,
  },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  sortLabel: { fontSize: 13, fontFamily: 'Cairo_500Medium', color: theme.colors.textSecondary },
  sortBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  sortBtnText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: theme.colors.primary },

  addBtn: { marginBottom: theme.spacing.lg },

  list: {},
  card: { marginBottom: theme.spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  cardCodeWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardCode: { fontSize: 18, fontFamily: 'Cairo_800ExtraBold', color: theme.colors.primary, textAlign: 'right' },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardLabel: { fontSize: 13, fontFamily: 'Cairo_500Medium', color: theme.colors.textSecondary, textAlign: 'right' },
  cardValue: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: theme.colors.text, textAlign: 'left' },
  cardValueMuted: { color: theme.colors.textMuted },
  cardDesc: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, textAlign: 'right', marginTop: 8 },

  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalTitle: { fontSize: 18, fontFamily: 'Cairo_800ExtraBold', color: theme.colors.text, textAlign: 'right' },
  modalBody: { padding: theme.spacing.lg, paddingBottom: 40 },
  formError: { backgroundColor: theme.colors.error + '15', padding: theme.spacing.md, borderRadius: theme.radius.lg, marginBottom: theme.spacing.md },
  formErrorText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: theme.colors.error, textAlign: 'right' },
  field: { marginBottom: theme.spacing.lg },
  fieldRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg },
  label: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: theme.colors.text, marginBottom: 6, textAlign: 'right' },
  input: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Cairo_500Medium',
    color: theme.colors.text,
    textAlign: 'right',
  },
  codeInput: { flex: 1 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  generateBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 12, borderRadius: theme.radius.lg },
  generateBtnText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#fff' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  checkboxChecked: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  checkboxLabel: { fontSize: 14, fontFamily: 'Cairo_500Medium', color: theme.colors.text, textAlign: 'right', flex: 1 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: theme.spacing.lg },
});
