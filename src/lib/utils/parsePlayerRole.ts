export interface PlayerRole {
  letter: string;
  level?: number;
}

const VALID_ROLES = new Set(['P', 'G', 'M', 'C']);

export function parsePlayerRoles(name: string): PlayerRole[] {
  const match = /^\[([^\]]+)\] /.exec(name);
  if (!match) return [];

  const tag = match[1];
  const roles: PlayerRole[] = [];
  let i = 0;

  while (i < tag.length) {
    const letter = tag[i].toUpperCase();
    if (!VALID_ROLES.has(letter)) {
      i++;
      continue;
    }

    let level: number | undefined;
    const after = tag.slice(i + 1);
    const levelMatch = /^(\d+)/.exec(after);
    if (levelMatch) {
      level = parseInt(levelMatch[1], 10);
      i += 1 + levelMatch[1].length;
    } else {
      i += 1;
    }

    roles.push({ letter, level });
  }

  return roles;
}

export function stripPlayerRoleTag(name: string): string {
  return name.replace(/^\[[^\]]+\] /, '');
}
