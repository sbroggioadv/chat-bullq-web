"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button, MacWindow } from "@/components/ui/foundation";
import { EmailRichEditor } from "@/features/email/components/email-rich-editor";
import {
  emailService,
  fileToOutboundAttachment,
  MAX_OUTBOUND_ATTACHMENTS,
  MAX_OUTBOUND_ATTACHMENT_BYTES,
} from "@/features/email/services/email.service";
import {
  rememberRecipients,
  loadRecentRecipients,
} from "@/features/email/lib/recent-recipients";

export function EmailCompose({
  channelId,
  onClose,
  onSent,
}: {
  channelId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [html, setHtml] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [recent] = useState(loadRecentRecipients);
  const fieldClass =
    "w-full rounded-lg border border-[var(--bq-hair-strong)] bg-[var(--bq-surface)] px-3 py-2 text-[13px] text-[var(--bq-t1)]";

  async function send() {
    if (!to.trim() || !subject.trim() || !body.trim() || sending) return;
    setSending(true);
    try {
      await emailService.compose({
        channelId,
        to: to.trim(),
        cc: cc.trim() || undefined,
        subject: subject.trim(),
        body: body.trim(),
        bodyHtml: html,
        attachments: await Promise.all(files.map(fileToOutboundAttachment)),
      });
      rememberRecipients(to);
      toast.success("E-mail enviado pelo Gmail");
      onSent();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível enviar.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <MacWindow
      open
      title="Escrever e-mail"
      onClose={() => {
        if (!sending) onClose();
      }}
    >
      <div className="space-y-3 text-[var(--bq-t1)]">
        <label className="block text-xs">
          Para
          <input
            autoFocus
            list="compose-recipients"
            className={fieldClass}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={sending}
            placeholder="E-mails separados por vírgula"
          />
        </label>
        <datalist id="compose-recipients">
          {recent.map((email) => (
            <option key={email} value={email} />
          ))}
        </datalist>
        <label className="block text-xs">
          Cc
          <input
            className={fieldClass}
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            disabled={sending}
          />
        </label>
        <label className="block text-xs">
          Assunto
          <input
            className={fieldClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={sending}
          />
        </label>
        <EmailRichEditor
          valueHtml={html}
          onChange={(value, plain) => {
            setHtml(value);
            setBody(plain);
          }}
          disabled={sending}
        />
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <Button
              key={`${file.name}-${index}`}
              disabled={sending}
              aria-label={`Remover ${file.name}`}
              onClick={() =>
                setFiles((prev) => prev.filter((_, i) => i !== index))
              }
            >
              {file.name} ×
            </Button>
          ))}
        </div>
        <input
          ref={input}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const incoming = Array.from(e.target.files || []);
            if (
              incoming.some(
                (file) => file.size > MAX_OUTBOUND_ATTACHMENT_BYTES,
              ) ||
              incoming.length + files.length > MAX_OUTBOUND_ATTACHMENTS
            ) {
              toast.error("No máximo 5 anexos de até 8 MB cada.");
            } else setFiles((prev) => [...prev, ...incoming]);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap justify-between gap-2">
          <Button
            disabled={sending || files.length >= MAX_OUTBOUND_ATTACHMENTS}
            onClick={() => input.current?.click()}
          >
            Anexar
          </Button>
          <div className="flex gap-2">
            <Button disabled={sending} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="solid"
              disabled={
                sending || !to.trim() || !subject.trim() || !body.trim()
              }
              onClick={send}
            >
              {sending ? "Enviando…" : "Enviar"}
            </Button>
          </div>
        </div>
      </div>
    </MacWindow>
  );
}
