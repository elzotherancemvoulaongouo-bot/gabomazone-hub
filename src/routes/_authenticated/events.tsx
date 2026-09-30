import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [
    { title: "Événements — Gabomazone" },
    { name: "description", content: "Découvrez et créez les événements de la communauté Gabomazone." },
    { property: "og:title", content: "Événements — Gabomazone" },
    { property: "og:description", content: "Retrouvez les événements de la communauté Gabomazone." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }), component: EventsPage,
});

function EventsPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const { data, isPending, error } = useQuery({ queryKey: ["events"], queryFn: async () => {
    const { data, error } = await supabase.from("events").select("id, title, description, location, starts_at, organizer_id")
      .gte("starts_at", new Date().toISOString()).order("starts_at", { ascending: true }).limit(60);
    if (error) throw error;
    return data ?? [];
  } });
  const create = useMutation({ mutationFn: async () => {
    const { error } = await supabase.from("events").insert({ organizer_id: user.id, title: title.trim(), description: description.trim() || null, location: location.trim() || null, starts_at: new Date(date).toISOString() });
    if (error) throw error;
  }, onSuccess: () => { setOpen(false); setTitle(""); setDescription(""); setLocation(""); setDate(""); queryClient.invalidateQueries({ queryKey: ["events"] }); toast.success("Événement créé !"); }, onError: () => toast.error("Création impossible") });
  return <div className="space-y-5"><div className="flex items-center justify-between gap-2"><h1 className="font-display text-2xl font-bold">Événements</h1><Button size="sm" onClick={() => setOpen(!open)}><Plus className="size-4" />Créer</Button></div>
    {open && <form className="space-y-3 border-b border-border pb-5" onSubmit={(event) => { event.preventDefault(); if (title.trim() && date) create.mutate(); }}>
      <div className="space-y-1"><Label htmlFor="event-title">Nom de l’événement</Label><Input id="event-title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="event-date">Date et heure</Label><Input id="event-date" type="datetime-local" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="event-location">Lieu</Label><Input id="event-location" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="event-description">Description</Label><Textarea id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <Button type="submit" disabled={create.isPending || !title.trim() || !date}>Publier l’événement</Button>
    </form>}
    {isPending ? <Skeleton className="h-24 w-full" /> : error ? <p className="text-sm text-destructive">Impossible de charger les événements.</p> : data?.length ? <ul className="divide-y divide-border">{data.map((item) => <li key={item.id} className="space-y-2 py-4"><div className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" /><h2 className="font-semibold">{item.title}</h2></div><p className="text-sm text-muted-foreground">{new Date(item.starts_at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}</p>{item.location && <p className="flex items-center gap-1 text-sm"><MapPin className="size-4" />{item.location}</p>}{item.description && <p className="whitespace-pre-wrap text-sm">{item.description}</p>}</li>)}</ul> : <p className="py-6 text-sm text-muted-foreground">Aucun événement à venir.</p>}
  </div>;
}
