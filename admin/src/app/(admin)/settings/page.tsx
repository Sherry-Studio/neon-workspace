"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck, UserCog } from "lucide-react";
import { settingsApi } from "@/lib/api/settings";
import { usersApi } from "@/lib/api/users";
import type { Role } from "@/lib/types";
import { useSession } from "@/hooks/useSession";
import {
  PageHeader,
  Avatar,
  RoleBadge,
} from "@/components/ui/misc";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Select,
} from "@/components/ui/primitives";
import { LoadingRow, EmptyState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

export default function SettingsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { user, isSuperAdmin } = useSession();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const profileMut = useMutation({
    mutationFn: () =>
      settingsApi.updateProfile({
        username: username || undefined,
        email: email || undefined,
      }),
    onSuccess: () => {
      toast.success("Profile updated.");
      setUsername("");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["session"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const pwMut = useMutation({
    mutationFn: () =>
      settingsApi.changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => {
      toast.success("Password changed successfully.");
      setCurrent("");
      setNext("");
      setConfirmPw("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Change failed."),
  });

  const adminsQ = useQuery({
    queryKey: ["admins"],
    queryFn: settingsApi.listAdmins,
    enabled: isSuperAdmin,
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => usersApi.setRole(id, role),
    onSuccess: () => {
      toast.success("Admin role updated.");
      qc.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  return (
    <>
      <PageHeader title="Settings" description="Manage your admin account and, if permitted, other admins." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Admin profile" />
          <div className="flex items-center gap-3 border-b border-line p-5">
            <Avatar name={user?.username ?? "?"} size={48} />
            <div>
              <p className="text-sm font-semibold text-white">{user?.username}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <div className="mt-1">{user && <RoleBadge role={user.role} />}</div>
            </div>
          </div>
          <div className="grid gap-4 p-5">
            <Field label="Username" hint="Leave blank to keep current">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={user?.username} />
            </Field>
            <Field label="Email" hint="Leave blank to keep current">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={user?.email} />
            </Field>
            <Button
              variant="primary"
              className="w-fit"
              loading={profileMut.isPending}
              disabled={!username && !email}
              onClick={() => profileMut.mutate()}
            >
              <UserCog className="h-4 w-4" /> Save profile
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Security" subtitle="Change your password" />
          <div className="grid gap-4 p-5">
            <Field label="Current password">
              <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </Field>
            <Field label="New password" hint="At least 8 characters">
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
            </Field>
            <Field
              label="Confirm new password"
              error={confirmPw && confirmPw !== next ? "Passwords do not match" : undefined}
            >
              <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            </Field>
            <Button
              variant="primary"
              className="w-fit"
              loading={pwMut.isPending}
              disabled={!current || next.length < 8 || next !== confirmPw}
              onClick={() => pwMut.mutate()}
            >
              <KeyRound className="h-4 w-4" /> Change password
            </Button>
          </div>
        </Card>

        {isSuperAdmin && (
          <Card className="lg:col-span-2">
            <CardHeader
              title="Manage admin users"
              subtitle="SUPER_ADMIN only — promote or demote admin accounts"
            />
            {adminsQ.isLoading ? (
              <LoadingRow />
            ) : adminsQ.data && adminsQ.data.length ? (
              <ul className="divide-y divide-line/60">
                {adminsQ.data.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <Avatar name={a.username} size={30} />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-200">{a.username}</p>
                      <p className="truncate text-xs text-slate-500">{a.email}</p>
                    </div>
                    <span className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-slate-600">
                        joined {formatDate(a.createdAt)}
                      </span>
                      {a.id === user?.id ? (
                        <RoleBadge role={a.role} />
                      ) : (
                        <Select
                          value={a.role}
                          onChange={(e) =>
                            roleMut.mutate({ id: a.id, role: e.target.value as Role })
                          }
                          className="h-8 max-w-[10rem] text-xs"
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </Select>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No admin accounts" />
            )}
          </Card>
        )}

        <Card className="lg:col-span-2">
          <CardHeader title="Account" />
          <dl className="grid gap-x-6 gap-y-3 p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-600">Role</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-glow" />
                {user?.role}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-600">Permissions</dt>
              <dd className="mt-0.5 text-xs text-slate-500">
                {user?.permissions.join(", ")}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  );
}
