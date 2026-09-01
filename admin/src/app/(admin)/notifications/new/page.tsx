"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Send, Users } from "lucide-react";
import { notificationsApi, type NotificationCreateInput } from "@/lib/api/notifications";
import { usersApi } from "@/lib/api/users";
import { gamesApi } from "@/lib/api/games";
import { blogApi } from "@/lib/api/blog";
import type { NotificationAudience, NotificationType } from "@/lib/types";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader, Avatar, Badge } from "@/components/ui/misc";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatNumber } from "@/lib/utils";

export default function NewNotificationPage() {
  const router = useRouter();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("SYSTEM");
  const [audience, setAudience] = useState<NotificationAudience>("ONE_USER");
  const [recipients, setRecipients] = useState<{ id: string; username: string }[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [link, setLink] = useState("");
  const [gameId, setGameId] = useState("");
  const [blogId, setBlogId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const debouncedSearch = useDebounce(userSearch);
  const usersQ = useQuery({
    queryKey: ["users", "notif-picker", debouncedSearch],
    queryFn: () => usersApi.list({ search: debouncedSearch, pageSize: 8, role: "USER" }),
    enabled: audience !== "ALL_USERS",
  });
  const gamesQ = useQuery({
    queryKey: ["games", "notif"],
    queryFn: () => gamesApi.list({ pageSize: 100 }),
  });
  const blogQ = useQuery({
    queryKey: ["blog", "notif"],
    queryFn: () => blogApi.list({ pageSize: 100 }),
  });
  const countQ = useQuery({
    queryKey: ["audience-count", audience, recipients.map((r) => r.id)],
    queryFn: () =>
      notificationsApi.audienceCount(
        audience,
        recipients.map((r) => r.id),
      ),
  });

  const send = useMutation({
    mutationFn: () => {
      const payload: NotificationCreateInput = {
        title,
        message,
        type,
        audience,
        recipientIds: audience === "ALL_USERS" ? undefined : recipients.map((r) => r.id),
        link: link || null,
        gameId: gameId || null,
        blogId: blogId || null,
      };
      return notificationsApi.create(payload);
    },
    onSuccess: (res) => {
      toast.success(
        res.pushDelivered
          ? "Notification sent successfully (push + database)."
          : "Notification recorded successfully (database only — push unavailable).",
      );
      router.push("/notifications");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Send failed."),
    onSettled: () => setConfirmOpen(false),
  });

  const toggleRecipient = (u: { id: string; username: string }) => {
    setRecipients((prev) => {
      const exists = prev.some((r) => r.id === u.id);
      if (audience === "ONE_USER") return exists ? [] : [u];
      return exists ? prev.filter((r) => r.id !== u.id) : [...prev, u];
    });
  };

  const canSubmit =
    title.trim().length >= 2 &&
    message.trim().length >= 2 &&
    (audience === "ALL_USERS" || recipients.length >= 1) &&
    (audience !== "ONE_USER" || recipients.length === 1);

  const targetCount =
    audience === "ALL_USERS" ? countQ.data?.count ?? 0 : recipients.length;

  const onSend = () => {
    if (!canSubmit) {
      toast.error("Complete the required fields before sending.");
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <>
      <button
        onClick={() => router.push("/notifications")}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <PageHeader title="New notification" description="Compose and send a notification to players." />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Message" />
            <div className="grid gap-4 p-5">
              <Field label="Title">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={90} />
              </Field>
              <Field label="Message">
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Notification type">
                  <Select value={type} onChange={(e) => setType(e.target.value as NotificationType)}>
                    <option value="SYSTEM">System</option>
                    <option value="GAME">Game</option>
                    <option value="BLOG">Blog</option>
                    <option value="ACHIEVEMENT">Achievement</option>
                    <option value="LEADERBOARD">Leaderboard</option>
                  </Select>
                </Field>
                <Field label="Link (optional)">
                  <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
                </Field>
                <Field label="Related game (optional)">
                  <Select value={gameId} onChange={(e) => setGameId(e.target.value)}>
                    <option value="">None</option>
                    {gamesQ.data?.data.map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Related post (optional)">
                  <Select value={blogId} onChange={(e) => setBlogId(e.target.value)}>
                    <option value="">None</option>
                    {blogQ.data?.data.map((b) => (
                      <option key={b.id} value={b.id}>{b.title}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
          </Card>

          {audience !== "ALL_USERS" && (
            <Card>
              <CardHeader
                title="Recipients"
                subtitle={
                  audience === "ONE_USER" ? "Choose exactly one user" : "Choose one or more users"
                }
              />
              <div className="p-5">
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users…"
                />
                {recipients.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {recipients.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => toggleRecipient(r)}
                        className="rounded-md border border-cyan-glow/30 bg-cyan-glow/10 px-2 py-0.5 text-xs text-cyan-soft"
                      >
                        {r.username} ✕
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-3 divide-y divide-line/60 rounded-lg border border-line">
                  {usersQ.isLoading ? (
                    <p className="p-3 text-xs text-slate-600">Loading…</p>
                  ) : usersQ.data?.data.length ? (
                    usersQ.data.data.map((u) => {
                      const selected = recipients.some((r) => r.id === u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={() => toggleRecipient(u)}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                            selected ? "bg-cyan-glow/5" : "hover:bg-white/[0.03]"
                          }`}
                        >
                          <Avatar name={u.username} size={24} />
                          <span className="text-slate-300">{u.username}</span>
                          <span className="ml-auto text-xs text-slate-600">{u.email}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="p-3 text-xs text-slate-600">No users found.</p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Audience" />
            <div className="space-y-2 p-5">
              {(
                [
                  ["ONE_USER", "One user"],
                  ["MULTIPLE_USERS", "Multiple users"],
                  ["ALL_USERS", "All users"],
                ] as [NotificationAudience, string][]
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                    audience === value
                      ? "border-cyan-glow/40 bg-cyan-glow/10 text-cyan-soft"
                      : "border-line text-slate-400 hover:border-line-strong"
                  }`}
                >
                  <input
                    type="radio"
                    name="audience"
                    checked={audience === value}
                    onChange={() => {
                      setAudience(value);
                      setRecipients([]);
                    }}
                    className="accent-cyan-glow"
                  />
                  {label}
                </label>
              ))}

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-ink-850 px-3 py-2.5 text-sm">
                <Users className="h-4 w-4 text-slate-500" />
                <span className="text-slate-400">Will reach</span>
                <span className="ml-auto font-semibold text-white">
                  {formatNumber(targetCount)}
                </span>
              </div>
              {audience === "ALL_USERS" && (
                <p className="text-xs text-amber-400">
                  This sends to every player on the platform.
                </p>
              )}

              <Button
                variant="primary"
                className="mt-2 w-full"
                onClick={onSend}
                disabled={!canSubmit}
              >
                <Send className="h-4 w-4" /> Send notification
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={audience === "ALL_USERS" ? "Send to ALL users?" : "Send notification?"}
        description={
          audience === "ALL_USERS"
            ? `You are about to send this notification to ${formatNumber(targetCount)} users. This cannot be undone.`
            : `This notification will be sent to ${formatNumber(targetCount)} recipient(s).`
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={audience === "ALL_USERS" ? "danger" : "primary"}
              size="sm"
              loading={send.isPending}
              onClick={() => send.mutate()}
            >
              {audience === "ALL_USERS"
                ? `Yes, send to ${formatNumber(targetCount)} users`
                : "Send"}
            </Button>
          </>
        }
      >
        <div className="rounded-lg border border-line bg-ink-850 p-3 text-sm">
          <p className="font-medium text-slate-200">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{message}</p>
          <div className="mt-2">
            <Badge tone="violet">{type}</Badge>
          </div>
        </div>
      </Modal>
    </>
  );
}
