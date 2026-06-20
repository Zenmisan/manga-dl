import React, { useState, useEffect, useRef } from "react";
import { parseDescrambleFragment, descrambleImage } from "../lib/descramble";

interface ReaderPageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  // Add any custom props here if needed in future
}

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
    if (!src) {
      setDescrambledSrc(null);
      return;
    }

    const descData = parseDescrambleFragment(src);
    if (!descData) {
      setDescrambledSrc(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      try {
        const decoded = descrambleImage(
          img,
          descData.tiles,
          descData.tileCols,
          descData.tileRows
        );
        setDescrambledSrc(decoded);
      } catch (err) {
        console.error("Failed to descramble image:", err);
        setDescrambledSrc(null); // Fallback to original scrambled image
      }
    };
    img.onerror = () => {
      setDescrambledSrc(null);
    };
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
