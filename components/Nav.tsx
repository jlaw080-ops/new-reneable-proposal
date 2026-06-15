"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string }[] = [
  { href: "/matrix", label: "시나리오 매트릭스" },
  { href: "/products", label: "제품 관리" },
  { href: "/usage", label: "용도 관리" },
  { href: "/assumptions", label: "가정값" },
  { href: "/sensitivity", label: "민감도" },
  { href: "/cases", label: "케이스 비교" },
  { href: "/report", label: "리포트" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="no-print border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-4">
        <Link href="/" className="mr-4 py-3 text-sm font-bold text-gray-900">
          신재생 경제성 검토
        </Link>
        <nav className="flex flex-wrap gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
