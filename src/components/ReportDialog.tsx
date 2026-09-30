import { toast } from "sonner";
import { reportContent, type ReportTarget } from "@/lib/moderation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
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

const LABELS: Record<ReportTarget, string> = {
  post: "cette publication",
  comment: "ce commentaire",
  profile: "ce profil",
  page: "cette page",
  group: "ce groupe",
};

export function ReportDialog({
  open,
  onOpenChange,
  userId,
  targetType,
  targetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  targetType: ReportTarget;
  targetId: string;
}) {
  async function send(reason: string) {
    onOpenChange(false);
    try {
      await reportContent(userId, targetType, targetId, reason);
      toast.success("Merci, votre signalement a été transmis.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Signalement impossible");
    }
  }
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pourquoi signalez-vous {LABELS[targetType]} ?</AlertDialogTitle>
          <AlertDialogDescription>Votre signalement reste anonyme.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          {REPORT_REASONS.map((r) => (
            <Button key={r.key} variant="secondary" onClick={() => void send(r.key)}>
              {r.label}
            </Button>
          ))}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
