import { useEffect, useRef, useState } from "react";

/**
 * Monte ses enfants uniquement lorsqu'ils approchent de l'écran, et réserve
 * la hauteur mesurée lorsqu'ils en sortent : défilement fluide et mémoire
 * limitée même avec beaucoup de photos/vidéos (mobile).
 */
export function LazyMount({
  children,
  placeholderHeight = 420,
  rootMargin = "1200px 0px",
  keepMounted = false,
}: {
  children: React.ReactNode;
  placeholderHeight?: number;
  rootMargin?: string;
  keepMounted?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [height, setHeight] = useState(placeholderHeight);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setVisible(true);
        } else if (!keepMounted) {
          const measured = el.getBoundingClientRect().height;
          if (measured > 0) setHeight(measured);
          setVisible(false);
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, keepMounted]);

  return (
    <div ref={ref} style={visible ? undefined : { minHeight: height }}>
      {visible ? children : null}
    </div>
  );
}
