import { useMutation } from '@tanstack/react-query';
import { inboxService } from '../services/inbox.service';

export type ForwardResult = {
  queued: string[];
  rejected: Array<{ conversationId: string; reason: string }>;
};

export function useForwardMessage() {
  return useMutation<
    ForwardResult,
    Error,
    { messageId: string; destinationConversationIds: string[] }
  >({
    mutationFn: (payload) => inboxService.forwardMessage(payload),
  });
}
