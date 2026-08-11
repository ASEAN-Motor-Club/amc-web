import { afterEach, describe, expect, it } from 'vitest';
import { portal } from './portal';

describe('portal', () => {
  const created: HTMLElement[] = [];

  /** portal's Action type permits void; the implementation always returns an object. */
  const mountedAction = (el: HTMLElement, target?: string | HTMLElement) => {
    const action = portal(el, target);
    if (!action) {
      throw new Error('portal action returned nothing');
    }
    return action;
  };

  const makeHost = (id?: string) => {
    const host = document.createElement('div');
    if (id) host.id = id;
    document.body.appendChild(host);
    created.push(host);
    return host;
  };

  afterEach(() => {
    for (const el of created) {
      el.remove();
    }
    created.length = 0;
  });

  it('appends the element to document.body by default', () => {
    const el = document.createElement('div');
    created.push(el);

    portal(el);

    expect(el.parentElement).toBe(document.body);
  });

  it('appends the element to a given HTMLElement target', () => {
    const host = makeHost();
    const el = document.createElement('div');
    created.push(el);

    portal(el, host);

    expect(el.parentElement).toBe(host);
  });

  it('appends the element to a selector string target', () => {
    const host = makeHost('host');
    const el = document.createElement('div');
    created.push(el);

    portal(el, '#host');

    expect(el.parentElement).toBe(host);
  });

  it('update moves the element to a new target', () => {
    const first = makeHost();
    const second = makeHost();
    const el = document.createElement('div');
    created.push(el);
    const action = mountedAction(el, first);

    expect(el.parentElement).toBe(first);

    action.update?.(second);

    expect(el.parentElement).toBe(second);
    expect(first.contains(el)).toBe(false);
  });

  it('destroy removes the element from the DOM', () => {
    const el = document.createElement('div');
    created.push(el);
    const action = mountedAction(el);

    expect(document.body.contains(el)).toBe(true);

    action.destroy?.();

    expect(document.body.contains(el)).toBe(false);
  });

  it('throws when the selector matches no element', () => {
    const el = document.createElement('div');
    created.push(el);

    expect(() => portal(el, '#does-not-exist')).toThrow(/No element found/);
  });
});
