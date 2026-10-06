import { request } from './client';

export async function validatePromoCode(data: { code: string; subtotal: number }) {
  return request<{
    code: string;
    percentage: number;
    discountAmount: number;
  }>('/promo-codes/validate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

