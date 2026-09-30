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
