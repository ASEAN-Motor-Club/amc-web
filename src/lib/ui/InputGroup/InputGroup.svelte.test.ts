import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import InputGroupHarness from './InputGroup.test.svelte';

describe('InputGroup', () => {
  it('renders the label text', async () => {
    const output = await render(InputGroupHarness);
    const label = output.container.querySelector('label');
    expect(label).not.toBeNull();
    expect(label?.textContent).toBe('Volume');
  });

  it('wires the label for attribute to the child input id', async () => {
    const output = await render(InputGroupHarness);
    const label = output.container.querySelector('label');
    const input = output.container.querySelector('input');
    expect(input?.id).toMatch(/^input-group-/);
    expect(label?.getAttribute('for')).toBe(input?.id);
  });

  it('renders the appendLabel snippet', async () => {
    const output = await render(InputGroupHarness, {
      appendLabel: createRawSnippet(() => ({ render: () => 'APP' })),
    });
    expect(output.container.textContent).toContain('APP');
  });

  it('focusIndex targets the second child input', async () => {
    const output = await render(InputGroupHarness, { twoChildren: true, focusIndex: 1 });
    const inputs = output.container.querySelectorAll('input');
    expect(inputs).toHaveLength(2);
    const label = output.container.querySelector('label');
    expect(label?.getAttribute('for')).toBe(inputs[1].id);
  });
});
