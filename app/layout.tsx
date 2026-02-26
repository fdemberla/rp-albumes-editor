import type { Metadata } from "next";
import { Roboto, Geist_Mono } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Editor de Metadatos de Fotos",
  description: "Editor de Metadatos de Fotos para Fotógrafos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${roboto.variable} ${geistMono.variable} antialiased`}
    >
      <body
        className={`${roboto.variable} ${geistMono.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
