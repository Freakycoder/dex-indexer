import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body style={{ 
        margin: 0, 
        padding: 0, 
        backgroundColor: '#0b0e11',
        color: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}