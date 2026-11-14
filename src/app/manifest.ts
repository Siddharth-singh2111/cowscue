import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cowscue — Cattle rescue dispatch",
    short_name: "Cowscue",
    description: "Report injured stray cattle and track the rescue live.",
    start_url: "/",
    display: "standalone",
    background_color: "#fcfaf7",
    theme_color: "#e8742c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    shortcuts: [{ name: "Report a rescue", url: "/report" }],
  };
}
