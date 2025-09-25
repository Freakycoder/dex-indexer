import type { AppProps } from "next/app";
import { WebSocketProvider } from "@/context/WebsocketContext";
import Script from "next/script";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script 
        src="https://cdn.tailwindcss.com" 
        strategy="beforeInteractive"
      />
      <Script
        id="tailwind-config"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    gray: {
                      900: '#111827',
                      800: '#1f2937',
                      700: '#374151',
                      600: '#4b5563',
                      500: '#6b7280',
                      400: '#9ca3af',
                    },
                  },
                },
              }
            }
          `,
        }}
      />
      <WebSocketProvider url="ws://localhost:3001/ws">
        <Component {...pageProps} />
      </WebSocketProvider>
    </>
  );
}