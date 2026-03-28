export interface PlayerRole {
  letter: string;
  label: string;
  level?: number;
  color: string;
}

const ROLE_MAP: Record<string, { label: string; color: string }> = {
  P: { label: 'Police', color: 'bg-blue-600' },
  G: { label: 'Gov Worker', color: 'bg-green-600' },
  M: { label: 'Modded', color: 'bg-amber-600' },
  C: { label: 'Criminal', color: 'bg-red-600' },
};

export function parsePlayerRoles(name: string): PlayerRole[] {
  const match = name.match(/^\[([^\]]+)\]/);
  if (!match) return [];

  const tag = match[1];
  const roles: PlayerRole[] = [];
  let i = 0;

  while (i < tag.length) {
    const letter = tag[i].toUpperCase();
    const meta = ROLE_MAP[letter];
    if (!meta) {
      i++;
      continue;
    }

    let level: number | undefined;
    const after = tag.slice(i + 1);
    const levelMatch = after.match(/^(\d+)/);
    if (levelMatch) {
      level = parseInt(levelMatch[1], 10);
      i += 1 + levelMatch[1].length;
    } else {
      i += 1;
    }

    roles.push({ letter, label: meta.label, level, color: meta.color });
  }

  return roles;
}
