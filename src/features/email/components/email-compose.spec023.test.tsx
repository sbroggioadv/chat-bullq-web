import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { EmailCompose } from '@/features/email/components/email-compose';
import { emailService } from '@/features/email/services/email.service';
vi.mock('@/features/email/services/email.service', () => ({ emailService: { compose: vi.fn(async () => ({})) }, MAX_OUTBOUND_ATTACHMENTS: 5, MAX_OUTBOUND_ATTACHMENT_BYTES: 8000000, fileToOutboundAttachment: vi.fn() }));
vi.mock('@/features/email/components/email-rich-editor', () => ({ EmailRichEditor: ({ onChange }: { onChange: (html: string, plain: string) => void }) => <textarea aria-label="Corpo" onChange={e => onChange(e.target.value, e.target.value)} /> }));
it('F8 envia pelo serviço Gmail com conta e destinatário da troca, sem endpoint genérico', async () => {
  const onSent = vi.fn();
  const onClose = vi.fn();
  render(<EmailCompose channelId="gmail-2" initialTo="demonstracao@example.test" onSent={onSent} onClose={onClose} />);
  fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Retorno' } });
  fireEvent.change(screen.getByLabelText('Corpo'), { target: { value: 'Conforme combinado.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  await waitFor(() => expect(emailService.compose).toHaveBeenCalledWith(expect.objectContaining({ channelId: 'gmail-2', to: 'demonstracao@example.test', subject: 'Retorno', body: 'Conforme combinado.' })));
  expect(onSent).toHaveBeenCalledOnce();
  expect(onClose).toHaveBeenCalledOnce();
});
