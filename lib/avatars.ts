export type GreekAvatar = {
  key: string;
  name: string;
  symbol: string;
  color: string;
};

export const GREEK_AVATARS: GreekAvatar[] = [
  { key: "zeus", name: "Zeus", symbol: "⚡", color: "#d8b44b" },
  { key: "hera", name: "Hera", symbol: "👑", color: "#f6e2a8" },
  { key: "ares", name: "Ares", symbol: "🛡", color: "#c86a4f" },
  { key: "athena", name: "Athena", symbol: "🦉", color: "#7da2d6" },
  { key: "apollo", name: "Apollo", symbol: "☀", color: "#edbf61" },
  { key: "artemis", name: "Artemis", symbol: "🌙", color: "#7bc0c7" },
  { key: "poseidon", name: "Poseidon", symbol: "🔱", color: "#4e89b7" },
  { key: "hermes", name: "Hermes", symbol: "🪽", color: "#8eb28f" }
];

export function getAvatar(key?: string | null) {
  return (
    GREEK_AVATARS.find((avatar) => avatar.key === key) ??
    GREEK_AVATARS[0]
  );
}
