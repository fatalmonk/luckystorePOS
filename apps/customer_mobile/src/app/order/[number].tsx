import { useLocalSearchParams } from 'expo-router';
import { OrderDetailScreen } from '../../screens/order/order-detail-screen';

export default function OrderRoute() {
  const { number, token } = useLocalSearchParams<{ number: string; token?: string }>();
  return <OrderDetailScreen orderNumber={number || ''} trackingToken={token} />;
}
