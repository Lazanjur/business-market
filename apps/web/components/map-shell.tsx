"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

type Pin = {
  entityId: string;
  entityName: string;
  locationId: string;
  locationType: string;
  city: string;
  countryCode: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  trustScore?: number;
};

type Cluster = {
  id: string;
  count: number;
  lat: number;
  lng: number;
  locationTypes: readonly string[];
  countryCodes: readonly string[];
};

type CoverageRing = {
  id: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  label: string;
};

function buildCircleGeoJson(ring: CoverageRing, points = 48) {
  const earthRadiusKm = 6371;
  const angularDistance = ring.radiusKm / earthRadiusKm;
  const lat = (ring.centerLat * Math.PI) / 180;
  const lng = (ring.centerLng * Math.PI) / 180;
  const coordinates: [number, number][] = [];

  for (let i = 0; i <= points; i += 1) {
    const bearing = (2 * Math.PI * i) / points;
    const pointLat = Math.asin(
      Math.sin(lat) * Math.cos(angularDistance) +
        Math.cos(lat) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const pointLng =
      lng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat),
        Math.cos(angularDistance) - Math.sin(lat) * Math.sin(pointLat)
      );
    coordinates.push([(pointLng * 180) / Math.PI, (pointLat * 180) / Math.PI]);
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          label: ring.label,
          radiusKm: ring.radiusKm
        },
        geometry: {
          type: "Polygon",
          coordinates: [coordinates]
        }
      }
    ]
  };
}

export function MapShell({
  pins,
  clusters = [],
  coverageRings = []
}: {
  pins: Pin[];
  clusters?: Cluster[];
  coverageRings?: CoverageRing[];
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !mapRef.current) {
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [6.5, 51.5],
      zoom: 4
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      coverageRings.forEach((ring) => {
        const sourceId = `coverage-${ring.id}`;
        map.addSource(sourceId, {
          type: "geojson",
          data: buildCircleGeoJson(ring) as any
        });

        map.addLayer({
          id: `${sourceId}-fill`,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.12
          }
        });

        map.addLayer({
          id: `${sourceId}-line`,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2,
            "line-opacity": 0.6
          }
        });
      });
    });

    for (const pin of pins) {
      const popup = new mapboxgl.Popup({ offset: 12 }).setHTML(`
        <div style="color:#0b1220;font:12px Inter, sans-serif; min-width:180px">
          <strong>${pin.entityName}</strong><br />
          ${pin.city}, ${pin.countryCode}<br />
          ${pin.locationType.replaceAll("_", " ")}<br />
          ${pin.distanceKm ? `${pin.distanceKm} km away` : ""}
        </div>
      `);

      new mapboxgl.Marker({ color: "#4f8cff" })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(popup)
        .addTo(map);
    }

    for (const cluster of clusters) {
      const el = document.createElement("div");
      el.className = "map-cluster-marker";
      el.innerText = String(cluster.count);
      el.style.width = "34px";
      el.style.height = "34px";
      el.style.borderRadius = "999px";
      el.style.background = "#0ea5e9";
      el.style.color = "white";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.fontSize = "12px";
      el.style.fontWeight = "700";
      el.style.boxShadow = "0 8px 24px rgba(2, 6, 23, 0.24)";

      const popup = new mapboxgl.Popup({ offset: 12 }).setHTML(`
        <div style="color:#0b1220;font:12px Inter, sans-serif; min-width:180px">
          <strong>${cluster.count} suppliers in this area</strong><br />
          Types: ${cluster.locationTypes.join(", ")}<br />
          Countries: ${cluster.countryCodes.join(", ")}
        </div>
      `);

      new mapboxgl.Marker({ element: el })
        .setLngLat([cluster.lng, cluster.lat])
        .setPopup(popup)
        .addTo(map);
    }

    return () => {
      map.remove();
    };
  }, [pins, clusters, coverageRings]);

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return (
      <div className="map-placeholder">
        <div className="map-placeholder-grid" />
        <div className="map-overlay-card">
          <strong>Mapbox token missing</strong>
          <p>
            Add <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the live vector map. The page still
            renders the supplier intelligence panel, clustering preview, and delivery-coverage
            design without provider credentials.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="live-map" />;
}
