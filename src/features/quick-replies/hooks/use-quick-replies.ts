import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/use-org-query-key';
import {
  quickRepliesService,
  type CreateQuickReplyPayload,
  type UpdateQuickReplyPayload,
  type QuickReply,
} from '../services/quick-replies.service';

const KEY = (orgId: string | null) => ['quick-replies', orgId];

export function useQuickReplies() {
  const orgId = useOrgId();
  return useQuery<QuickReply[]>({
    queryKey: KEY(orgId),
    queryFn: () => quickRepliesService.list(),
    staleTime: 60_000,
  });
}

export function useCreateQuickReply() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: (payload: CreateQuickReplyPayload) =>
      quickRepliesService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(orgId) }),
  });
}

export function useUpdateQuickReply() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateQuickReplyPayload }) =>
      quickRepliesService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(orgId) }),
  });
}

export function useDeleteQuickReply() {
  const qc = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: (id: string) => quickRepliesService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(orgId) }),
  });
}
