import Link from "next/link";

const CARDS = [
  { href: "/matrix", title: "시나리오 매트릭스", desc: "기수×용량 히트맵, 지표 토글, 셀 분해 워터폴" },
  { href: "/products", title: "제품 관리", desc: "연료전지 제품 마스터 CRUD·복제·JSON 가져오기/내보내기" },
  { href: "/assumptions", title: "가정값", desc: "단가·태양광·프로젝트 가정 편집" },
  { href: "/sensitivity", title: "민감도", desc: "열사용비율 슬라이더, 2D 민감도" },
  { href: "/cases", title: "케이스 비교", desc: "최대 4케이스 NPV/IRR/회수기간 비교" },
  { href: "/report", title: "리포트", desc: "가정값+매트릭스+결론, A4 인쇄/PDF" },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold">신재생에너지 경제성 시나리오 검토</h1>
        <p className="mt-2 text-gray-600">
          연료전지 + 태양광 조합의 시나리오별 경제성(연간 순익, 감가상각, Payback,
          전력 자급, 열사용비율 민감도, NPV/IRR)을 검토합니다.
        </p>
      </section>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-lg border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
          >
            <h2 className="font-semibold text-gray-900">{c.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{c.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
