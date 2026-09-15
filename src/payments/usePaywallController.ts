import { useEffect, useRef, useState } from 'react';
import { PaywallController } from './paywallController';
import { ProductId } from '../types';

export function usePaywallController(productId: ProductId) {
  const controllerRef = useRef<PaywallController | null>(null);
  if (!controllerRef.current) controllerRef.current = new PaywallController(productId);
  const controller = controllerRef.current;

  const [, forceRender] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => forceRender((n) => n + 1));
    controller.hydrate().then(() => setReady(true));
    return unsubscribe;
  }, []);

  return { controller, state: controller.getState(), ready };
}
