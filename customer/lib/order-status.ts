export type OrderStatusTone = 'neutral' | 'warning' | 'success' | 'error' | 'primary';

export type OrderStatusMeta = {
  label: string;
  tone: OrderStatusTone;
  completed: boolean;
};

/** Customer-facing order language. API values remain untouched. */
export const orderStatusMeta: Record<string, OrderStatusMeta> = {
  pending: { label: 'تم إرسال الطلب', tone: 'warning', completed: false },
  accepted_by_merchant: { label: 'قبله المتجر', tone: 'primary', completed: false },
  preparing: { label: 'قيد التحضير', tone: 'primary', completed: false },
  ready_for_pickup: { label: 'جاهز للاستلام', tone: 'primary', completed: false },
  picked_up: { label: 'استلمه الموزع', tone: 'primary', completed: false },
  on_the_way: { label: 'في الطريق', tone: 'primary', completed: false },
  delivered: { label: 'تم التسليم', tone: 'success', completed: true },
  cancelled: { label: 'ملغي', tone: 'error', completed: true },
  rejected: { label: 'مرفوض', tone: 'error', completed: true },
};

export function getOrderStatus(status?: string | null): OrderStatusMeta {
  return orderStatusMeta[status || ''] ?? { label: 'قيد المعالجة', tone: 'neutral', completed: false };
}

export const activeOrderStatuses = new Set(['pending', 'accepted_by_merchant', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way']);
