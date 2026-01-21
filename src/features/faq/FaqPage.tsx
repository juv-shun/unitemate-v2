import { useEffect, useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
  delay: number;
}

const faqItems: FaqItem[] = [
  {
    question: "なぜ、このアプリを開発したのですか？",
    answer:
      "2026年1月、ランクマッチにてドラフトピックができなくなってしまいました。\n1月末に予定されているWinter Tournamentやプロリーグに参加する選手たちがドラフトピックによる個人練習をする場がなくなってしまったことから、このような場を設けました。\n私が聞く限り、大会モードによるドラフトピックは、ランクマッチのようにアプリケーションダウンが発生しにくいという情報を得ています。",
    delay: 0,
  },
  {
    question: "いつまで実施しますか？",
    answer:
      "現状では、公式のドラフトピックが修正され次第、サービス停止を考えています。",
    delay: 0.1,
  },
  {
    question:
      "マッチングアルゴリズムを教えて下さい。",
    answer:
      "1分に1回定期バッチが動いており、起動されたタイミングでキューに30人以上、もしくは1分以上待機しているユーザーがいれば、マッチングが行われます。",
    delay: 0.2,
  },
  {
    question:
      "マッチング時、自チーム、および敵チームのプレイヤーのレートを確認したいです。",
    answer:
      "本アプリケーションでは、高レートのプレイヤーを除いて、極力、他人のレートを確認できない仕様にしています。",
    delay: 0.3,
  },
  {
    question: "試合に来なかったプレイヤーを通報しました。どうなるんですか？",
    answer:
      "同じゲームに参加していた複数のプレイヤーから通報が確認されると、システム側で自動的に、60分間マッチングできないペナルティが付与されます。\nスクリーンショットを添付できますが、将来的な対応のためにある機能であり、現状では、運用コストを下げるため、人手による確認はしていません。",
    delay: 0.4,
  },
  {
    question: "出たばかりのポケモンを禁止してほしいです。",
    answer:
      "現在は、ゲーム中のランクマッチ準拠という方針にしています。ただし、この方針は変わる可能性がございます。",
    delay: 0.5,
  },
];

