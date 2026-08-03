import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchUserPosts } from "@/lib/posts";
import { Media } from "@/components/Media";
import { UserAvatar } from "@/components/Avatar";
import { Skeleton } from "@/components/ui/skeleton";

export type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export function ProfileView({ profile }: { profile: ProfileRow }) {
  const { data, isPending } = useQuery({
    queryKey: ["user-posts", profile.id],
    queryFn: () => fetchUserPosts(profile.id),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <UserAvatar avatarPath={profile.avatar_url} name={profile.username} className="size-20" />
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.length ?? 0} publication{(data?.length ?? 0) > 1 ? "s" : ""}
          </p>
        </div>
      </header>

      {profile.bio && <p className="text-sm leading-relaxed">{profile.bio}</p>}

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