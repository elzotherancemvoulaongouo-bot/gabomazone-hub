import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { FeedPost } from "@/components/PostCard";
import { MediaViewer } from "@/components/MediaViewer";

type Selection = { post: FeedPost; kind: "video" | "image"; index: number; posts?: FeedPost[] };
type ViewerContextValue = { open: (selection: Selection) => void };
const ViewerContext = createContext<ViewerContextValue | null>(null);

export function useMediaViewer() { return useContext(ViewerContext); }

export function MediaViewerProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const scroll = useRef(0);
  const opened = useRef(false);
  const open = useCallback((value: Selection) => {
    scroll.current = window.scrollY;
    opened.current = true;
    window.history.pushState({ gabomazoneMediaViewer: true }, "", window.location.href);
    setSelection(value);
  }, []);
  const close = useCallback(() => {
    if (opened.current) {
      opened.current = false;
      window.history.back();
    }
    setSelection(null);
    requestAnimationFrame(() => window.scrollTo(0, scroll.current));
  }, []);
  useEffect(() => {
    if (!selection) return;
    const onPop = () => {
      opened.current = false;
      setSelection(null);
      requestAnimationFrame(() => window.scrollTo(0, scroll.current));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [selection]);
  return <ViewerContext.Provider value={{ open }}>
    {children}
    {selection && typeof document !== "undefined" && createPortal(
      <MediaViewer key={`${selection.post.id}-${selection.kind}`} {...selection} userId={userId} onClose={close} />,
      document.body,
    )}
  </ViewerContext.Provider>;
}