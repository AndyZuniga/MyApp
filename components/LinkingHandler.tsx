import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

export default function LinkingHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      const data = Linking.parse(url);
      const token = data.queryParams?.token;

      // 🔴 CAMBIO: Manejar deep links para verificación y recuperación
      if (data.scheme === 'setmatch' && data.hostname === 'verificar' && token) {
        // Verificación de cuenta
        router.push(`/verificar?token=${token}`);
      } else if (data.scheme === 'setmatch' && data.hostname === 'restablecer' && token) {
        // Pantalla de restablecer contraseña
        router.push(`/restablecer?token=${token}`);
      } else if (
        data.scheme?.startsWith('http') &&
        data.path === 'reset-redirect' &&
        token
      ) {
        // 🔴 CAMBIO: Manejar HTTP deep link de reset-redirect
        router.push(`/restablecer?token=${token}`);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // 🔴 CAMBIO: Revisar si la app se abrió desde un enlace al montar
    (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) handleDeepLink({ url: initialUrl });
    })();

    return () => subscription.remove();
  }, []);

  return null;
}
