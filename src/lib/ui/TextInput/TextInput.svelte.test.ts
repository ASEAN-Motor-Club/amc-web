import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import TextInput from './TextInput.svelte';

describe('TextInput', () => {
  it('renders the value and name attribute', async () => {
    await render(TextInput, { name: 'search', value: 'hello' });
    const input = page.getByRole('textbox');
    await expect.element(input).toHaveValue('hello');
    await expect.element(input).toHaveAttribute('name', 'search');
  });

  it('fires onInput on every input', async () => {
    const onInput = vi.fn();
    await render(TextInput, { name: 'q', value: '', onInput });
    const input = page.getByRole('textbox');
    await input.fill('a');
    await input.fill('ab');
    expect(onInput).toHaveBeenCalledTimes(2);
  });

  it('fires onChange when the input loses focus', async () => {
    const onChange = vi.fn();
    await render(TextInput, { name: 'q', value: '', onChange });
    const input = page.getByRole('textbox');
    await input.fill('abc');
    input.element().blur();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('shows a clear button only when a value is present and onClear is set', async () => {
    const onClear = vi.fn();
    const noClear = await render(TextInput, { name: 'q', value: '', onClear });
    expect(noClear.container.querySelector('button')).toBeNull();

    const withValue = await render(TextInput, { name: 'q', value: 'abc', onClear });
    const clearButton = withValue.container.querySelector('button');
    expect(clearButton).not.toBeNull();
    if (clearButton instanceof HTMLButtonElement) {
      clearButton.click();
    }
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('disables the input when disabled', async () => {
    await render(TextInput, { name: 'q', value: '', disabled: true });
    await expect.element(page.getByRole('textbox')).toHaveAttribute('disabled');
  });
});
