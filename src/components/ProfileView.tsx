import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchUserPosts } from "@/lib/posts";
import { Media } from "@/components/Media";
import { UserAvatar } from "@/components/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FriendButton } from "@/components/FriendButton";
import { MessageButton } from "@/components/MessageButton";
import { useAuth } from "@/lib/auth";
import { MapPin, Cake, Mail, Phone, Globe } from "lucide-react";

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
  const isMe = user?.id === profile.id;
  const { data, isPending } = useQuery({
    queryKey: ["user-posts", profile.id],
    queryFn: () => fetchUserPosts(profile.id),
  });

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  const place = [profile.city, profile.country].filter(Boolean).join(", ");
  const years = age(profile.birthdate);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <UserAvatar avatarPath={profile.avatar_url} name={profile.username} className="size-20" />
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {fullName && <p className="text-sm">{fullName}</p>}
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.length ?? 0} publication{(data?.length ?? 0) > 1 ? "s" : ""}
          </p>
        </div>
      </header>

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

      {profile.bio && <p className="text-sm leading-relaxed">{profile.bio}</p>}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {place && (
          <li className="flex items-center gap-1">
            <MapPin className="size-4" /> {place}
          </li>
        )}
        {years !== null && (
          <li className="flex items-center gap-1">
            <Cake className="size-4" /> {years} ans
          </li>
        )}
        {profile.contact_email && (
          <li className="flex items-center gap-1">
            <Mail className="size-4" /> {profile.contact_email}
          </li>
        )}
        {profile.phone && (
          <li className="flex items-center gap-1">
            <Phone className="size-4" /> {profile.phone}
          </li>
        )}
        {profile.website && (
          <li className="flex items-center gap-1">
            <Globe className="size-4" />
            <a href={profile.website} target="_blank" rel="noreferrer" className="underline">
              {profile.website}
            </a>
          </li>
        )}
      </ul>

      <div className="grid grid-cols-3 gap-1">
        {isPending
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-md" />
            ))
          : (data ?? []).map((post) => (
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
                  className="size-full object-cover"
                />
              </Link>
            ))}
      </div>
      {!isPending && (data ?? []).length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Aucune publication.</p>
      )}
    </div>
  );
}