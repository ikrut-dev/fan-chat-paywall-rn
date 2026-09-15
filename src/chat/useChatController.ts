import { useEffect, useRef, useState } from 'react';
import { ChatController } from './chatController';

export function useChatController() {
  const controllerRef = useRef<ChatController | null>(null);
  if (!controllerRef.current) controllerRef.current = new ChatController();
  const controller = controllerRef.current;

  const [, forceRender] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => forceRender((n) => n + 1));
    controller.hydrate().then(() => setReady(true));
    return () => {
      unsubscribe();
      controller.dispose();
    };
  }, []);

  return { controller, messages: controller.getDisplayMessages(), ready };
}
