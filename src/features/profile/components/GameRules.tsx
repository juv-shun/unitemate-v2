import { useEffect, useState } from "react";

interface Rule {
  icon: string;
  text: string;
  delay: number;
}

const rules: Rule[] = [
  {
    icon: "🏆",
    text: "大会モード テイア蒼空遺跡(カイオーガ)ドラフトピック(3BAN)",
    delay: 0,
  },
  {
    icon: "🔓",
    text: "ポケモン全開放・持ち物最大レベル、全開放・アイテム全開放",
    delay: 0.1,
  },
  {
    icon: "🚫",
    text: "使用禁止ポケモンなし",
    delay: 0.2,
  },
  {
    icon: "🎤",
    text: "VCなし",
    delay: 0.3,
  },
  {
    icon: "🌏",
    text: "推奨サーバー: AS02",
    delay: 0.4,
  },
];

export function GameRules() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      className="relative px-6 pb-6 pt-8"
      style={{
        borderTop: "1px solid rgba(6, 182, 212, 0.2)",
      }}
    >
      {/* Hexagonal grid background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='52' viewBox='0 0 60 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l15 8.66v17.32L30 34.64 15 25.98V8.66L30 0zm0 52l15-8.66V25.98L30 17.32l-15 8.66v17.36L30 52z' fill='%2306b6d4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 52px",
        }}
      />

      {/* Section header */}
      <h2
        className="text-xs font-semibold tracking-[0.2em] mb-4 uppercase"
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--color-accent-cyan)",
          textShadow: "0 0 10px rgba(6, 182, 212, 0.3)",
        }}
      >
        Regulations
      </h2>

      {/* Rules list */}
      <div className="space-y-3">
        {rules.map((rule, index) => (
          <div
            key={index}
            className="group relative"
            style={{
              animation: isVisible
                ? `slideInFromLeft 0.6s ease-out ${rule.delay}s both`
                : "none",
            }}
          >
            {/* Rule card */}
            <div
              className="relative flex items-start gap-4 p-4 rounded-lg transition-all duration-300"
              style={{
                backgroundColor: "rgba(30, 41, 59, 0.6)",
                border: "1px solid rgba(6, 182, 212, 0.2)",
                clipPath:
                  "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
                backdropFilter: "blur(4px)",
              }}
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

              {/* Hexagonal icon container */}
              <div
                className="relative flex-shrink-0 w-12 h-12 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)",
                  clipPath:
                    "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                }}
              >
                {/* Inner hexagon glow */}
                <div
                  className="absolute inset-[2px] flex items-center justify-center"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    clipPath:
                      "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
                  }}
                >
                  <span className="text-lg filter drop-shadow-lg">
                    {rule.icon}
                  </span>
                </div>
              </div>

              {/* Rule text */}
              <p
                className="flex-1 text-sm leading-relaxed pt-2 relative z-10"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-text-primary)",
                }}
              >
                {rule.text}
              </p>

              {/* Corner accent */}
              <div
                className="absolute top-0 right-0 w-2 h-2 opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: "var(--color-accent-cyan)",
                  boxShadow: "0 0 8px var(--color-accent-cyan)",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom accent line */}
      <div className="mt-6 flex items-center gap-2">
        <div
          className="h-[1px] flex-1"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.3) 50%, transparent 100%)",
          }}
        />
        <div
          className="w-1.5 h-1.5 rounded-full"
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

      {/* Keyframes for slide-in animation */}
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
			`}</style>
    </section>
  );
}
