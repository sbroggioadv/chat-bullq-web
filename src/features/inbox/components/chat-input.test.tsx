import { render, screen } from '@testing-library/react';
import { ChatInput } from './chat-input';

const draft = vi.hoisted(() => ({ text: '', restoration: 0 }));
vi.mock('@/features/inbox/hooks/use-conversation-draft', () => ({ useConversationDraft: () => ({ ...draft, setText: vi.fn(), capture: vi.fn(), sent: vi.fn() }) }));
vi.mock('@/stores/auth-store', () => ({ useAuthStore: (selector: (state: unknown) => unknown) => selector({ activeOrgId: 'o', user: { id: 'u' } }) }));
vi.mock('@/features/inbox/hooks/use-audio-recorder', () => ({ useAudioRecorder: () => ({ state: 'idle' }) }));
vi.mock('@/features/quick-replies/hooks/use-quick-replies', () => ({ useQuickReplies: () => ({ data: [] }) }));
vi.mock('@/features/inbox/hooks/use-quick-reply-trigger', () => ({ useQuickReplyTrigger: () => ({ close: vi.fn(), recompute: vi.fn(), open: false, query: '' }) }));
vi.mock('@/features/inbox/components/share-contact-dialog', () => ({ ShareContactDialog: () => null }));

it('ajusta a altura somente quando restaura texto', () => {
  draft.text = '';
  draft.restoration = 0;
  const { rerender } = render(<ChatInput conversationId="a" onSend={vi.fn()} />);
  const field = screen.getByRole('textbox') as HTMLTextAreaElement;
  Object.defineProperty(field, 'scrollHeight', { configurable: true, value: 90 });
  draft.restoration++;
  rerender(<ChatInput conversationId="b" onSend={vi.fn()} />);
  expect(field.style.height).toBe('auto');
  draft.text = 'uma\nduas\ntrês';
  draft.restoration++;
  rerender(<ChatInput conversationId="c" onSend={vi.fn()} />);
  expect(field.style.height).toBe('90px');
});
