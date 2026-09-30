import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Bookmark,
  BookmarkCheck,
  Copy,
  Flag,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  MousePointerClick,
  Pencil,
  Phone,
  Mail,
  Search,
  Settings,
  Share2,
  Shield,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/Avatar";
import { getOrCreateConversation } from "@/lib/messages";
import {
  ACTION_BUTTON_OPTIONS,
  actionHref,
  actionOption,
  fetchFlags,
  fetchMyFriends,
  fetchSentInvites,
  reportCommunity,
  saveActionButtons,
  sendInvites,
  setFlag,
  type ActionButton,
  type ActionButtonType,
} from "@/lib/community-actions";

type Target = { pageId?: string; groupId?: string };

const ICONS: Partial<Record<ActionButtonType, typeof Phone>> = {
  message: MessageCircle,
  whatsapp: MessageCircle,
  call: Phone,
  email: Mail,
};

/* ---------------- Page action buttons ---------------- */

export function PageActionButtons({
  buttons,
  ownerId,
  meId,
  preview = false,
}: {
  buttons: ActionButton[];
  ownerId: string;
  meId: string;
  preview?: boolean;
}) {
  const navigate = useNavigate();
  const list: ActionButton[] = buttons.length > 0 ? buttons : [{ type: "message" }];
  const openChat = useMutation({
    mutationFn: () => getOrCreateConversation(meId, ownerId),
    onSuccess: (conversationId) => navigate({ to: "/m/$conversationId", params: { conversationId } }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Discussion impossible"),
  });

  return (
    <>
      {list.map((b, i) => {
        const opt = actionOption(b.type);
        const Icon = ICONS[b.type] ?? ExternalLink;
        const content = (
          <>
            <Icon className="mr-2 size-4" /> {opt.label}
          </>
        );
        if (preview) {
          return (
            <Button key={i} variant="secondary" className="flex-1" type="button">
              {content}
            </Button>
          );
        }
        if (b.type === "message") {
          return (
            <Button
              key={i}
              variant="secondary"
              className="flex-1"
              disabled={openChat.isPending}
              onClick={() => {
                if (ownerId === meId) {
                  toast.info("Vous êtes l'administrateur de cette page");
                  return;
                }
                openChat.mutate();
              }}
            >
              {content}
            </Button>
          );
        }
        const href = actionHref(b);
        if (!href) return null;
        const external = href.startsWith("http");
        return (
          <Button key={i} asChild variant="secondary" className="flex-1">
            <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              {content}
            </a>
          </Button>
        );
      })}
    </>
  );
}

/* ---------------- Action button editor ---------------- */

export function ActionButtonEditor({
  open,
  onOpenChange,
  pageId,
  initial,
  ownerId,
  meId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pageId: string;
  initial: ActionButton[];
  ownerId: string;
  meId: string;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<ActionButton[]>(initial);
  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  const save = useMutation({
    mutationFn: () => {
      for (const b of draft) {
        const opt = actionOption(b.type);
        if (opt.needs !== "none" && !(b.value ?? "").trim()) throw new Error(`Renseignez la valeur pour « ${opt.label} »`);
      }
      return saveActionButtons(pageId, draft);
    },
    onSuccess: () => {
      toast.success("Bouton d'action mis à jour");
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Enregistrement impossible"),
  });

  function toggle(type: ActionButtonType) {
    setDraft((prev) => {
      if (prev.some((b) => b.type === type)) return prev.filter((b) => b.type !== type);
      if (prev.length >= 2) {
        toast.info("2 boutons maximum");
        return prev;
      }
      return [...prev, { type }];
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le bouton d'action</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Choisissez jusqu'à 2 boutons. Sans choix, « Message » est affiché.</p>
        <div className="flex flex-wrap gap-2">
          {ACTION_BUTTON_OPTIONS.map((o) => {
            const on = draft.some((b) => b.type === o.type);
            return (
              <Button key={o.type} type="button" size="sm" variant={on ? "default" : "outline"} onClick={() => toggle(o.type)}>
                {o.label}
              </Button>
            );
          })}
        </div>
        {draft.map((b) => {
          const o = actionOption(b.type);
          if (o.needs === "none") return null;
          return (
            <div key={b.type} className="space-y-1">
              <Label htmlFor={`ab-${b.type}`}>{o.label}</Label>
              <Input
                id={`ab-${b.type}`}
                value={b.value ?? ""}
                placeholder={o.placeholder}
                onChange={(e) =>
                  setDraft((prev) => prev.map((x) => (x.type === b.type ? { ...x, value: e.target.value } : x)))
                }
              />
            </div>
          );
        })}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Aperçu</p>
          <div className="flex gap-2 rounded-2xl border border-border/70 p-3">
            <Button className="flex-1" type="button">Suivre</Button>
            <PageActionButtons buttons={draft} ownerId={ownerId} meId={meId} preview />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Invite friends ---------------- */

export function InviteFriendsDialog({
  open,
  onOpenChange,
  userId,
  target,
  kind,
  excludeIds,
  shareUrl,
  name,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  target: Target;
  kind: "page" | "group";
  excludeIds: string[];
  shareUrl: string;
  name: string;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const inviteKey = ["community-invites", target.pageId ?? target.groupId, userId];

  const friends = useQuery({ queryKey: ["my-friends", userId], queryFn: () => fetchMyFriends(userId), enabled: open });
  const sent = useQuery({ queryKey: inviteKey, queryFn: () => fetchSentInvites(userId, target), enabled: open });

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSearch("");
    }
  }, [open]);

  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);
  const sentSet = useMemo(() => new Set(sent.data ?? []), [sent.data]);
  const eligible = (friends.data ?? []).filter((f) => !exclude.has(f.id));
  const q = search.trim().toLowerCase();
  const visible = eligible.filter(
    (f) => !q || f.username.toLowerCase().includes(q) || (f.display_name ?? "").toLowerCase().includes(q),
  );
  const selectable = visible.filter((f) => !sentSet.has(f.id));
  const allSelected = selectable.length > 0 && selectable.every((f) => selected.has(f.id));

  const send = useMutation({
    mutationFn: () => sendInvites(userId, target, [...selected]),
    onSuccess: async () => {
      toast.success(`${selected.size} invitation(s) envoyée(s)`);
      setSelected(new Set());
      await queryClient.invalidateQueries({ queryKey: inviteKey });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Envoi impossible"),
  });

  async function shareLink() {
    const text = kind === "page" ? `Suis la page ${name} sur Gabomazone` : `Rejoins le groupe ${name} sur Gabomazone`;
    try {
      if (navigator.share) return await navigator.share({ title: name, text, url: shareUrl });
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Lien d'invitation copié");
    } catch {
      /* annulé */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col">
        <DialogHeader>
          <DialogTitle>
            {kind === "page" ? "Inviter des amis à suivre cette page" : "Inviter des amis à rejoindre ce groupe"}
          </DialogTitle>
        </DialogHeader>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un ami" aria-label="Rechercher un ami" />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              disabled={selectable.length === 0}
              onCheckedChange={(v) =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  selectable.forEach((f) => (v ? next.add(f.id) : next.delete(f.id)));
                  return next;
                })
              }
            />
            Tout sélectionner
          </label>
          <span className="text-xs text-muted-foreground">{selected.size} sélectionné(s)</span>
        </div>
        <ul className="min-h-24 flex-1 space-y-1 overflow-y-auto">
          {friends.isPending ? (
            <li className="text-sm text-muted-foreground">Chargement…</li>
          ) : visible.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">Aucun ami à inviter.</li>
          ) : (
            visible.map((f) => {
              const already = sentSet.has(f.id);
              return (
                <li key={f.id}>
                  <label className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary">
                    <UserAvatar avatarPath={f.avatar_url} name={f.username} />
                    <span className="min-w-0 flex-1 truncate text-sm">{f.display_name || f.username}</span>
                    {already ? (
                      <span className="text-xs text-muted-foreground">Invitation envoyée</span>
                    ) : (
                      <Checkbox
                        checked={selected.has(f.id)}
                        onCheckedChange={(v) =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(f.id);
                            else next.delete(f.id);
                            return next;
                          })
                        }
                        aria-label={`Inviter ${f.display_name || f.username}`}
                      />
                    )}
                  </label>
                </li>
              );
            })
          )}
        </ul>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={shareLink}>
            <Share2 className="mr-2 size-4" /> Inviter par lien
          </Button>
          <Button onClick={() => send.mutate()} disabled={selected.size === 0 || send.isPending}>
            Envoyer les invitations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- ⋯ sheet ---------------- */

export type MoreItem = { key: string; label: string; icon: typeof Phone; onClick: () => void; destructive?: boolean };

export function CommunityMoreButton({
  userId,
  target,
  kind,
  name,
  shareUrl,
  isAdmin,
  isMember,
  onInvite,
  onSearch,
  onLeave,
  adminItems = [],
}: {
  userId: string;
  target: Target;
  kind: "page" | "group";
  name: string;
  shareUrl: string;
  isAdmin: boolean;
  isMember: boolean;
  onInvite: () => void;
  onSearch: () => void;
  onLeave?: () => void;
  adminItems?: MoreItem[];
}) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const flagsKey = ["community-flags", target.pageId ?? target.groupId, userId];
  const flags = useQuery({ queryKey: flagsKey, queryFn: () => fetchFlags(userId, target) });
  const saved = (flags.data ?? []).includes("saved");

  const flag = useMutation({
    mutationFn: ({ f, on }: { f: "saved" | "blocked"; on: boolean }) => setFlag(userId, target, f, on),
    onSuccess: async (_d, { f, on }) => {
      await queryClient.invalidateQueries({ queryKey: flagsKey });
      if (f === "saved") toast.success(on ? "Enregistré" : "Retiré des enregistrements");
      else {
        toast.success(kind === "page" ? "Page bloquée" : "Groupe bloqué");
        navigate({ to: kind === "page" ? "/pages" : "/groups" });
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action impossible"),
  });

  const report = useMutation({
    mutationFn: () => reportCommunity(userId, target, reason.trim() || "Contenu inapproprié"),
    onSuccess: () => {
      toast.success("Signalement envoyé, merci");
      setReportOpen(false);
      setReason("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Signalement impossible"),
  });

  function run(fn: () => void) {
    setOpen(false);
    fn();
  }

  async function share() {
    try {
      if (navigator.share) return await navigator.share({ title: name, url: shareUrl });
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Lien copié");
    } catch {
      /* annulé */
    }
  }

  const items: MoreItem[] = [
    {
      key: "invite",
      label: kind === "page" ? "Inviter des amis à suivre" : "Inviter des amis à rejoindre",
      icon: UserPlus,
      onClick: onInvite,
    },
    { key: "share", label: "Partager", icon: Share2, onClick: share },
    {
      key: "copy",
      label: "Copier le lien",
      icon: Copy,
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Lien copié");
        } catch {
          toast.error("Copie impossible");
        }
      },
    },
    {
      key: "save",
      label: saved ? "Retirer des enregistrements" : "Enregistrer",
      icon: saved ? BookmarkCheck : Bookmark,
      onClick: () => flag.mutate({ f: "saved", on: !saved }),
    },
    { key: "search", label: kind === "page" ? "Rechercher dans la page" : "Rechercher dans le groupe", icon: Search, onClick: onSearch },
    ...(isAdmin ? adminItems : []),
    ...(!isAdmin ? [{ key: "report", label: "Signaler", icon: Flag, onClick: () => setReportOpen(true) }] : []),
    ...(isMember && onLeave && !isAdmin
      ? [{ key: "leave", label: kind === "page" ? "Ne plus suivre" : "Quitter le groupe", icon: LogOut, onClick: onLeave, destructive: true }]
      : []),
    ...(!isAdmin
      ? [{ key: "block", label: "Bloquer", icon: Ban, onClick: () => flag.mutate({ f: "blocked", on: true }), destructive: true }]
      : []),
  ];

  return (
    <>
      <Button variant="secondary" size="icon" aria-label="Plus d'options" onClick={() => setOpen(true)}>
        <MoreHorizontal className="size-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="truncate">{name}</SheetTitle>
          </SheetHeader>
          <ul className="mt-2 space-y-1 pb-4">
            {items.map((it) => (
              <li key={it.key}>
                <button
                  type="button"
                  onClick={() => run(it.onClick)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-secondary ${it.destructive ? "text-destructive" : ""}`}
                >
                  <it.icon className="size-5 shrink-0" />
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler {kind === "page" ? "cette page" : "ce groupe"}</DialogTitle>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Raison (spam, arnaque, contenu choquant…)" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Annuler</Button>
            <Button onClick={() => report.mutate()} disabled={report.isPending}>Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const AdminIcons = { Pencil, MousePointerClick, Settings, Shield };
