type OrderUpdatePayload = {
  type?: string;
  orderId?: string;
};

type OrderUpdateListener = (payload: OrderUpdatePayload) => void;

const listeners = new Set<OrderUpdateListener>();

export function emitOrderUpdate(payload: OrderUpdatePayload) {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // Ignore listener failures so updates reach other screens.
    }
  });
}

export function subscribeOrderUpdates(listener: OrderUpdateListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
