import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useConversationAiAllowedInGroup(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (value: boolean) => {
      await api.patch(`/conversations/${conversationId}`, { aiAllowedInGroup: value });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversation', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
