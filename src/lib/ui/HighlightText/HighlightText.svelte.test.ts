import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import HighlightText from './HighlightText.svelte';

describe('HighlightText', () => {
  it('should render highlight text correctly', () => {
    const output = render(HighlightText, { text: 'Gangjung, Gangjung', highlight: 'Gang' });

    expect(output.baseElement.innerHTML.replaceAll('<!---->', '')).toContain(
      '<b>Gang</b>jung, <b>Gang</b>jung',
    );
  });

  it('should render highlight text correctly with edited tag', () => {
    const output = render(HighlightText, {
      text: 'Gangjung, Gangjung',
      highlight: 'Gang',
      tag: 'i',
    });

    expect(output.baseElement.innerHTML.replaceAll('<!---->', '')).toContain(
      '<i>Gang</i>jung, <i>Gang</i>jung',
    );
  });

  it('should render highlight text correctly with edited class', () => {
    const output = render(HighlightText, {
      text: 'Gangjung, Gangjung',
      highlight: 'Gang',
      highlightClass: 'text-red-500',
    });

    expect(output.baseElement.innerHTML.replaceAll('<!---->', '')).toContain(
      '<b class="text-red-500">Gang</b>jung, <b class="text-red-500">Gang</b>jung',
    );
  });

  it('should render highlight text correctly with case insensitive', () => {
    const output = render(HighlightText, {
      text: 'Gangjung, Gangjung',
      highlight: 'gANg',
      caseInSensitive: true,
    });

    expect(output.baseElement.innerHTML.replaceAll('<!---->', '')).toContain(
      '<b>Gang</b>jung, <b>Gang</b>jung</span>',
    );
  });

  it('should not render highlight text without highlight found', () => {
    const output = render(HighlightText, {
      text: 'Gangjung, Gangjung',
      highlight: 'nono',
      caseInSensitive: true,
    });

    expect(output.baseElement.innerHTML).toContain('Gangjung, Gangjung');
  });

  it('should not render highlight when highlight string is empty', () => {
    const output = render(HighlightText, {
      text: 'Gangjung, Gangjung',
      highlight: '',
      caseInSensitive: true,
    });

    expect(output.baseElement.innerHTML).toContain('Gangjung, Gangjung');
  });
});
