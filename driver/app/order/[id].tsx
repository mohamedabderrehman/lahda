import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  Platform,
  Modal,
  Dimensions,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOrder,
  takeOrder,
  updateOrderStatus,
  merchantAcceptOrder,
  merchantRejectOrder,
  getMyDeliveryOffer,
  declineDeliveryOffer,
  type MyDeliveryOffer,
} from '../../api/client';
import { formatPrice } from '../../constants/theme';
import { theme } from '../../constants/theme';
import { OrderMap } from '../../components/OrderMap';
import {
  IconLocationOutline,
  IconPhoneOutline,
  IconNavigateOutline,
  IconCheckmark,
  IconCarOutline,
  IconExpandOutline,
  IconCloseOutline,
  IconStoreOutline,
  IconBoxOutline,
  IconClockOutline,
} from '../../components/Icons';
import * as Location from 'expo-location';
import { addNotificationListener } from '../../hooks/useNotifications';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  accepted_by_merchant: 'مقبول',
  preparing: 'قيد التحضير',
  ready_for_pickup: 'جاهز للاستلام',
  picked_up: 'تم الاستلام',
  on_the_way: 'في الطريق',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

const DRIVER_STEPS = [
  { key: 'ready_for_pickup', label: 'جاهز' },
  { key: 'picked_up', label: 'تم الاستلام' },
  { key: 'on_the_way', label: 'في الطريق' },
  { key: 'delivered', label: 'تم التوصيل' },
];

const MERCHANT_STEPS: Array<{ key: string; label: string }> = [
  { key: 'pending', label: 'جديد' },
  { key: 'accepted_by_merchant', label: 'مقبول' },
  { key: 'preparing', label: 'تحضير' },
  { key: 'ready_for_pickup', label: 'جاهز' },
  { key: 'picked_up', label: 'استلام' },
  { key: 'delivered', label: 'توصيل' },
];

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  appFee?: number;
  paymentMethod?: string;
  codStatus?: string;
  deliveryAddressText?: string;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  merchantProfile?: {
    storeName?: string;
    addressText?: string;
    latitude?: number | null;
    longitude?: number | null;
    phone?: string;
  };
  address?: {
    addressText?: string;
    building?: string;
    floor?: string;
    extraNotes?: string;
  };
  customer?: { fullName?: string; phone?: string };
  notes?: string | null;
  items?: Array<{
    quantity: number;
    productNameSnapshot?: string;
    priceSnapshot?: number | string;
    optionsSnapshot?: { selectedOptions?: Array<{ name: string; priceModifier: number | string }>; note?: string } | null;
    subtotal?: number | string;
    product?: { nameAr?: string };
  }>;
  driverId?: string | null;
  driver?: { fullName?: string; phone?: string; vehicleInfo?: string } | null;
  createdAt?: string;
};

function getCodStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    due_to_admin: 'مستحق التسليم للإدارة',
    in_remittance: 'ضمن سند تسوية',
    remitted_confirmed: 'تم التسليم للإدارة',
  };
  return labels[status] || status;
}

function getCodStatusColor(status: string): string {
  const colors: Record<string, string> = {
    due_to_admin: '#f59e0b', // warning
    in_remittance: '#3b82f6', // primary
    remitted_confirmed: '#22c55e', // success
  };
  return colors[status] || theme.colors.textMuted;
}

