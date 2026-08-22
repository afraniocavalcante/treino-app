import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Treino A/B",
  description: "App de treino A/B com progressão de carga",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Treino A/B",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101024",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
