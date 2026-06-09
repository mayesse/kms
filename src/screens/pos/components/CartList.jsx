import { usePosStore } from '../../../stores/posStore'
import CartItem from './CartItem'

export default function CartList() {
  const cart = usePosStore(s => s.cart)
  return (
    <div className="max-h-[30vh] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
      {cart.map(item => <CartItem key={item.id} item={item} />)}
    </div>
  )
}
