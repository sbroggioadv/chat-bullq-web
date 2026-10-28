"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertOctagon,
  Archive,
  ArrowLeft,
  Forward,
  Loader2,
  MailOpen,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Reply,
  ReplyAll,
  Send,
  Star,
  Tag,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { EmailThreadDetail } from "@/features/email/services/email.service";
import {
  emailService,
  fileToOutboundAttachment,
  MAX_OUTBOUND_ATTACHMENTS,
  MAX_OUTBOUND_ATTACHMENT_BYTES,
} from "@/features/email/services/email.service";
import { formatLongDate } from "@/features/email/lib/format";
import { EmailSafeBody } from "@/features/email/components/email-safe-body";
import { EmailRichEditor } from "@/features/email/components/email-rich-editor";
import {
  loadRecentRecipients,
  rememberRecipients,
  suggestRecipients,
} from "@/features/email/lib/recent-recipients";
import { inboxService } from "@/features/inbox/services/inbox.service";

type ComposeMode = "reply" | "replyAll" | "forward" | null;

interface EmailThreadViewProps {
  detail: EmailThreadDetail | undefined;
  channelId: string | undefined;
  threadSelected: boolean;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onBack: () => void;
  onSent: () => void;
  onReauth?: () => void;
}

export function EmailThreadView({
  detail,
  channelId,
  threadSelected,
  loading,
  error,
  onRetry,
  onBack,
  onSent,
  onReauth,
}: EmailThreadViewProps) {
  const [mode, setMode] = useState<ComposeMode>(null);
  const [body, setBody] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [forwardTo, setForwardTo] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [modifying, setModifying] = useState(false);
  const [reauthHint, setReauthHint] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [starred, setStarred] = useState(!!detail?.starred);
  const [spam, setSpam] = useState(!!detail?.spam);

  const inboxLinkQ = useQuery({
    queryKey: ["conversation-by-external", channelId, detail?.id],
    queryFn: () => inboxService.lookupByExternal(channelId!, detail!.id),
    enabled: !!channelId && !!detail?.id,
    staleTime: 60_000,
    retry: false,
  });
  const inboxHref = inboxLinkQ.data?.id
    ? `/inbox?conversationId=${encodeURIComponent(inboxLinkQ.data.id)}`
    : null;

  const [activeLabels, setActiveLabels] = useState<string[]>(
    detail?.labelIds || [],
  );
  const [labelMenuOpen, setLabelMenuOpen] = useState(false);

  useEffect(() => {
    setStarred(!!detail?.starred);
    setSpam(!!detail?.spam);
    setActiveLabels(detail?.labelIds || []);
  }, [detail?.id, detail?.starred, detail?.spam, detail?.labelIds]);

  const foldersQ = useQuery({
    queryKey: ["email-folders", channelId],
    queryFn: () => emailService.folders(channelId!),
    enabled: !!channelId,
    staleTime: 60_000,
  });
  const userLabels = (foldersQ.data?.folders || []).filter(
    (f) => f.kind === "user",
  );

  useEffect(() => {
    setRecent(loadRecentRecipients());
  }, []);

  const defaultTo = useMemo(() => {
    if (!detail?.messages?.length) return "";
    const inbound = [...detail.messages].reverse().find((m) => !m.outbound);
    return inbound?.from.email || "";
  }, [detail]);

  const replyAllPreview = useMemo(() => {
    if (!detail?.messages?.length) return { to: "", cc: "" };
    const inbound = [...detail.messages].reverse().find((m) => !m.outbound);
    if (!inbound) return { to: defaultTo, cc: "" };
    const my = (detail.myEmail || "").toLowerCase();
    const to = inbound.from.email || defaultTo;
    const pool = `${inbound.to || ""}, ${inbound.cc || ""}`
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const m = s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        return m ? m[0].toLowerCase() : "";
      })
      .filter(Boolean);
    const exclude = new Set([my, to.toLowerCase()].filter(Boolean));
    const seen = new Set<string>();
    const cc = pool
      .filter((e) => {
        if (exclude.has(e) || seen.has(e)) return false;
        seen.add(e);
        return true;
      })
      .join(", ");
    return { to, cc };
  }, [detail, defaultTo]);

  const suggestions = suggestRecipients(forwardTo);

  if (!threadSelected) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--bq-surface)] px-6 text-center ">
        <MailOpen className="h-10 w-10 text-[var(--bq-t3)] " />
        <p className="text-sm text-[var(--bq-t3)] ">
          Selecione um e-mail para ler
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full w-full space-y-3 bg-[var(--bq-surface)] p-6 ">
        <div className="h-6 w-2/3 animate-pulse rounded-md bg-[var(--bq-raised)] " />
        <div className="h-28 animate-pulse rounded-lg bg-[var(--bq-raised)] " />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--bq-surface)] px-6 text-center ">
        <p className="text-sm text-[var(--bq-t2)] ">
          Não foi possível carregar este e-mail.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-[var(--bq-hair)] px-2.5 py-1.5 text-xs text-[var(--bq-t2)] hover:bg-[var(--bq-raised)]   "
        >
          <RefreshCw className="h-3 w-3" /> Tentar de novo
        </button>
      </div>
    );
  }

  const openCompose = (m: ComposeMode) => {
    setMode(m);
    setBody("");
    setBodyHtml("");
    setForwardTo("");
    setPendingFiles([]);
    setReauthHint(false);
  };

  const onForwardToChange = (value: string) => {
    setForwardTo(value);
    // Salva automaticamente e-mails completos já digitados (antes da vírgula)
    const chunks = value.split(/[,;]/);
    const completed = chunks.slice(0, -1).join(",");
    if (completed.trim()) {
      setRecent(rememberRecipients(completed));
    }
  };

  const pickSuggestion = (email: string) => {
    const parts = forwardTo.split(/[,;]/);
    parts[parts.length - 1] = parts.length > 1 ? ` ${email}` : email;
    const next = parts
      .map((p) => p.trim())
      .filter(Boolean)
      .join(", ");
    const withComma = next.endsWith(email) ? `${next}, ` : next;
    setForwardTo(withComma);
    setRecent(rememberRecipients(email));
  };

  const handleArchive = async () => {
    if (!channelId || !detail?.id) return;
    setArchiving(true);
    try {
      await emailService.archive({ channelId, threadId: detail.id });
      toast.success("Arquivado", {
        action: {
          label: "Desfazer",
          onClick: async () => {
            try {
              await emailService.modify({
                channelId,
                threadId: detail.id,
                addLabelIds: ["INBOX"],
              });
              onSent();
              toast.success("E-mail voltou à Caixa de entrada");
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Falha ao desfazer",
              );
            }
          },
        },
      });
      onSent();
      onBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao arquivar");
    } finally {
      setArchiving(false);
    }
  };

  const runModify = async (
    action: "star" | "unstar" | "spam" | "unspam",
    okMsg: string,
  ) => {
    if (!channelId || !detail?.id) return;
    setModifying(true);
    try {
      await emailService.modify({ channelId, threadId: detail.id, action });
      if (action === "star") setStarred(true);
      if (action === "unstar") setStarred(false);
      if (action === "spam") {
        setSpam(true);
        toast.success(okMsg);
        onSent();
        onBack();
        return;
      }
      if (action === "unspam") setSpam(false);
      toast.success(okMsg);
      onSent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar");
    } finally {
      setModifying(false);
    }
  };

  const addPendingFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    setPendingFiles((prev) => {
      const next = [...prev];
      for (const f of incoming) {
        if (next.length >= MAX_OUTBOUND_ATTACHMENTS) {
          toast.error(`No máximo ${MAX_OUTBOUND_ATTACHMENTS} anexos`);
          break;
        }
        if (f.size > MAX_OUTBOUND_ATTACHMENT_BYTES) {
          toast.error(`"${f.name}" excede 8 MB`);
          continue;
        }
        if (next.some((p) => p.name === f.name && p.size === f.size)) continue;
        next.push(f);
      }
      return next;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!channelId || !detail.id || !mode) return;
    if ((mode === "reply" || mode === "replyAll") && !body.trim()) {
      toast.error("Escreva a resposta antes de enviar");
      return;
    }
    if (mode === "forward" && !forwardTo.trim()) {
      toast.error("Informe o destinatário para encaminhar");
      return;
    }
    setSending(true);
    try {
      const attachments =
        pendingFiles.length > 0
          ? await Promise.all(
              pendingFiles.map((f) => fileToOutboundAttachment(f)),
            )
          : undefined;
      if (mode === "reply" || mode === "replyAll") {
        await emailService.reply({
          channelId,
          threadId: detail.id,
          body: body.trim(),
          bodyHtml: bodyHtml.trim() || undefined,
          to: mode === "reply" ? defaultTo || undefined : undefined,
          replyAll: mode === "replyAll",
          attachments,
        });
        toast.success(
          mode === "replyAll" ? "Resposta a todos enviada" : "Resposta enviada",
        );
      } else {
        const saved = rememberRecipients(forwardTo);
        setRecent(saved);
        await emailService.forward({
          channelId,
          threadId: detail.id,
          to: forwardTo.trim(),
          body: body.trim() || undefined,
          bodyHtml: bodyHtml.trim() || undefined,
          attachments,
        });
        toast.success("E-mail encaminhado");
      }
      setBody("");
      setBodyHtml("");
      setForwardTo("");
      setPendingFiles([]);
      setMode(null);
      setReauthHint(false);
      onSent();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao enviar";
      if (
        /leitura|reconect|gmail\.send|gmail\.modify|permiss|scope|403|autoriz/i.test(
          msg,
        )
      ) {
        setReauthHint(true);
      }
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const composeTitle =
    mode === "reply"
      ? `Responder${defaultTo ? ` para ${defaultTo}` : ""}`
      : mode === "replyAll"
        ? `Responder a todos${replyAllPreview.to ? ` · To ${replyAllPreview.to}` : ""}${
            replyAllPreview.cc ? ` · Cc ${replyAllPreview.cc}` : ""
          }`
        : "Encaminhar e-mail";

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-[var(--bq-surface)] ">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--bq-hair)] bg-[var(--bq-surface)] px-5 py-3.5  ">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar para a lista"
          className="-ml-2 flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--bq-t3)] hover:bg-[var(--bq-raised)] md:hidden  "
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="min-w-0 basis-full truncate text-base font-semibold text-[var(--bq-t1)] ">
          {detail.subject}
        </h1>
        {inboxHref && (
          <Link
            href={inboxHref}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]    "
            title="Abrir a conversa correspondente no atendimento"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Atendimento</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => openCompose(mode === "reply" ? null : "reply")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Reply className="h-3.5 w-3.5" />
          Responder
        </button>
        <button
          type="button"
          onClick={() => openCompose(mode === "replyAll" ? null : "replyAll")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]    "
          title="Inclui todos do To/Cc originais"
        >
          <ReplyAll className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Responder a todos</span>
          <span className="sm:hidden">Todos</span>
        </button>
        <button
          type="button"
          onClick={() => openCompose(mode === "forward" ? null : "forward")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]    "
        >
          <Forward className="h-3.5 w-3.5" />
          Encaminhar
        </button>
        <button
          type="button"
          onClick={() =>
            runModify(
              starred ? "unstar" : "star",
              starred ? "Estrela removida" : "Com estrela",
            )
          }
          disabled={modifying}
          title={starred ? "Remover estrela" : "Marcar com estrela"}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 ${
            starred
              ? "border-[var(--bq-warn-soft)] bg-[var(--bq-warn-soft)] text-[var(--bq-warn)]   "
              : "border-[var(--bq-hair)] bg-[var(--bq-surface)] text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]    "
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${starred ? "fill-current" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() =>
            runModify(
              spam ? "unspam" : "spam",
              spam ? "Removido do spam" : "Movido para spam",
            )
          }
          disabled={modifying}
          title={spam ? "Tirar do spam" : "Marcar como spam"}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 ${
            spam
              ? "border-[var(--bq-err-soft)] bg-[var(--bq-err-soft)] text-[var(--bq-err)]   "
              : "border-[var(--bq-hair)] bg-[var(--bq-surface)] text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]    "
          }`}
        >
          <AlertOctagon className="h-3.5 w-3.5" />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setLabelMenuOpen((v) => !v)}
            disabled={modifying || !userLabels.length}
            title="Aplicar marcador"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--bq-t2)] hover:bg-[var(--bq-surface)] disabled:opacity-50    "
          >
            <Tag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Marcador</span>
          </button>
          {labelMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setLabelMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-30 mt-1 max-h-56 w-52 overflow-y-auto rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-surface)] py-1 shadow-lg  ">
                {userLabels.map((l) => {
                  const on = activeLabels.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]  "
                      onClick={async () => {
                        if (!channelId || !detail?.id) return;
                        setModifying(true);
                        try {
                          await emailService.modify({
                            channelId,
                            threadId: detail.id,
                            addLabelIds: on ? undefined : [l.id],
                            removeLabelIds: on ? [l.id] : undefined,
                          });
                          setActiveLabels((prev) =>
                            on
                              ? prev.filter((x) => x !== l.id)
                              : [...prev, l.id],
                          );
                          toast.success(
                            on ? `Removido: ${l.name}` : `Marcador: ${l.name}`,
                          );
                          onSent();
                        } catch (err) {
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Falha no marcador",
                          );
                        } finally {
                          setModifying(false);
                          setLabelMenuOpen(false);
                        }
                      }}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          on ? "bg-primary" : "bg-[var(--bq-raised)] "
                        }`}
                      />
                      <span className="truncate">{l.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={handleArchive}
          disabled={archiving}
          title="Arquivar (remove da Caixa de entrada)"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--bq-t2)] hover:bg-[var(--bq-surface)] disabled:opacity-50    "
        >
          {archiving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Archive className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Arquivar</span>
        </button>
      </div>

      {!!userLabels.length &&
        activeLabels.some((id) => userLabels.some((u) => u.id === id)) && (
          <div className="flex flex-wrap gap-1 border-b border-[var(--bq-hair)] px-5 py-1.5 ">
            {userLabels
              .filter((l) => activeLabels.includes(l.id))
              .map((l) => (
                <span
                  key={l.id}
                  className="rounded-full bg-[var(--bq-raised)] px-2 py-0.5 text-[10px] font-medium text-[var(--bq-t2)]  "
                >
                  {l.name}
                </span>
              ))}
          </div>
        )}

      {reauthHint && (
        <div className="border-b border-[var(--bq-warn-soft)] bg-[var(--bq-warn-soft)] px-5 py-2.5 text-xs text-[var(--bq-warn)]   ">
          O Google ainda não autorizou envio nesta conexão.{" "}
          <button
            type="button"
            onClick={onReauth}
            className="font-semibold underline underline-offset-2"
          >
            Reconectar Google uma vez
          </button>{" "}
          (no canal existente — não cria caixa nova) e marque o acesso ao Gmail.
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {detail.messages.map((m) => {
          const fromLabel = m.from.name || m.from.email || "Desconhecido";
          return (
            <article
              key={m.id}
              className={`rounded-lg border bg-[var(--bq-surface)] p-4  ${
                m.outbound ? "border-primary/30" : "border-[var(--bq-hair)] "
              }`}
            >
              <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[13px] font-semibold text-[var(--bq-t1)] ">
                  {fromLabel}
                </span>
                {m.from.name && m.from.email && (
                  <span className="truncate text-xs text-[var(--bq-t3)] ">
                    &lt;{m.from.email}&gt;
                  </span>
                )}
                <span className="ml-auto shrink-0 text-[11px] text-[var(--bq-t3)] ">
                  {formatLongDate(m.date)}
                </span>
              </header>
              {m.to && (
                <p className="mt-0.5 truncate text-[11px] text-[var(--bq-t3)] ">
                  para {m.to}
                </p>
              )}
              {m.cc ? (
                <p className="truncate text-[11px] text-[var(--bq-t3)] ">
                  cc {m.cc}
                </p>
              ) : null}
              <div className="mt-3">
                <EmailSafeBody
                  body={m.body}
                  bodyHtml={m.bodyHtml}
                  snippet={m.snippet}
                />
              </div>
              {!!m.attachments?.length && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.attachments.map((a) => (
                    <button
                      key={a.attachmentId}
                      type="button"
                      className="inline-flex max-w-full items-center gap-1 rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-2 py-1 text-[11px] text-[var(--bq-t2)] hover:bg-[var(--bq-raised)]    "
                      title={`Baixar ${a.filename}`}
                      onClick={async () => {
                        if (!channelId) return;
                        try {
                          const blob = await emailService.downloadAttachment({
                            channelId,
                            messageId: a.messageId || m.id,
                            attachmentId: a.attachmentId,
                            filename: a.filename,
                            mimeType: a.mimeType,
                          });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = a.filename || "anexo";
                          link.click();
                          URL.revokeObjectURL(url);
                        } catch (err) {
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Falha ao baixar anexo",
                          );
                        }
                      }}
                    >
                      <Paperclip className="h-3 w-3 shrink-0" />
                      <span className="truncate">{a.filename}</span>
                      {a.size > 0 && (
                        <span className="shrink-0 text-[var(--bq-t3)]">
                          {a.size > 1024 * 1024
                            ? `${(a.size / (1024 * 1024)).toFixed(1)} MB`
                            : `${Math.max(1, Math.round(a.size / 1024))} KB`}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {mode && (
        <div className="border-t border-[var(--bq-hair)] bg-[var(--bq-surface)] p-4  ">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--bq-t2)] ">
              {composeTitle}
            </p>
            <button
              type="button"
              onClick={() => {
                setMode(null);
                setPendingFiles([]);
              }}
              className="shrink-0 text-xs text-[var(--bq-t3)] hover:text-[var(--bq-t2)] "
            >
              Cancelar
            </button>
          </div>

          {mode === "forward" && (
            <div className="relative mb-2">
              <input
                type="text"
                value={forwardTo}
                onChange={(e) => onForwardToChange(e.target.value)}
                onBlur={() => setRecent(rememberRecipients(forwardTo))}
                list="email-recent-recipients"
                autoComplete="off"
                placeholder="Para: email@cliente.com (vírgula para vários)"
                className="w-full rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-3 py-2 text-sm text-[var(--bq-t1)] outline-none focus:border-primary focus:ring-2 focus:ring-primary/30   "
              />
              <datalist id="email-recent-recipients">
                {recent.map((e) => (
                  <option key={e} value={e} />
                ))}
              </datalist>
              {suggestions.length > 0 && forwardTo.trim() && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-[var(--bq-hair)] bg-[var(--bq-surface)] shadow-lg  ">
                  {suggestions.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        pickSuggestion(e);
                      }}
                      className="block w-full truncate px-3 py-1.5 text-left text-xs text-[var(--bq-t2)] hover:bg-[var(--bq-surface)]  "
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
              {recent.length > 0 && !forwardTo.trim() && (
                <p className="mt-1 text-[11px] text-[var(--bq-t3)]">
                  Destinatários recentes salvos neste navegador
                </p>
              )}
            </div>
          )}

          <EmailRichEditor
            valueHtml={bodyHtml}
            onChange={(html, plain) => {
              setBodyHtml(html);
              setBody(plain);
            }}
            rows={mode === "forward" ? 3 : 5}
            disabled={sending}
            placeholder={
              mode === "forward"
                ? "Nota opcional acima da mensagem encaminhada…"
                : "Escreva sua resposta…"
            }
          />
          {pendingFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pendingFiles.map((f, i) => (
                <span
                  key={`${f.name}-${f.size}-${i}`}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-2 py-1 text-[11px] text-[var(--bq-t2)]   "
                >
                  <Paperclip className="h-3 w-3 shrink-0" />
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    aria-label={`Remover ${f.name}`}
                    onClick={() =>
                      setPendingFiles((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                    className="ml-0.5 rounded p-0.5 text-[var(--bq-t3)] hover:bg-[var(--bq-raised)] hover:text-[var(--bq-t2)]  "
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => addPendingFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={
                  sending || pendingFiles.length >= MAX_OUTBOUND_ATTACHMENTS
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--bq-hair)] bg-[var(--bq-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--bq-t2)] hover:bg-[var(--bq-surface)] disabled:opacity-50    "
                title="Anexar arquivos (máx. 5 × 8 MB)"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Anexar
              </button>
              {pendingFiles.length > 0 && (
                <span className="text-[11px] text-[var(--bq-t3)]">
                  {pendingFiles.length}/{MAX_OUTBOUND_ATTACHMENTS}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={
                sending ||
                (mode === "forward" ? !forwardTo.trim() : !body.trim())
              }
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {mode === "forward"
                ? "Encaminhar"
                : mode === "replyAll"
                  ? "Enviar a todos"
                  : "Enviar resposta"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