function openInMaps(lat: number, lng: number, label?: string) {
  const url = Platform.select({
    ios: `maps:0,0?q=${label ?? ''}@${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${label ?? ''})`,
    default: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`,
  });
  if (url) Linking.openURL(url).catch(() => {});
}

function callPhone(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => {});
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const role = (user as { role?: string })?.role;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [prepModalVisible, setPrepModalVisible] = useState(false);
  const [prepMinutesText, setPrepMinutesText] = useState('');
  const [offerData, setOfferData] = useState<MyDeliveryOffer | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const loadOrder = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getOrder(id);
      setOrder(data as OrderDetail);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  useFocusEffect(
    useCallback(() => {
      loadOrder(true);
    }, [loadOrder]),
  );

  const DRIVER_OFFER_STATUSES = ['accepted_by_merchant', 'preparing', 'ready_for_pickup'];

  // Fetch delivery offer when driver views an order eligible for assignment
  useEffect(() => {
    if (role !== 'driver' || !id || !order) return;
    if (DRIVER_OFFER_STATUSES.includes(order.status) && !order.driverId) {
      getMyDeliveryOffer().then((offer) => {
        if (offer && offer.orderId === id) {
          setOfferData(offer);
        } else {
          setOfferData(null);
        }
      }).catch(() => setOfferData(null));
    } else {
      setOfferData(null);
    }
  }, [role, id, order?.id, order?.status, order?.driverId]);

  // Countdown for offer
  useEffect(() => {
    if (!offerData?.expiresAt) {
      setSecondsLeft(null);
      return;
    }
    const update = () => {
      const left = Math.max(0, Math.ceil((new Date(offerData.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) setOfferData(null);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [offerData?.expiresAt]);

  useEffect(() => {
    const status = order?.status as string;
    if (status === 'delivered' || status === 'cancelled') return;
    const intervalId = setInterval(() => {
      loadOrder(true);
    }, 10000);
    return () => clearInterval(intervalId);
  }, [loadOrder, order?.status]);

  // Reload on relevant notifications
  useEffect(() => {
    const unsubscribe = addNotificationListener((payload) => {
      const relevantTypes = ['delivery_offer', 'delivery_available', 'driver_assigned', 'order_picked_up', 'order_on_the_way', 'order_delivered', 'new_order', 'order_accepted', 'order_preparing', 'order_ready'];
      if (payload.type && relevantTypes.includes(payload.type)) {
        // Reload if this notification is for this order, or if it's a general status update
        if (!payload.orderId || payload.orderId === id) {
          loadOrder(true);
        }
      }
    });
    return () => { unsubscribe(); };
  }, [loadOrder, id]);

  useEffect(() => {
    if (role !== 'driver') return;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 30 },
        (loc) => setDriverLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }),
      );
    })();
    return () => { if (sub) sub.remove(); };
  }, [role]);

  const handleTakeOrder = useCallback(async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
    try {
      const updated = await takeOrder(id);
      setOrder(updated as OrderDetail);
      setOfferData(null);
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل استلام الطلب');
    } finally {
      setActionLoading(false);
    }
  }, [id, actionLoading]);

  const handleDeclineOrder = useCallback(async () => {
    if (!id || actionLoading) return;
    const penalty = offerData?.penaltyAmount ?? 250;
    Alert.alert(
      'تنبيه',
      `سيتم خصم ${penalty} دينار من رصيدك. هل أنت متأكد من رفض الطلب؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، رفض',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await declineDeliveryOffer(id);
              setOfferData(null);
              router.back();
            } catch (e: unknown) {
              Alert.alert('خطأ', (e as Error).message || 'فشل رفض الطلب');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }, [id, actionLoading, offerData?.penaltyAmount]);

  const handleUpdateStatus = useCallback(
    async (status: string) => {
      if (!id || actionLoading) return;
      const labels: Record<string, string> = {
        picked_up: 'هل تم استلام الطلب من المتجر؟',
        on_the_way: 'هل أنت في الطريق إلى العميل؟',
        delivered: 'هل تم تسليم الطلب للعميل؟',
      };
      const msg = labels[status];
      if (msg) {
        Alert.alert('تأكيد', msg, [
          { text: 'لا', style: 'cancel' },
          {
            text: 'نعم',
            onPress: async () => {
              setActionLoading(true);
              try {
                const updated = await updateOrderStatus(id, status);
                setOrder(updated as OrderDetail);
              } catch (e: unknown) {
                Alert.alert('خطأ', (e as Error).message || 'فشل تحديث الحالة');
              } finally {
                setActionLoading(false);
              }
            },
          },
        ]);
      } else {
        setActionLoading(true);
        try {
          const updated = await updateOrderStatus(id, status);
          setOrder(updated as OrderDetail);
        } catch (e: unknown) {
          Alert.alert('خطأ', (e as Error).message || 'فشل تحديث الحالة');
        } finally {
          setActionLoading(false);
        }
      }
    },
    [id, actionLoading]
  );

  /** One-tap accept with no prep time */
  const handleMerchantAcceptNow = useCallback(async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
    try {
      setOrder(await merchantAcceptOrder(id) as OrderDetail);
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل قبول الطلب');
    } finally {
      setActionLoading(false);
    }
  }, [id, actionLoading]);

  /** Open modal to accept with optional prep time */
  const openPrepTimeModal = useCallback(() => {
    if (!id || actionLoading) return;
    setPrepMinutesText('');
    setPrepModalVisible(true);
  }, [id, actionLoading]);

  const submitMerchantAccept = useCallback(
    async () => {
      if (!id || actionLoading) return;
      const minsRaw = prepMinutesText.trim();
      const mins = minsRaw ? parseInt(minsRaw, 10) : undefined;
      setPrepModalVisible(false);
      setActionLoading(true);
      try {
        setOrder(await merchantAcceptOrder(id, mins != null && mins > 0 ? mins : undefined) as OrderDetail);
      } catch (e: unknown) {
        Alert.alert('خطأ', (e as Error).message || 'فشل قبول الطلب');
      } finally {
        setActionLoading(false);
      }
    },
    [id, actionLoading, prepMinutesText]
  );

  const handleMerchantReject = useCallback(() => {
    if (!id || actionLoading) return;
    Alert.alert('رفض الطلب', 'هل تريد رفض هذا الطلب؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'رفض',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await merchantRejectOrder(id);
            router.back();
          } catch (e: unknown) {
            Alert.alert('خطأ', (e as Error).message || 'فشل رفض الطلب');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [id, actionLoading, router]);

  if (!id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={styles.errorText}>معرف الطلب غير صالح</Text>
      </SafeAreaView>
    );
  }

  if (loading && !order) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← رجوع</Text>
          </TouchableOpacity>
        </View>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← رجوع</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.errorText}>لم يتم العثور على الطلب</Text>
      </SafeAreaView>
    );
  }

  const isMerchantView = role === 'merchant';
  const isDriverView = role === 'driver';
  const isPending = DRIVER_OFFER_STATUSES.includes(order.status) && !order.driverId;
  const isMine = !!order.driverId;
  const canPickedUp = isMine && order.status === 'ready_for_pickup';
  const canOnTheWay = isMine && order.status === 'picked_up';
  const canDelivered = isMine && order.status === 'on_the_way';
  const isComplete = order.status === 'delivered' || order.status === 'cancelled';
  const orderPendingMerchant = order.status === 'pending';
  const canSetPreparing = isMerchantView && order.status === 'accepted_by_merchant';
  const canSetReadyForPickup = isMerchantView && order.status === 'preparing';

  const itemsSubtotal = (order.items ?? []).reduce((sum, it) => sum + Number(it.subtotal ?? 0), 0);
  const deliveryFee = Number((order as { deliveryFee?: number | string }).deliveryFee ?? 0);
  const appFee = Number((order as { appFee?: number | string }).appFee ?? 0);
  const subtotal = Number(order.subtotal ?? itemsSubtotal);
  const total = Number(order.total ?? 0);

  // COD breakdown
  const isCashOrder = order.paymentMethod === 'cash';
  const collectedFromCustomer = total; // Customer pays full total
  const driverKeeps = deliveryFee; // Driver keeps delivery fee
  const dueToAdmin = subtotal + appFee; // Driver remits subtotal + app fee to admin

  const merchantLat = order.merchantProfile?.latitude ?? null;
  const merchantLng = order.merchantProfile?.longitude ?? null;
  const deliveryLat = order.deliveryLatitude ?? null;
  const deliveryLng = order.deliveryLongitude ?? null;
  const mapMarkers = [
    ...(Number.isFinite(merchantLat) && Number.isFinite(merchantLng)
      ? [{ lat: merchantLat as number, lng: merchantLng as number, color: '#059669', label: 'المتجر' }]
      : []),
    ...(Number.isFinite(deliveryLat) && Number.isFinite(deliveryLng)
      ? [{ lat: deliveryLat as number, lng: deliveryLng as number, color: '#2563EB', label: 'التوصيل' }]
      : []),
  ];

  const driverCurrentStepIdx = DRIVER_STEPS.findIndex((s) => s.key === order.status);

  const nextAction = isPending
    ? { label: 'استلام الطلب', color: theme.colors.primary, onPress: handleTakeOrder }
    : canPickedUp
    ? { label: 'تم الاستلام من المتجر', color: theme.colors.primary, onPress: () => handleUpdateStatus('picked_up') }
    : canOnTheWay
    ? { label: 'بدأت التوصيل', color: '#8b5cf6', onPress: () => handleUpdateStatus('on_the_way') }
    : canDelivered
    ? { label: 'تم التسليم للعميل', color: theme.colors.success, onPress: () => handleUpdateStatus('delivered') }
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>طلب #{order.orderNumber}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOrder(true)} tintColor={theme.colors.primary} />}
      >
        {/* Status + total hero */}
        <View style={[styles.heroCard, isComplete && order.status === 'delivered' && styles.heroCardDone]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroBadge, { backgroundColor: isComplete ? (order.status === 'delivered' ? theme.colors.success : theme.colors.error) : theme.colors.primary }]}>
              <Text style={styles.heroBadgeText}>{STATUS_LABELS[order.status] ?? order.status}</Text>
            </View>
            <Text style={styles.heroTotal}>{formatPrice(total)}</Text>
          </View>
          {order.merchantProfile?.storeName && (
            <Text style={styles.heroStore}>{order.merchantProfile.storeName}</Text>
          )}
        </View>

        {/* Driver status timeline */}
        {isDriverView && !isComplete && (
          <View style={styles.timelineCard}>
            <Text style={styles.cardTitle}>تقدم التوصيل</Text>
            <View style={styles.timeline}>
              {DRIVER_STEPS.map((step, idx) => {
                const done = driverCurrentStepIdx >= 0 && idx <= driverCurrentStepIdx;
                const active = idx === driverCurrentStepIdx;
                return (
                  <View key={step.key} style={styles.timelineItem}>
                    <View style={[styles.timelineDot, done && styles.timelineDotDone, active && styles.timelineDotActive]}>
                      {done ? <IconCheckmark size={14} color="#fff" /> : <Text style={styles.timelineDotText}>{idx + 1}</Text>}
                    </View>
                    {idx < DRIVER_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, done && styles.timelineLineDone]} />
                    )}
                    <Text style={[styles.timelineLabel, done && styles.timelineLabelDone, active && styles.timelineLabelActive]}>{step.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Merchant steps */}
        {isMerchantView && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>تقدم الطلب</Text>
            <View style={styles.stepsRow}>
              {MERCHANT_STEPS.map((s, idx) => {
                const currentIdx = MERCHANT_STEPS.findIndex((x) => x.key === order.status);
                const completed = currentIdx >= 0 && idx <= currentIdx && order.status !== 'cancelled';
                const active = idx === currentIdx;
                return (
                  <View key={s.key} style={styles.stepItem}>
                    <View style={[styles.stepDot, completed && styles.stepDotDone, active && styles.stepDotActive]} />
                    <Text style={[styles.stepLabel, completed && styles.stepLabelDone]}>{s.label}</Text>
                  </View>
                );
              })}
            </View>
            {order.status === 'cancelled' && <Text style={styles.cancelText}>تم إلغاء الطلب</Text>}
          </View>
        )}

        {/* Driver Card - shown to merchant when driver is assigned */}
        {isMerchantView && order.driverId && order.driver && (
          <View style={[styles.card, { borderWidth: 2, borderColor: theme.colors.primary + '40', backgroundColor: theme.colors.primary + '05' }]}>
            <Text style={styles.cardTitle}>معلومات السائق</Text>
            <View style={styles.driverInfoRow}>
              <View style={[styles.driverIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <IconCarOutline size={24} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text }}>
                  {order.driver.fullName || 'السائق'}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginTop: 2 }}>
                  {order.driver.vehicleInfo || 'معلومات المركبة غير متوفرة'}
                </Text>
              </View>
            </View>
            {order.driver.phone && (
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => callPhone(order.driver!.phone!)}
                activeOpacity={0.85}
              >
                <IconPhoneOutline size={16} color={theme.colors.success} />
                <Text style={[styles.contactBtnText, { color: theme.colors.success }]}>اتصال بالسائق: {order.driver.phone}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Map with route */}
        {mapMarkers.length > 0 && (
          <View style={styles.mapWrap}>
            <TouchableOpacity style={styles.mapPreview} onPress={() => setMapModalVisible(true)} activeOpacity={0.9}>
              <OrderMap
                markers={mapMarkers}
                driverLocation={isDriverView ? driverLocation : undefined}
                style={{ width: SCREEN_W - theme.spacing.screenPadding * 2, height: 260 }}
                darkMode={colorScheme === 'dark'}
              />
              <View style={styles.mapPreviewOverlay}>
                <IconExpandOutline size={18} color="#fff" />
                <Text style={styles.mapPreviewOverlayText}>اضغط لتكبير الخريطة</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Merchant Info Card - Prominent */}
        <View style={[styles.card, styles.merchantCard]}>
          <View style={styles.merchantHeader}>
            <View style={styles.storeIcon}>
              <IconStoreOutline size={24} color={theme.colors.success} />
            </View>
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantName}>{order.merchantProfile?.storeName ?? 'متجر'}</Text>
              <Text style={styles.merchantLabel}>اسم المتجر</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.cardTitle}>عنوان المتجر</Text>
          <View style={styles.addrRow}>
            <IconLocationOutline size={20} color={theme.colors.success} />
            <Text style={styles.addrText}>{order.merchantProfile?.addressText ?? '—'}</Text>
          </View>
          <View style={styles.contactRow}>
            {Number.isFinite(merchantLat) && Number.isFinite(merchantLng) && (
              <TouchableOpacity style={styles.contactBtn} onPress={() => openInMaps(merchantLat!, merchantLng!, 'المتجر')} activeOpacity={0.85}>
                <IconNavigateOutline size={16} color={theme.colors.primary} />
                <Text style={styles.contactBtnText}>فتح الخريطة</Text>
              </TouchableOpacity>
            )}
            {order.merchantProfile?.phone && (
              <TouchableOpacity style={styles.contactBtn} onPress={() => callPhone(order.merchantProfile!.phone!)} activeOpacity={0.85}>
                <IconPhoneOutline size={16} color={theme.colors.success} />
                <Text style={[styles.contactBtnText, { color: theme.colors.success }]}>اتصال بالمتجر</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Customer address + nav */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>عنوان العميل</Text>
          <View style={styles.addrRow}>
            <IconLocationOutline size={20} color={theme.colors.primary} />
            <Text style={styles.addrText}>{order.deliveryAddressText || order.address?.addressText || '—'}</Text>
          </View>
          {/* Building / Floor / Extra Notes */}
          {(order.address?.building || order.address?.floor) && (
            <View style={styles.addressDetails}>
              {order.address?.building && (
                <View style={styles.addrDetailRow}>
                  <IconBoxOutline size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.addrDetailText}>البناء: {order.address.building}</Text>
                </View>
              )}
              {order.address?.floor && (
                <View style={styles.addrDetailRow}>
                  <IconLocationOutline size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.addrDetailText}>الطابق: {order.address.floor}</Text>
                </View>
              )}
            </View>
          )}
          {order.address?.extraNotes && (
            <View style={styles.extraNotesBox}>
              <Text style={styles.extraNotesLabel}>ملاحظات العنوان:</Text>
              <Text style={styles.extraNotesText}>{order.address.extraNotes}</Text>
            </View>
          )}
          {order.customer && (
            <Text style={styles.customerName}>{order.customer.fullName}</Text>
          )}
          <View style={styles.contactRow}>
            {Number.isFinite(deliveryLat) && Number.isFinite(deliveryLng) && (
              <TouchableOpacity style={styles.contactBtn} onPress={() => openInMaps(deliveryLat!, deliveryLng!, 'العميل')} activeOpacity={0.85}>
                <IconNavigateOutline size={16} color={theme.colors.primary} />
                <Text style={styles.contactBtnText}>فتح الخريطة</Text>
              </TouchableOpacity>
            )}
            {order.customer?.phone && (
              <TouchableOpacity style={styles.contactBtn} onPress={() => callPhone(order.customer!.phone!)} activeOpacity={0.85}>
                <IconPhoneOutline size={16} color={theme.colors.success} />
                <Text style={[styles.contactBtnText, { color: theme.colors.success }]}>اتصال بالعميل</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>المطلوب</Text>
            {order.items.map((item, idx) => {
              const name = item.productNameSnapshot || item.product?.nameAr || '—';
              const unitPrice = Number(item.priceSnapshot ?? 0);
              const lineTotal = Number(item.subtotal ?? 0);
              const opts = item.optionsSnapshot;
              const selectedAddons = opts?.selectedOptions ?? [];
              const note = opts?.note;
              return (
                <View key={idx} style={styles.itemBlock}>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemText} numberOfLines={2}>{item.quantity}× {name}</Text>
                    <Text style={styles.itemTotal}>{formatPrice(lineTotal)}</Text>
                  </View>
                  {unitPrice > 0 && <Text style={styles.itemUnit}>{formatPrice(unitPrice)} للقطعة</Text>}
                  {selectedAddons.length > 0 && (
                    <View style={styles.addonsList}>
                      {selectedAddons.map((a, ai) => (
                        <Text key={ai} style={styles.addonText}>
                          + {a.name}{Number(a.priceModifier) > 0 ? ` (${formatPrice(a.priceModifier)})` : ' (مجاني)'}
                        </Text>
                      ))}
                    </View>
                  )}
                  {!!note && <Text style={styles.itemNote}>ملاحظة: {note}</Text>}
                </View>
              );
            })}
          </View>
        )}

        {!!order.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ملاحظات الطلب</Text>
            <Text style={styles.orderNote}>{order.notes}</Text>
          </View>
        )}

        {/* Bill summary (merchant & driver) */}
        {(isMerchantView || isDriverView) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ملخص الفاتورة</Text>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>المجموع الفرعي (المنتجات)</Text>
              <Text style={styles.billValue}>{formatPrice(subtotal)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>رسوم التوصيل</Text>
              <Text style={styles.billValue}>{formatPrice(deliveryFee)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>رسوم التطبيق</Text>
              <Text style={styles.billValue}>{formatPrice(appFee)}</Text>
            </View>
            <View style={[styles.billRow, styles.billRowTotal]}>
              <Text style={styles.billTotalLabel}>الإجمالي</Text>
              <Text style={styles.billTotalValue}>{formatPrice(total)}</Text>
            </View>
          </View>
        )}

        {/* COD Breakdown (driver only) */}
        {isDriverView && isCashOrder && (
          <View style={[styles.card, { backgroundColor: theme.colors.success + '08', borderColor: theme.colors.success + '30', borderWidth: 1 }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.success }]}>تفاصيل التحصيل النقدي (COD)</Text>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>مستلم من العميل</Text>
              <Text style={styles.billValue}>{formatPrice(collectedFromCustomer)}</Text>
            </View>
            <View style={[styles.billRow, { backgroundColor: theme.colors.success + '15', borderRadius: 8, padding: 8, marginVertical: 4 }]}>
              <Text style={[styles.billLabel, { color: theme.colors.success }]}>حصة السائق (التوصيل)</Text>
              <Text style={[styles.billValue, { color: theme.colors.success }]}>{formatPrice(driverKeeps)}</Text>
            </View>
            <View style={[styles.billRow, { borderTopWidth: 1, borderTopColor: theme.colors.borderLight, paddingTop: 8 }]}>
              <Text style={[styles.billLabel, { fontFamily: 'Cairo_700Bold', color: theme.colors.warning }]}>مستحق للإدارة</Text>
              <Text style={[styles.billValue, { fontFamily: 'Cairo_700Bold', color: theme.colors.warning }]}>{formatPrice(dueToAdmin)}</Text>
            </View>
            {order.codStatus && (
              <View style={[styles.codStatusBadge, { backgroundColor: getCodStatusColor(order.codStatus) + '20' }]}>
                <Text style={[styles.codStatusText, { color: getCodStatusColor(order.codStatus) }]}>
                  {getCodStatusLabel(order.codStatus)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Driver: Offer countdown + Accept/Decline when we have an active offer */}
        {isDriverView && !isComplete && isPending && offerData && (
          <View style={styles.offerCard}>
            <View style={styles.offerCountdownRow}>
              <IconClockOutline size={20} color={theme.colors.primary} />
              <Text style={styles.offerCountdownText}>
                {secondsLeft != null && secondsLeft > 0
                  ? `المتبقي للقبول: ${secondsLeft} ثانية`
                  : 'انتهى الوقت'}
              </Text>
            </View>
            <Text style={styles.offerWarning}>
              رفض الطلب سيؤدي إلى خصم {offerData.penaltyAmount} دينار من رصيدك
            </Text>
            <View style={styles.offerActions}>
              <TouchableOpacity
                style={[styles.offerBtn, styles.offerBtnAccept]}
                onPress={handleTakeOrder}
                disabled={actionLoading || (secondsLeft != null && secondsLeft <= 0)}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.offerBtnAcceptText}>قبول الطلب</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.offerBtn, styles.offerBtnDecline]}
                onPress={handleDeclineOrder}
                disabled={actionLoading || (secondsLeft != null && secondsLeft <= 0)}
                activeOpacity={0.85}
              >
                <Text style={styles.offerBtnDeclineText}>رفض</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Driver action button (when no offer UI - e.g. already taken or no offer) */}
        {isDriverView && !isComplete && nextAction && !(isPending && offerData) && (
          <TouchableOpacity
            style={[styles.mainAction, { backgroundColor: nextAction.color }]}
            onPress={nextAction.onPress}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.mainActionText}>{nextAction.label}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Delivery completed */}
        {isDriverView && order.status === 'delivered' && (
          <View style={styles.doneCard}>
            <View style={styles.doneIconWrap}>
              <IconCheckmark size={24} color={theme.colors.success} />
            </View>
            <Text style={styles.doneTitle}>تم التوصيل بنجاح</Text>
            <Text style={styles.doneSub}>أحسنت! تم إضافة أرباح هذا الطلب لحسابك</Text>
          </View>
        )}

        {/* Merchant actions */}
        {!isComplete && isMerchantView && (
          <View style={styles.actions}>
            {orderPendingMerchant && (
              <>
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleMerchantAcceptNow} disabled={actionLoading}>
                  {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnPrimaryText}>قبول الطلب</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={handleMerchantReject} disabled={actionLoading}>
                  <Text style={styles.btnRejectText}>رفض الطلب</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.prepTimeLink} onPress={openPrepTimeModal} disabled={actionLoading}>
                  <Text style={styles.prepTimeLinkText}>تحديد وقت التحضير (اختياري)</Text>
                </TouchableOpacity>
              </>
            )}
            {canSetPreparing && (
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => handleUpdateStatus('preparing')} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnPrimaryText}>قيد التحضير</Text>}
              </TouchableOpacity>
            )}
            {canSetReadyForPickup && (
              <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={() => handleUpdateStatus('ready_for_pickup')} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnPrimaryText}>جاهز للاستلام</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

    <Modal
      visible={prepModalVisible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={() => setPrepModalVisible(false)}
    >
      <View style={styles.prepBackdrop}>
        <View style={styles.prepCard}>
          <Text style={styles.prepTitle}>قبول الطلب</Text>
          <Text style={styles.prepSubtitle}>وقت التحضير (اختياري)</Text>

          <View style={styles.prepInputRow}>
            <TextInput
              style={styles.prepInput}
              value={prepMinutesText}
              onChangeText={(v) => setPrepMinutesText(v.replace(/[^\d]/g, '').slice(0, 3))}
              placeholder="مثال: 15"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="number-pad"
              editable={!actionLoading}
            />
            <Text style={styles.prepUnit}>دقيقة</Text>
          </View>

          <View style={styles.prepActions}>
            <TouchableOpacity
              style={[styles.prepBtn, styles.prepBtnGhost]}
              onPress={() => setPrepModalVisible(false)}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.prepBtnGhostText}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.prepBtn, styles.prepBtnPrimary]}
              onPress={submitMerchantAccept}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.prepBtnPrimaryText}>قبول</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

      <Modal
        visible={mapModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setMapModalVisible(false)}>
              <IconCloseOutline size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>خريطة الطلب</Text>
            <View style={{ width: 40 }} />
          </View>

          <OrderMap
            markers={mapMarkers}
            driverLocation={isDriverView ? driverLocation : undefined}
            style={{ width: SCREEN_W, height: SCREEN_H - 150 }}
            darkMode={colorScheme === 'dark'}
          />

          <View style={styles.modalFooter}>
            <View style={styles.modalLegendRow}>
              <View style={styles.modalLegendItem}>
                <View style={[styles.modalLegendDot, { backgroundColor: '#059669' }]} />
                <Text style={styles.modalLegendText}>المتجر</Text>
              </View>
              <View style={styles.modalLegendItem}>
                <View style={[styles.modalLegendDot, { backgroundColor: '#2563EB' }]} />
                <Text style={styles.modalLegendText}>العميل</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backBtn: { padding: 4, width: 60 },
  backText: { fontSize: 15, color: theme.colors.primary, fontFamily: 'Cairo_600SemiBold', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text },
  loader: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.spacing.screenPadding },
  errorText: { fontSize: 16, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, textAlign: 'center', padding: theme.spacing.xl },

  prepBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.screenPadding,
  },
  prepCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.card,
  },
  prepTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text, textAlign: 'right' },
  prepSubtitle: { marginTop: 4, fontSize: 13, fontFamily: 'Cairo_500Medium', color: theme.colors.textSecondary, textAlign: 'right' },
  prepInputRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  prepInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontFamily: 'Cairo_600SemiBold',
    fontWeight: '600',
    textAlign: 'right',
  },
  prepUnit: { fontSize: 13, fontFamily: 'Cairo_500Medium', color: theme.colors.textSecondary },
  prepActions: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  prepBtn: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 110,
  },
  prepBtnGhost: { backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.borderLight },
  prepBtnGhostText: { fontSize: 14, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text },
  prepBtnPrimary: { backgroundColor: theme.colors.primary },
  prepBtnPrimaryText: { fontSize: 14, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: '#fff' },

  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },
  heroCardDone: { borderWidth: 2, borderColor: theme.colors.success + '40' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  heroBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  heroBadgeText: { fontSize: 13, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: '#fff' },
  heroTotal: { fontSize: 22, fontFamily: 'Cairo_800ExtraBold', fontWeight: '800', color: theme.colors.text },
  heroStore: { fontSize: 14, fontFamily: 'Cairo_500Medium', color: theme.colors.textSecondary },

  timelineCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },
  cardTitle: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 12 },
  timeline: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  timelineItem: { alignItems: 'center', flex: 1 },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  timelineDotActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryDark, borderWidth: 3 },
  timelineDotText: { fontSize: 12, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.textMuted },
  timelineLine: {
    position: 'absolute',
    top: 15,
    left: '50%',
    width: '100%',
    height: 3,
    backgroundColor: theme.colors.borderLight,
    zIndex: -1,
  },
  timelineLineDone: { backgroundColor: theme.colors.primary },
  timelineLabel: { fontSize: 11, fontFamily: 'Cairo_500Medium', color: theme.colors.textMuted, marginTop: 6, textAlign: 'center' },
  timelineLabelDone: { color: theme.colors.text },
  timelineLabelActive: { color: theme.colors.primary, fontFamily: 'Cairo_700Bold', fontWeight: '700' },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },
  merchantCard: { borderWidth: 2, borderColor: theme.colors.success + '40', backgroundColor: theme.colors.success + '05' },
  merchantHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  storeIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.success + '20', justifyContent: 'center', alignItems: 'center' },
  merchantInfo: { flex: 1 },
  merchantName: { fontSize: 18, fontFamily: 'Cairo_800ExtraBold', fontWeight: '800', color: theme.colors.text },
  merchantLabel: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: theme.colors.borderLight, marginVertical: 12 },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addrText: { flex: 1, fontSize: 15, fontFamily: 'Cairo_400Regular', color: theme.colors.text },
  addressDetails: { marginTop: 8, marginLeft: 28, gap: 4 },
  addrDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addrDetailText: { fontSize: 13, fontFamily: 'Cairo_500Medium', color: theme.colors.textSecondary },
  extraNotesBox: { marginTop: 10, marginLeft: 28, padding: 10, backgroundColor: theme.colors.warning + '12', borderRadius: 8, borderWidth: 1, borderColor: theme.colors.warning + '30' },
  extraNotesLabel: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: theme.colors.warning, marginBottom: 4 },
  extraNotesText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.text },
  customerName: { fontSize: 14, fontFamily: 'Cairo_500Medium', color: theme.colors.textSecondary, marginTop: 6 },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
  },
  contactBtnText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.primary },

  mapWrap: { marginBottom: theme.spacing.md, borderRadius: theme.radius.xl, overflow: 'hidden' },
  mapPreview: { borderRadius: theme.radius.xl, overflow: 'hidden' },
  mapPreviewOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mapPreviewOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Cairo_600SemiBold',
    fontWeight: '600',
  },

  mainAction: {
    height: 56,
    borderRadius: theme.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },
  mainActionText: { fontSize: 18, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: '#fff' },

  offerCard: {
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.primary + '30',
  },
  offerCountdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  offerCountdownText: {
    fontSize: 16,
    fontFamily: 'Cairo_700Bold',
    fontWeight: '700',
    color: theme.colors.primary,
  },
  offerWarning: {
    fontSize: 13,
    fontFamily: 'Cairo_500Medium',
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  offerActions: { flexDirection: 'row', gap: theme.spacing.md },
  offerBtn: {
    flex: 1,
    height: 52,
    borderRadius: theme.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerBtnAccept: {
    backgroundColor: theme.colors.primary,
    ...theme.shadow.card,
  },
  offerBtnAcceptText: { fontSize: 16, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: '#fff' },
  offerBtnDecline: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.error,
  },
  offerBtnDeclineText: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.error },

  doneCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.success + '10',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
  },
  doneIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  doneTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.success },
  doneSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, textAlign: 'center', marginTop: 4 },

  actions: { gap: theme.spacing.md },
  btn: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnPrimary: { backgroundColor: theme.colors.primary },
  btnSuccess: { backgroundColor: theme.colors.success },
  btnReject: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.error },
  btnRejectText: { fontSize: 16, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.error },
  btnPrimaryText: { fontSize: 16, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: '#fff' },
  prepTimeLink: { marginTop: theme.spacing.sm, paddingVertical: theme.spacing.sm, alignItems: 'center' },
  prepTimeLinkText: { fontSize: 14, fontFamily: 'Cairo_500Medium', fontWeight: '500', color: theme.colors.primary },

  itemBlock: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  itemText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: theme.colors.text, flex: 1 },
  itemUnit: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginTop: 2 },
  itemTotal: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.textSecondary, marginLeft: 8 },
  addonsList: { marginTop: 4, paddingLeft: 12 },
  addonText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.colors.primary, marginBottom: 2 },
  itemNote: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  orderNote: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: theme.colors.text },

  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.border, marginBottom: 6 },
  stepDotDone: { backgroundColor: theme.colors.success },
  stepDotActive: { backgroundColor: theme.colors.primary },
  stepLabel: { fontSize: 11, color: theme.colors.textSecondary, fontFamily: 'Cairo_700Bold', fontWeight: '700' },
  stepLabelDone: { color: theme.colors.text },
  cancelText: { marginTop: 10, fontSize: 13, color: theme.colors.error, fontFamily: 'Cairo_700Bold', fontWeight: '700', textAlign: 'right' },
  driverInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },

  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  billRowTotal: { borderTopWidth: 1, borderTopColor: theme.colors.borderLight, marginTop: 6, paddingTop: 10 },
  billLabel: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary },
  billValue: { fontSize: 13, fontFamily: 'Cairo_800ExtraBold', fontWeight: '800', color: theme.colors.text },
  billTotalLabel: { fontSize: 14, fontFamily: 'Cairo_900Black', fontWeight: '900', color: theme.colors.text },
  billTotalValue: { fontSize: 16, fontFamily: 'Cairo_900Black', fontWeight: '900', color: theme.colors.primaryDark },
  codStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  codStatusText: {
    fontSize: 12,
    fontFamily: 'Cairo_700Bold',
    fontWeight: '700',
  },
  modalSafe: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalCloseBtn: { padding: 8, borderRadius: 20 },
  modalTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text },
  modalFooter: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: 10,
  },
  modalLegendRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  modalLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalLegendDot: { width: 10, height: 10, borderRadius: 5 },
  modalLegendText: { fontSize: 12, fontFamily: 'Cairo_500Medium', color: theme.colors.textSecondary },
});
