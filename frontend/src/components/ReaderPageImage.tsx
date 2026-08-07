import React, { useState, useEffect, useRef } from "react";
import { parseDescrambleFragment, descrambleImage } from "../lib/descramble";

type ReaderPageImageProps = React.ImgHTMLAttributes<HTMLImageElement>

export const ReaderPageImage: React.FC<ReaderPageImageProps> = ({
  src,
  alt,
  className,
  onLoad,
  style,
  loading,
  ...props
}) => {
  const [descrambledSrc, setDescrambledSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!src) {
      const id = requestAnimationFrame(() => { if (!cancelled) setDescrambledSrc(null); });
      return () => { cancelled = true; cancelAnimationFrame(id); };
    }

    const descData = parseDescrambleFragment(src);
    if (!descData) {
      const id = requestAnimationFrame(() => { if (!cancelled) setDescrambledSrc(null); });
      return () => { cancelled = true; cancelAnimationFrame(id); };
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      if (cancelled) return;
      try {
        const decoded = descrambleImage(img, descData.tiles, descData.tileCols, descData.tileRows);
        setDescrambledSrc(decoded);
      } catch (err) {
        console.error("Failed to descramble image:", err);
        setDescrambledSrc(null);
      }
    };
    img.onerror = () => { if (!cancelled) setDescrambledSrc(null); };
    return () => { cancelled = true; };
  }, [src]);

  const finalSrc = descrambledSrc || src;

  return (
    <img
      ref={imgRef}
      src={finalSrc}
      alt={alt}
      className={className}
      onLoad={onLoad}
      style={style}
      loading={loading}
      {...props}
    />
  );
};
