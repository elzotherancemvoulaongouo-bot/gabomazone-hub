<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep global authenticated navigation and its full-screen menu in AppShell; the one header messages entry owns its unread badge, because duplicate navigation splits the messaging state.
- Keep search results on the existing /explore route and use dedicated routes for video and events shortcuts, because each menu destination must have a shareable page.
- Keep discovery recommendations separate from the friends feed; video tiles open the shareable vertical viewer and photo tiles open the ordinary post page.
- Keep the camera in its isolated body portal and transfer captures into the inline feed composer, so other overlays cannot obscure capture and selected media remains ready to publish.
- Normalize feed and story uploads through the shared browser media helper and crop profile/community images through the shared crop dialog; this keeps validation, ratios and legacy signed paths consistent across entry points.
- Keep the classic friends feed with PostCard and its original media ratios; use a separate shareable vertical snap viewer for discovery videos and the Videos shortcut, so Reels playback does not alter ordinary posts.
- Keep the shareable /watch/$postId viewer fed by the post query and public video list; this preserves direct links while allowing one visible video at a time.
