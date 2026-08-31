import type { StyleSpecification } from "maplibre-gl";

/**
 * Alternate base map styles for the Google-Maps-style layer picker. Only
 * sources with real, free (no API key) tile data are included here -- there
 * is no free real-time traffic-flow tile source anywhere, and OSM's
 * public-transit tagging for El Salvador is too sparse to show anything
 * useful, so "Tráfico"/"Transporte público" are deliberately not
 * implemented rather than shipped as a fake or empty layer.
 */
export type BaseLayer = "default" | "satellite" | "terrain";

// Esri World Imagery -- free, no API key, real aerial/satellite photography.
// Note the tile path order is z/y/x (row before column), not the usual z/x/y.
export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "esri-imagery": {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Esri, Maxar, Earthstar Geographics",
    },
    "esri-labels": {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: "esri-imagery-layer", type: "raster", source: "esri-imagery" },
    { id: "esri-labels-layer", type: "raster", source: "esri-labels" },
  ],
};

// OpenTopoMap -- free, no API key, real topographic/hillshade rendering.
export const TERRAIN_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    opentopomap: {
      type: "raster",
      tiles: [
        "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
        "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
        "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 17,
      attribution: "OpenTopoMap (CC-BY-SA)",
    },
  },
  layers: [{ id: "opentopomap-layer", type: "raster", source: "opentopomap" }],
};
