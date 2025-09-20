import type { AppProps } from "next/app";
import { WebSocketProvider } from "@/context/WebsocketContext";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <script src="https://cdn.tailwindcss.com"></script>
        <script
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
      </Head>
      <WebSocketProvider url="ws://localhost:3001/ws">
        <Component {...pageProps} />
      </WebSocketProvider>
    </>
  );
}