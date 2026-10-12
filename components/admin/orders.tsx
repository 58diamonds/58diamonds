'use client';

import type { OrderStatus } from '@/lib/types';
import { Badge } from './ui';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Awaiting payment',
  paid: 'Paid, to prepare',
  processing: 'Being prepared',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tone = status === 'paid' ? 'gold' : status === 'processing' ? 'warn' : status === 'shipped' || status === 'delivered' ? 'dark' : 'quiet';
  return <Badge tone={tone}>{STATUS_LABEL[status]}</Badge>;
}

