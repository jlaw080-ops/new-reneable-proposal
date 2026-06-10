import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "신재생에너지 경제성 검토",
  description: "연료전지 + 태양광 시나리오별 경제성 검토 웹앱",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen">
          <Nav />
          <main className="mx-auto max-w-[1400px] px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
