import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ComposerAutocomplete } from './composer-autocomplete';

it('não captura Escape de outro painel quando o autocomplete está aberto', () => {
  const inputRef = createRef<HTMLTextAreaElement>();
  const onClose = vi.fn();
  const onPanelEscape = vi.fn();
  render(<>
    <textarea ref={inputRef} aria-label="Mensagem" />
    <ComposerAutocomplete inputRef={inputRef} open query="" items={[]} onSelect={vi.fn()} onClose={onClose} />
    <button onKeyDown={event => { if (event.key === 'Escape' && !event.defaultPrevented) onPanelEscape(); }}>Fechar detalhes</button>
  </>);
  fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
  expect(onPanelEscape).toHaveBeenCalledOnce();
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
  expect(onClose).toHaveBeenCalledOnce();
});
