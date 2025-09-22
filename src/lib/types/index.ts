declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace App {
    export interface PageState {
      msgModal?: boolean;
      navbarMenuOpen?: boolean;
      settingMenuOpen?: boolean;
    }
  }
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type EmptyObject = Record<PropertyKey, never>;
