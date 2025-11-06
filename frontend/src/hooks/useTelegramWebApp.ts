import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export function useTelegramWebApp() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string>('');

  useEffect(() => {
    // Check if running in Telegram
    if (WebApp.initDataUnsafe.user) {
      WebApp.ready();
      WebApp.expand();
      
      setUser(WebApp.initDataUnsafe.user as TelegramUser);
      setInitData(WebApp.initData);
      setIsReady(true);

      // Apply Telegram theme
      document.body.style.backgroundColor = WebApp.backgroundColor;
      
      // Setup back button if needed
      WebApp.BackButton.onClick(() => {
        WebApp.close();
      });
    }
  }, []);

  return {
    isReady,
    isTelegram: !!WebApp.initDataUnsafe.user,
    user,
    initData,
    webApp: WebApp,
    showBackButton: () => WebApp.BackButton.show(),
    hideBackButton: () => WebApp.BackButton.hide(),
    close: () => WebApp.close(),
    showConfirm: (message: string) => WebApp.showConfirm(message),
    showAlert: (message: string) => WebApp.showAlert(message),
  };
}

