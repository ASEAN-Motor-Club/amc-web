import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import BoldText from './BoldText.svelte';

describe('BoldText', () => {
  it('should render bold text correctly', () => {
    const output = render(BoldText, { text: 'Gangjung, Gangjung', boldPart: 'Gang' });

    expect(output.baseElement.innerHTML).toContain(
      '<!----><b>Gang</b><!---->jung, <!----><b>Gang</b><!---->jung',
    );
  });

  it('should render bold text correctly with case insensitive', () => {
    const output = render(BoldText, {
      text: 'Gangjung, Gangjung',
      boldPart: 'gANg',
      caseInSensitive: true,
    });

    expect(output.baseElement.innerHTML).toContain(
      '<!----><b>Gang</b><!---->jung, <!----><b>Gang</b><!---->jung',
    );
  });

  it('should not render bold text without boldPart found', () => {
    const output = render(BoldText, {
      text: 'Gangjung, Gangjung',
      boldPart: 'nono',
      caseInSensitive: true,
    });

    expect(output.baseElement.innerHTML).toContain('Gangjung, Gangjung');
  });

  it('should not render bold text without boldPart empty', () => {
    const output = render(BoldText, {
      text: 'Gangjung, Gangjung',
      boldPart: '',
      caseInSensitive: true,
    });

    expect(output.baseElement.innerHTML).toContain('Gangjung, Gangjung');
  });
});
