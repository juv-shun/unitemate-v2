interface SearchingIndicatorProps {
  size?: number;
}

export function SearchingIndicator({ size = 64 }: SearchingIndicatorProps) {
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Searching for match"
    >
      {/* Outer rotating ring */}
      <div
        className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
        style={{
          borderTopColor: "var(--color-accent-cyan)",
          borderRightColor: "var(--color-accent-cyan)",
          animationDuration: "1.5s",
        }}
      />

      {/* Middle pulsing ring */}
      <div
        className="absolute rounded-full animate-pulse"
        style={{
          inset: size * 0.125,
          border: "1px solid var(--color-accent-cyan)",
          opacity: 0.5,
        }}
      />

      {/* Inner static dot */}
      <div
        className="absolute rounded-full"
        style={{
          inset: size * 0.375,
          backgroundColor: "var(--color-accent-cyan)",
          boxShadow: "0 0 12px var(--color-accent-cyan)",
        }}
      />
    </div>
  );
}
