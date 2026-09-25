import React, { useState, useEffect, useRef, useCallback } from "react";
import { parseDescrambleFragment, descrambleImage } from "../lib/descramble";
import { AlertCircle, RefreshCw, ExternalLink } from "lucide-react";

type ReaderPageImageProps = React.ImgHTMLAttributes<HTMLImageElement>

export const ReaderPageImage: React.FC<ReaderPageImageProps> = ({
  src,
  alt,
  className,
  onLoad,
  onError,
  style,
  loading,
  ...props
}) => {
  const [descrambledSrc, setDescrambledSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const autoRetriedRef = useRef(false);
  const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (autoRetryTimerRef.current) clearTimeout(autoRetryTimerRef.current);
    };
  }, []);

  // Reset error & retry state when source changes
  useEffect(() => {
    setHasError(false);
    setIsRetrying(false);
    setRetryCount(0);
    autoRetriedRef.current = false;
    if (autoRetryTimerRef.current) {
      clearTimeout(autoRetryTimerRef.current);
      autoRetryTimerRef.current = null;
    }
  }, [src]);

  // Compute active source URL with cache-busting on retry
  const activeSrc = React.useMemo(() => {
    if (!src) return undefined;
    if (retryCount === 0) return src;
    if (src.startsWith("blob:") || src.startsWith("data:")) return src;
    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}_retry=${retryCount}`;
  }, [src, retryCount]);

  // Handle descrambled images
  useEffect(() => {
    let cancelled = false;

    if (!activeSrc) {
      const id = requestAnimationFrame(() => { if (!cancelled) setDescrambledSrc(null); });
      return () => { cancelled = true; cancelAnimationFrame(id); };
    }

    const descData = parseDescrambleFragment(activeSrc);
    if (!descData) {
      const id = requestAnimationFrame(() => { if (!cancelled) setDescrambledSrc(null); });
      return () => { cancelled = true; cancelAnimationFrame(id); };
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = activeSrc;
    img.onload = () => {
      if (cancelled) return;
      try {
        const decoded = descrambleImage(img, descData.tiles, descData.tileCols, descData.tileRows);
        setDescrambledSrc(decoded);
        setHasError(false);
        setIsRetrying(false);
      } catch (err) {
        console.error("Failed to descramble image:", err);
        setDescrambledSrc(null);
        handleTriggerError();
      }
    };
    img.onerror = () => {
      if (cancelled) return;
      setDescrambledSrc(null);
      handleTriggerError();
    };
    return () => { cancelled = true; };
  }, [activeSrc]);

  const handleTriggerError = useCallback(() => {
    // Attempt 1 silent auto-retry after 1.2s for transient CDN/network blips
    if (!autoRetriedRef.current) {
      autoRetriedRef.current = true;
      setIsRetrying(true);
      autoRetryTimerRef.current = setTimeout(() => {
        setRetryCount(c => c + 1);
        setIsRetrying(false);
      }, 1200);
      return;
    }

    setHasError(true);
    setIsRetrying(false);
  }, []);

  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRetrying(true);
    setHasError(false);
    // Increment retry key to force browser cache-bust
    setRetryCount(Date.now());
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(false);
    setIsRetrying(false);
    if (onLoad) {
      onLoad(e);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (onError) {
      onError(e);
    }
    handleTriggerError();
  };

  const finalSrc = descrambledSrc || activeSrc;
  const isHttp = typeof src === "string" && (src.startsWith("http://") || src.startsWith("https://"));

  if (hasError) {
    return (
      <div
        className="flex flex-col items-center justify-center p-6 my-4 mx-auto rounded-2xl text-center select-none"
        style={{
          background: "rgba(18, 18, 18, 0.88)",
          border: "1px solid var(--border)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          minHeight: 280,
          width: "100%",
          maxWidth: 460,
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: "rgba(220, 38, 38, 0.12)",
            border: "1px solid rgba(220, 38, 38, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <AlertCircle style={{ width: 22, height: 22, color: "var(--accent)" }} />
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)", margin: "0 0 6px" }}>
          Page Failed to Load
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--muted2)", margin: "0 0 20px", maxWidth: 320, lineHeight: 1.5 }}>
          {alt || "The image host timed out or encountered an error."}
        </p>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            onClick={handleManualRetry}
            disabled={isRetrying}
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              padding: "10px 20px",
              borderRadius: 12,
              cursor: isRetrying ? "not-allowed" : "pointer",
            }}
          >
            <RefreshCw
              style={{
                width: 14,
                height: 14,
              }}
              className={isRetrying ? "animate-spin" : ""}
            />
            <span>{isRetrying ? "Reloading page..." : "Retry Page"}</span>
          </button>

          {isHttp && (
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                padding: "10px 14px",
                borderRadius: 12,
                textDecoration: "none",
              }}
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink style={{ width: 13, height: 13 }} />
              <span>Open Image</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative block w-full min-w-0 text-center">
      <img
        ref={imgRef}
        src={finalSrc}
        alt={alt}
        className={className}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={style}
        loading={loading}
        {...props}
      />
      {isRetrying && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-sm pointer-events-none"
          style={{ background: "rgba(0, 0, 0, 0.45)", backdropFilter: "blur(4px)" }}
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/80 border border-white/10 text-xs font-bold text-white">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
            <span>Retrying page...</span>
          </div>
        </div>
      )}
    </div>
  );
};
