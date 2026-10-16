import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import { StoreProvider } from "@/context/StoreContext";
import { PrintDialogModal } from "@/components/PrintDialogModal";

export const metadata: Metadata = {
  title: "Kasir-E - POS Cepat & Sederhana",
  description: "Aplikasi Kasir POS Cepat & Sederhana untuk Rumah Makan & UMKM",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kasir-E",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
      </head>
      <body>
        <LanguageProvider>
          <AuthProvider>
            <StoreProvider>
              {children}
              <PrintDialogModal />
            </StoreProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