export function FaqPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div
      className="min-h-full flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative"
      style={{
        backgroundColor: "var(--color-base)",
        backgroundImage: `
          linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: "32px 32px",
      }}
    >
      {/* Hexagonal grid background pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='52' viewBox='0 0 60 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l15 8.66v17.32L30 34.64 15 25.98V8.66L30 0zm0 52l15-8.66V25.98L30 17.32l-15 8.66v17.36L30 52z' fill='%2306b6d4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 52px",
        }}
      />

      {/* ページタイトル */}
      <header
        className="w-full max-w-2xl mb-8 relative"
        style={{
          animation: isVisible ? "fadeInDown 0.5s ease-out both" : "none",
        }}
      >
        <div
          className="inline-block relative px-4 py-2"
          style={{
            background:
              "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(236, 72, 153, 0.1) 100%)",
            clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 100%, 12px 100%)",
          }}
        >
          <h1
            className="text-xl font-bold tracking-[0.15em] uppercase"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-accent-cyan)",
              textShadow: "0 0 20px rgba(6, 182, 212, 0.5)",
            }}
          >
            FAQ
          </h1>
        </div>
        {/* Accent line */}
        <div
          className="absolute left-0 bottom-0 h-[1px] w-24"
          style={{
            background:
              "linear-gradient(90deg, var(--color-accent-cyan) 0%, transparent 100%)",
          }}
        />
      </header>

      {/* メインカード */}
      <main
        className="max-w-2xl w-full rounded-xl overflow-hidden relative"
        style={{
          backgroundColor: "var(--color-surface)",
          boxShadow:
            "0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          animation: isVisible ? "slideInFromLeft 0.6s ease-out both" : "none",
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--color-accent-cyan) 50%, transparent 100%)",
          }}
        />

        {/* FAQ Section */}
        <section className="p-6 relative">
          {/* FAQ Items */}
          <div className="space-y-3">
            {faqItems.map((item, index) => {
              const isExpanded = expandedIndex === index;

              return (
                <div
                  key={index}
                  className="group relative"
                  style={{
                    animation: isVisible
                      ? `slideInFromLeft 0.6s ease-out ${item.delay}s both`
                      : "none",
                  }}
                >
                  {/* FAQ card */}
                  <div
                    className="relative rounded-lg transition-all duration-300 overflow-hidden"
                    style={{
                      backgroundColor: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid rgba(6, 182, 212, 0.2)",
                      clipPath:
                        "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    {/* Question button */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(index)}
                      className="w-full flex items-start gap-4 p-4 text-left transition-all duration-300"
                    >
                      {/* Hover glow effect */}
                      <div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{
                          background:
                            "radial-gradient(circle at center, rgba(6, 182, 212, 0.1) 0%, transparent 70%)",
                          boxShadow: "inset 0 0 20px rgba(6, 182, 212, 0.2)",
                        }}
                      />

                      {/* Question icon container */}
                      <div
                        className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)",
                          clipPath:
                            "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                        }}
                      >
                        <div
                          className="absolute inset-[2px] flex items-center justify-center"
                          style={{
                            backgroundColor: "var(--color-surface)",
                            clipPath:
                              "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                          }}
                        >
                          <span
                            className="text-sm font-bold"
                            style={{
                              fontFamily: "var(--font-display)",
                              color: "var(--color-accent-cyan)",
                            }}
                          >
                            Q
                          </span>
                        </div>
                      </div>

                      {/* Question text */}
                      <div className="flex-1 min-w-0 pt-1.5">
                        <p
                          className="text-sm leading-relaxed relative z-10"
                          style={{
                            fontFamily: "var(--font-body)",
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {item.question}
                        </p>
                      </div>

                      {/* Expand/collapse icon */}
                      <div
                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center transition-transform duration-300 mt-1.5"
                        style={{
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                          color: "var(--color-accent-cyan)",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>

                      {/* Corner accent */}
                      <div
                        className="absolute top-0 right-0 w-2 h-2 opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: "var(--color-accent-cyan)",
                          boxShadow: "0 0 8px var(--color-accent-cyan)",
                        }}
                      />
                    </button>

                    {/* Answer section */}
                    <div
                      className="overflow-hidden transition-all duration-300"
                      style={{
                        maxHeight: isExpanded ? "500px" : "0",
                        opacity: isExpanded ? 1 : 0,
                      }}
                    >
                      <div
                        className="px-4 pb-4 pt-0"
                        style={{
                          borderTop: "1px solid rgba(6, 182, 212, 0.15)",
                        }}
                      >
                        <div className="flex gap-4 pt-4">
                          {/* Answer icon */}
                          <div
                            className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center"
                            style={{
                              background:
                                "linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)",
                              clipPath:
                                "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                            }}
                          >
                            <div
                              className="absolute inset-[2px] flex items-center justify-center"
                              style={{
                                backgroundColor: "var(--color-surface)",
                                clipPath:
                                  "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                              }}
                            >
                              <span
                                className="text-sm font-bold"
                                style={{
                                  fontFamily: "var(--font-display)",
                                  color: "var(--color-accent-pink)",
                                }}
                              >
                                A
                              </span>
                            </div>
                          </div>

                          {/* Answer text */}
                          <p
                            className="flex-1 text-sm leading-relaxed whitespace-pre-line pt-1.5"
                            style={{
                              fontFamily: "var(--font-body)",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom accent line */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2">
            <div
              className="h-[1px] flex-1"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.3) 50%, transparent 100%)",
              }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{
                backgroundColor: "var(--color-accent-cyan)",
                boxShadow: "0 0 8px var(--color-accent-cyan)",
              }}
            />
            <div
              className="h-[1px] flex-1"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.3) 50%, transparent 100%)",
              }}
            />
          </div>
        </div>
      </main>

      {/* Keyframes */}
      <style>{`
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
