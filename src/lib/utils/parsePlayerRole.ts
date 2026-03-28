export interface PlayerRole {
  letter: string;
  level?: number;
  color: string;
}

const ROLE_MAP: Record<string, string> = {
  P: 'bg-blue-600',
  G: 'bg-green-600',
  M: 'bg-amber-600',
  C: 'bg-red-600',
};

export function parsePlayerRoles(name: string): PlayerRole[] {
  const match = name.match(/^\[([^\]]+)\] /);
  if (!match) return [];

  const tag = match[1];
  const roles: PlayerRole[] = [];
  let i = 0;

  while (i < tag.length) {
    const letter = tag[i].toUpperCase();
    const color = ROLE_MAP[letter];
    if (!color) {
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

    roles.push({ letter, level, color });
  }

  return roles;
}

export function stripPlayerRoleTag(name: string): string {
  return name.replace(/^\[[^\]]+\] /, '');
}
