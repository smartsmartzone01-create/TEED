/* eslint-disable @next/next/no-img-element */

import Image from "next/image";

type StorefrontImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

function remoteImageKind(src: string): "remote" | "local" | "blocked" {
  try {
    const url = new URL(src);
    if (url.protocol === "https:") {
      return "remote";
    }
    if (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    ) {
      return "remote";
    }
    return "blocked";
  } catch {
    return "local";
  }
}

export function StorefrontImage({
  src,
  alt,
  width,
  height,
  className,
}: StorefrontImageProps) {
  const kind = remoteImageKind(src);

  if (kind === "blocked") {
    return null;
  }

  if (kind === "remote") {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return <Image src={src} alt={alt} width={width} height={height} className={className} />;
}
