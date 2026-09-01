import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserPosts } from "@/lib/posts";
import { Media } from "@/components/Media";
import { UserAvatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { FeedComposer } from "@/components/FeedComposer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FriendButton } from "@/components/FriendButton";
import { MessageButton } from "@/components/MessageButton";
import { useAuth } from "@/lib/auth";
import { fetchMyRequests } from "@/lib/friends";
import { MapPin, Cake, Mail, Phone, Globe, Users } from "lucide-react";
import { CoverPhoto } from "@/components/CoverPhoto";
import { supabase } from "@/integrations/supabase/client";

export type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  first_name?: string | null;
  last_name?: string | null;
  birthdate?: string | null;
  gender?: string | null;
  country?: string | null;
  city?: string | null;
  phone?: string | null;
  contact_email?: string | null;
  website?: string | null;
  cover_url?: string | null;
};

function age(birthdate?: string | null) {
  if (!birthdate) return null;
  const d = new Date(birthdate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a -= 1;
  return a >= 0 && a < 130 ? a : null;
}

export function ProfileView({ profile }: { profile: ProfileRow }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMe = user?.id === profile.id;
  const { data, isPending } = useQuery({
    queryKey: ["user-posts", profile.id],
    queryFn: () => fetchUserPosts(profile.id),
  });

  const friends = useQuery({
    queryKey: ["friend-requests", profile.id],
    queryFn: () => fetchMyRequests(profile.id),
  });
  const friendCount = (friends.data ?? []).filter((r) => r.status === "accepted").length;

  const posts = data ?? [];
  const photos = posts.filter((p) => p.media_url && p.media_type !== "video");
  const videos = posts.filter((p) => p.media_type === "video");

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  const place = [profile.city, profile.country].filter(Boolean).join(", ");
  const years = age(profile.birthdate);

  return (
    <div className="space-y-5">
      <CoverPhoto
        path={profile.cover_url ?? null}
        editable={isMe}
        userId={user?.id}
        onSave={async (value) => {
          const { error } = await supabase
            .from("profiles")
            .update({ cover_url: value })
            .eq("id", profile.id);
          if (error) throw error;
          await queryClient.invalidateQueries({ queryKey: ["profile"] });
        }}
      />

      <header className="-mt-14 flex flex-col gap-3 px-1 sm:-mt-16 sm:flex-row sm:items-end">
        <UserAvatar
          avatarPath={profile.avatar_url}
          name={profile.username}
          className="size-24 ring-4 ring-background sm:size-28"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold leading-tight">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {fullName && <p className="text-sm">{fullName}</p>}
          <p className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {posts.length} publication{posts.length > 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-4" /> {friendCount} ami{friendCount > 1 ? "s" : ""}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isMe ? (
            <Button asChild variant="secondary" size="sm">
              <Link to="/settings">Modifier le profil</Link>
            </Button>
          ) : (
            <>
              <FriendButton profileId={profile.id} />
              <MessageButton profileId={profile.id} />
            </>
          )}
        </div>
      </header>

      {profile.bio && <p className="px-1 text-sm leading-relaxed">{profile.bio}</p>}

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="posts">Publications</TabsTrigger>
          <TabsTrigger value="about">À propos</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="videos">Vidéos</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-5 pt-4">
          {isMe && user ? <FeedComposer userId={user.id} /> : null}
          {isPending ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : posts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Aucune publication.</p>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={user?.id ?? ""} />
            ))
          )}
        </TabsContent>

        <TabsContent value="about" className="pt-4">
          <ul className="space-y-2 rounded-2xl border border-border/70 brand-surface p-4 text-sm text-muted-foreground">
            {place && (
              <li className="flex items-center gap-2">
                <MapPin className="size-4" /> {place}
              </li>
            )}
            {years !== null && (
              <li className="flex items-center gap-2">
                <Cake className="size-4" /> {years} ans
              </li>
            )}
            {profile.contact_email && (
              <li className="flex items-center gap-2">
                <Mail className="size-4" /> {profile.contact_email}
              </li>
            )}
            {profile.phone && (
              <li className="flex items-center gap-2">
                <Phone className="size-4" /> {profile.phone}
              </li>
            )}
            {profile.website && (
              <li className="flex items-center gap-2">
                <Globe className="size-4" />
                <a href={profile.website} target="_blank" rel="noreferrer" className="underline">
                  {profile.website}
                </a>
              </li>
            )}
            {!place && years === null && !profile.contact_email && !profile.phone && !profile.website && (
              <li>Aucune information renseignée.</li>
            )}
          </ul>
        </TabsContent>

        <TabsContent value="photos" className="pt-4">
          <MediaGrid items={photos} empty="Aucune photo." />
        </TabsContent>

        <TabsContent value="videos" className="pt-4">
          <MediaGrid items={videos} empty="Aucune vidéo." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MediaGrid({
  items,
  empty,
}: {
  items: { id: string; media_url: string | null; media_type: string | null; caption: string | null }[];
  empty: string;
}) {
  if (items.length === 0)
    return <p className="text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((post) => (
        <Link
          key={post.id}
          to="/p/$postId"
          params={{ postId: post.id }}
          className="aspect-square overflow-hidden rounded-md"
        >
          <Media
            path={post.media_url}
            type={post.media_type}
            alt={post.caption ?? "Publication"}
            fallbackText={post.caption}
            className="size-full object-cover"
            autoPlay={false}
          />
        </Link>
      ))}
    </div>
  );
}
