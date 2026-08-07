export interface DescrambleData {
  tiles: number[];
  tileCols: number;
  tileRows: number;
}

export function parseDescrambleFragment(url: string): DescrambleData | null {
  try {
    let targetUrl = url;
    if (url.includes("image-proxy?url=") || url.includes("image-proxy?api_key=")) {
      // Extract target url inside query param
      const urlObj = new URL(url);
      const innerUrl = urlObj.searchParams.get("url");
      if (innerUrl) {
        targetUrl = innerUrl;
      }
    }

    const hashIndex = targetUrl.indexOf("#");
    if (hashIndex === -1) return null;
    const fragment = decodeURIComponent(targetUrl.substring(hashIndex + 1));
    if (fragment.startsWith("{")) {
      const data = JSON.parse(fragment);
      if (
        Array.isArray(data.tiles) &&
        typeof data.tileCols === "number" &&
        typeof data.tileRows === "number"
      ) {
        return {
          tiles: data.tiles,
          tileCols: data.tileCols,
          tileRows: data.tileRows,
        };
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

export function unwrapAstro(el: unknown): unknown {
  if (Array.isArray(el)) {
    if (el.length === 2 && typeof el[0] === "number") {
      return unwrapAstro(el[1]);
    }
    return el.map(unwrapAstro);
  }
  if (typeof el === "object" && el !== null) {
    const out: Record<string, unknown> = {};
    const record = el as Record<string, unknown>;
    for (const k in record) {
      if (Object.prototype.hasOwnProperty.call(record, k)) {
        out[k] = unwrapAstro(record[k]);
      }
    }
    return out;
  }
  return el;
}

export function descrambleImage(
  img: HTMLImageElement,
  tiles: number[],
  cols: number,
  rows: number
): string {
  const canvas = document.createElement("canvas");
  const tileW = Math.floor(img.naturalWidth / cols);
  const tileH = Math.floor(img.naturalHeight / rows);

  canvas.width = tileW * cols;
  canvas.height = tileH * rows;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2d context");
  }

  for (let w = 0; w < tiles.length; w++) {
    const j = tiles[w];
    const srcCol = w % cols;
    const srcRow = Math.floor(w / cols);
    const dstCol = j % cols;
    const dstRow = Math.floor(j / cols);

    ctx.drawImage(
      img,
      srcCol * tileW,
      srcRow * tileH,
      tileW,
      tileH,
      dstCol * tileW,
      dstRow * tileH,
      tileW,
      tileH
    );
  }

  return canvas.toDataURL("image/webp", 0.9);
}
