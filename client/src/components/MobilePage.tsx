import { ReactNode, useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface MobilePageProps {
  children: ReactNode;
  onRefresh?: () => Promise<void>;
  className?: string;
}

export default function MobilePage({ children, onRefresh, className = "" }: MobilePageProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 70;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!onRefresh) return;
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, [onRefresh]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!onRefresh || startY.current === null) return;
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) {
      startY.current = null;
      setPullDistance(0);
      return;
    }
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, PULL_THRESHOLD + 20));
    }
  }, [onRefresh]);

  const handleTouchEnd = useCallback(async () => {
    if (!onRefresh || startY.current === null) return;
    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
    startY.current = null;
  }, [onRefresh, pullDistance]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto overscroll-y-contain ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* Pull to refresh indicator */}
      {onRefresh && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200"
          style={{ height: refreshing ? 56 : pullDistance > 0 ? pullDistance : 0 }}
        >
          <Loader2
            className={`h-5 w-5 text-primary transition-all duration-200 ${
              refreshing ? "animate-spin" : ""
            }`}
            style={{
              opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
              transform: `rotate(${(pullDistance / PULL_THRESHOLD) * 180}deg)`,
            }}
          />
        </div>
      )}

      {/* Page content */}
      <div className="px-4 pb-6">
        {children}
      </div>
    </div>
  );
}
