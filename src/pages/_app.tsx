import type { AppProps } from "next/app";
import { WebSocketProvider } from "@/context/WebsocketContext";
import "../styles/tailwind-base.css"; // Only Tailwind base

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WebSocketProvider url="ws://localhost:3001/ws">
      <Component {...pageProps} />
    </WebSocketProvider>
  );
}