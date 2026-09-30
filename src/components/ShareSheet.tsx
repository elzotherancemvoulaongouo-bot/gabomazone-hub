import { useEffect, useState } from "react";
import { Link2, Mail, MessageCircle, Send } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { copyLink, subscribeShareSheet, type SharePayload } from "@/lib/share";

/** Feuille de secours quand le partage natif n'est pas disponible. Montée une seule fois. */
export function ShareSheet() {
  const [payload, setPayload] = useState<SharePayload | null>(null);
  useEffect(() => subscribeShareSheet(setPayload), []);
  const url = payload?.url ?? "";
  const message = [payload?.text, url].filter(Boolean).join(" ");
  const e = encodeURIComponent;
  const targets = [
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${e(message)}` },
    { label: "Messenger", icon: Send, href: `fb-messenger://share/?link=${e(url)}` },
    {
      label: "Facebook",
      icon: Link2,
      href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
    },
    {
      label: "Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${e(url)}&text=${e(payload?.text ?? "")}`,
    },
    {
      label: "E-mail",
      icon: Mail,
      href: `mailto:?subject=${e(payload?.title ?? "Gabomazone")}&body=${e(message)}`,
    },
  ];
  return (
    <Sheet
      open={Boolean(payload)}
      onOpenChange={(open) => {
        if (!open) setPayload(null);
      }}
    >
      <SheetContent side="bottom" className="z-[2147483000] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Partager</SheetTitle>
          <SheetDescription className="truncate">{payload?.title}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid gap-2 pb-2">
          <Button
            variant="secondary"
            className="justify-start gap-3"
            onClick={async () => {
              await copyLink(url);
              setPayload(null);
            }}
          >
            <Link2 className="size-5" /> Copier le lien
          </Button>
          {targets.map((t) => (
            <Button key={t.label} asChild variant="ghost" className="justify-start gap-3">
              <a
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setPayload(null)}
              >
                <t.icon className="size-5" /> {t.label}
              </a>
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
