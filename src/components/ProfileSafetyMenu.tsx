import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Ban, Flag, MoreHorizontal, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { reportContent } from "@/lib/moderation";
import { useBlockActions } from "@/lib/social";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const REPORT_REASONS = [
  { key: "harcelement", label: "Harcèlement ou intimidation" },
  { key: "haine", label: "Discours haineux" },
  { key: "nudite", label: "Nudité ou contenu sexuel" },
  { key: "violence", label: "Violence ou menaces" },
  { key: "arnaque", label: "Arnaque ou spam" },
  { key: "faux_compte", label: "Faux compte / usurpation" },
  { key: "autre", label: "Autre" },
];

export function ProfileSafetyMenu({
  userId,
  profileId,
  name,
}: {
  userId: string;
  profileId: string;
  name: string;
}) {
  const navigate = useNavigate();
  const { block } = useBlockActions(userId);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  async function report(reason: string) {
    setReportOpen(false);
    try {
      await reportContent(userId, "profile", profileId, reason);
      toast.success("Merci, votre signalement a été transmis.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signalement impossible");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" aria-label="Plus d'options">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => setReportOpen(true)}>
            <Flag className="mr-2 size-4" /> Signaler ce profil
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setBlockOpen(true)}
          >
            <Ban className="mr-2 size-4" /> Bloquer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/regles">
              <ShieldCheck className="mr-2 size-4" /> Règles de la communauté
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={reportOpen} onOpenChange={setReportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pourquoi signalez-vous ce profil ?</AlertDialogTitle>
            <AlertDialogDescription>Votre signalement reste anonyme.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            {REPORT_REASONS.map((r) => (
              <Button key={r.key} variant="secondary" onClick={() => void report(r.key)}>
                {r.label}
              </Button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquer {name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ses publications n'apparaîtront plus dans votre fil. Vous pourrez le débloquer dans
              les paramètres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                block.mutate(profileId, { onSuccess: () => void navigate({ to: "/feed" }) })
              }
            >
              Bloquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
