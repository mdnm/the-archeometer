import { useEffect, useMemo, useState } from "react";
import type { AspectEdge, BirthChart, HydratedPlanet } from "kaabalah/astrology";
import { buildKaabalisticMapData, type KaabalisticMapData, type KaabalisticMarkerDescriptor } from "kaabalah/semantic";
import {
  generateAstroGlyphSvg,
  generateAstroWheelSvg,
  generateTreeSvg,
  type AstroWheelPaletteOverrides,
  type TreeTargetActivationInput,
} from "kaabalah/visual";

const ASTRO_GLYPH_COLOR = "#e2d8c8";
const INACTIVE_COLOR = "#AAA";
const ASTRO_ASPECT_COLORS: NonNullable<AstroWheelPaletteOverrides["aspects"]> = {
  conjunction: "#6b7280",
  duodecile: "#9a8f7a",
  octile: "#f97316",
  sextile: "#2563eb",
  square: "#dc2626",
  trine: "#16a34a",
  trioctile: "#f97316",
  quincunx: "#7c3aed",
  opposition: "#dc2626",
};
const WHEEL_PALETTE: AstroWheelPaletteOverrides = {
  label: ASTRO_GLYPH_COLOR,
  ringStroke: "rgba(226, 216, 200, 0.44)",
  subtle: "rgba(226, 216, 200, 0.5)",
  zodiacGlyph: ASTRO_GLYPH_COLOR,
  houseLabel: ASTRO_GLYPH_COLOR,
  houseLine: "rgba(226, 216, 200, 0.46)",
  angleLabel: ASTRO_GLYPH_COLOR,
  angleLine: ASTRO_GLYPH_COLOR,
  planetGlyph: ASTRO_GLYPH_COLOR,
  planetTick: ASTRO_GLYPH_COLOR,
  aspectGuide: "rgba(226, 216, 200, 0.55)",
  aspects: ASTRO_ASPECT_COLORS,
  glyphHalo: "#0a1628",
};
const EXCLUDED_BODY_KEYS = new Set(["lilith true", "true lilith", "true node", "node true"]);
const WHEEL_EXCLUDED_BODIES = ["lilith true", "true lilith", "true node", "node true"];
const HOUSE_NAMES: Record<number, string> = { 1: "Ascendant", 4: "IC", 7: "Descendant", 10: "MC" };
const MATRIX_POINT_ORDER = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "mean node", "true node", "chiron",
];
const ASPECT_LEGEND_ORDER = [
  "conjunction", "opposition", "square", "trine", "sextile", "quincunx", "duodecile", "octile", "trioctile",
];

const glyphSvgCache = new Map<string, string | null>();

function normalizeAstroKey(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function normalizeAspectBodyKey(value: string) {
  const normalized = normalizeAstroKey(value);
  if (normalized === "asc" || normalized === "ac") return "ascendant";
  if (normalized === "midheaven") return "mc";
  return normalized;
}

function isFilteredBody(value: string) {
  return EXCLUDED_BODY_KEYS.has(normalizeAstroKey(value));
}

function getAspectColor(aspect: string) {
  return ASTRO_ASPECT_COLORS[aspect as keyof typeof ASTRO_ASPECT_COLORS] ?? ASTRO_GLYPH_COLOR;
}

function formatAspectName(aspect: string) {
  return aspect.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getCachedGlyphSvg(glyph: string, size: number, color: string) {
  const cacheKey = `${glyph}|${size}|${color}`;
  if (!glyphSvgCache.has(cacheKey)) {
    try {
      glyphSvgCache.set(cacheKey, generateAstroGlyphSvg(glyph, { size, color, background: "transparent" }));
    } catch {
      glyphSvgCache.set(cacheKey, null);
    }
  }
  return glyphSvgCache.get(cacheKey) ?? null;
}

function AstroGlyph({ glyph, size = 18, color = ASTRO_GLYPH_COLOR, className = "" }: {
  glyph: string; size?: number; color?: string; className?: string;
}) {
  const svg = getCachedGlyphSvg(glyph, size, color);
  if (!svg) return null;
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 align-[-0.125em] [&>svg]:h-full [&>svg]:w-full ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function getVisiblePlanetEntries(chart: BirthChart): Array<[string, HydratedPlanet]> {
  return Object.entries(chart.planets)
    .filter(([key, planet]) => !isFilteredBody(key) && !isFilteredBody(planet.name))
    .sort(([leftKey], [rightKey]) => {
      const leftIndex = MATRIX_POINT_ORDER.indexOf(normalizeAspectBodyKey(leftKey));
      const rightIndex = MATRIX_POINT_ORDER.indexOf(normalizeAspectBodyKey(rightKey));
      const leftOrder = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const rightOrder = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      return leftOrder - rightOrder;
    });
}

function getPlanetByKey(entries: Array<[string, HydratedPlanet]>, key: string) {
  return entries.find(([entryKey]) => normalizeAspectBodyKey(entryKey) === key)?.[1] ?? null;
}

function getVisibleAspects(aspects: AspectEdge[]) {
  return aspects.filter((a) => !isFilteredBody(a.planetA) && !isFilteredBody(a.planetB));
}

function getCarrierSphereKey(marker: KaabalisticMarkerDescriptor) {
  if (marker.kind !== "astrology" || marker.targetType !== "sphere" || !marker.sign) return null;
  return `${marker.targetId}|${marker.sourceType}|${marker.sourceName}|${marker.sign ?? ""}`;
}

function buildCarrierSphereKeySet(mapData: KaabalisticMapData) {
  const keys = new Set<string>();
  for (const marker of mapData.markers) {
    if (marker.kind !== "astrology" || marker.mapping !== "carrier-sphere") continue;
    const key = getCarrierSphereKey(marker);
    if (key) keys.add(key);
  }
  return keys;
}

function shouldHideSphereMarker(marker: KaabalisticMarkerDescriptor, carrierSphereKeys: ReadonlySet<string>) {
  if (marker.mapping === "carrier-sphere" || marker.targetType !== "sphere") return false;
  const key = getCarrierSphereKey(marker);
  return Boolean(key && carrierSphereKeys.has(key));
}

function buildActivationInputs(mapData: KaabalisticMapData, carrierSphereKeys: ReadonlySet<string>): TreeTargetActivationInput[] {
  const activations: TreeTargetActivationInput[] = [];
  let totalVisible = 0;

  const sphereCounts = new Map<string, number>();
  for (const sphere of mapData.spheres) {
    const visible = (mapData.sphereMarkers[sphere.id] ?? []).filter(
      (marker) => !shouldHideSphereMarker(marker, carrierSphereKeys),
    );
    sphereCounts.set(sphere.id, visible.length);
    totalVisible += visible.length;
  }

  const pathCounts = new Map<string, number>();
  for (const path of mapData.paths) {
    const count = (mapData.pathMarkers[path.id] ?? []).length;
    pathCounts.set(path.id, count);
    totalVisible += count;
  }

  for (const [sphereId, count] of sphereCounts) {
    activations.push({
      targetId: sphereId as TreeTargetActivationInput["targetId"],
      targetType: "sphere",
      count,
      total: totalVisible,
    });
  }

  for (const [pathId, count] of pathCounts) {
    activations.push({
      targetId: pathId as TreeTargetActivationInput["targetId"],
      targetType: "path",
      count,
      total: totalVisible,
    });
  }

  return activations;
}

function buildTreeHighlights(activationInputs: readonly TreeTargetActivationInput[]) {
  const spheres: Record<string, string> = {};
  const paths: Record<string, string> = {};

  for (const input of activationInputs) {
    if (input.count > 0) continue;
    if (input.targetType === "sphere") {
      spheres[String(input.targetId)] = INACTIVE_COLOR;
    } else {
      paths[String(input.targetId)] = INACTIVE_COLOR;
    }
  }

  return { spheres, paths, specialSphereMode: "plain" as const };
}

function BigThreeCard({ label, sign, degree }: { label: string; sign: string; degree: string }) {
  return (
    <div className="text-center">
      <AstroGlyph glyph={sign} size={48} className="mx-auto" />
      <div className="text-xl font-serif font-bold text-[#e2d8c8] mt-2">{sign}</div>
      <div className="text-sm text-[#e2d8c8]/70 tabular-nums mt-1">{degree}</div>
      <div className="text-xs uppercase tracking-wider text-[#e2d8c8]/50 mt-1.5">{label}</div>
    </div>
  );
}

type MatrixEntry = { key: string; label: string; glyph: string };

function AspectsMatrix({ aspects, entries }: { aspects: AspectEdge[]; entries: MatrixEntry[] }) {
  const aspectLookup = useMemo(() => {
    const map = new Map<string, AspectEdge>();
    for (const a of aspects) {
      const planetA = normalizeAspectBodyKey(a.planetA);
      const planetB = normalizeAspectBodyKey(a.planetB);
      map.set(`${planetA}|${planetB}`, a);
      map.set(`${planetB}|${planetA}`, a);
    }
    return map;
  }, [aspects]);

  const legendAspects = useMemo(() => {
    const activeAspects = new Set(aspects.map((a) => a.aspect));
    return ASPECT_LEGEND_ORDER.filter((a) => activeAspects.has(a as AspectEdge["aspect"]));
  }, [aspects]);

  if (entries.length < 2 || aspects.length === 0) return null;

  return (
    <div>
      <h2 className="text-2xl font-serif font-semibold text-[#e2d8c8] mb-4">Aspects</h2>
      <div className="overflow-x-auto">
        <div className="inline-block">
          {entries.map((row, i) => (
            <div key={row.key} className="flex">
              {Array.from({ length: i + 1 }).map((_, j) => {
                if (j === i) {
                  return (
                    <div
                      key={`d-${i}`}
                      className="w-12 h-12 grid place-items-center border border-white/15 text-sm font-medium text-[#e2d8c8]"
                      title={row.label}
                    >
                      <AstroGlyph glyph={row.glyph} size={30} />
                    </div>
                  );
                }
                const col = entries[j];
                const edge = aspectLookup.get(`${row.key}|${col.key}`);
                const color = edge ? getAspectColor(edge.aspect) : undefined;
                return (
                  <div
                    key={`c-${i}-${j}`}
                    className="w-12 h-12 grid place-items-center border border-white/15 text-sm"
                    title={edge ? `${row.label} ${formatAspectName(edge.aspect)} ${col.label} - ${edge.orb.toFixed(1)}°` : ""}
                  >
                    {edge && color ? <AstroGlyph glyph={edge.aspect} size={28} color={color} /> : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3 mt-5 text-base text-[#e2d8c8]/80">
          {legendAspects.map((name) => {
            const color = getAspectColor(name);
            return (
              <div key={name} className="flex items-center gap-1">
                <AstroGlyph glyph={name} size={22} color={color} />
                <span className="capitalize">{name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function NatalChartWheel() {
  const [chart, setChart] = useState<BirthChart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function generate() {
      try {
        const { getSwissEph, getBirthChart } = await import("kaabalah/astrology");

        await getSwissEph({
          wasmPath: "/swisseph.wasm",
          ephePath: "/ephe",
        });

        const result = await getBirthChart({
          date: { year: 1842, month: 3, day: 26, hour: 1, minute: 0, second: 0 },
          latitude: 48.8566,
          longitude: 2.3522,
          timeZoneSettings: { timeZone: "Europe/Paris" },
        });

        setChart(result);
        window.dispatchEvent(
          new CustomEvent("archeometer:analytics", {
            detail: {
              event: "tool_result_viewed",
              tool_type: "natal_chart",
              result_type: "chart_rendered",
            },
          }),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate chart");
      } finally {
        setLoading(false);
      }
    }
    generate();
  }, []);

  const wheelSvg = useMemo(
    () => chart ? generateAstroWheelSvg(chart, {
      background: "transparent",
      palette: WHEEL_PALETTE,
      excludeBodies: WHEEL_EXCLUDED_BODIES,
    }) : null,
    [chart],
  );

  const treeSvg = useMemo(() => {
    if (!chart) return null;

    const mapData = buildKaabalisticMapData({ astrology: chart });
    const carrierSphereKeys = buildCarrierSphereKeySet(mapData);
    const activationInputs = buildActivationInputs(mapData, carrierSphereKeys);
    const highlights = buildTreeHighlights(activationInputs);

    return generateTreeSvg({
      background: "transparent",
      highlights,
    });
  }, [chart]);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-300/30 border-t-indigo-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <p className="text-red-400 text-sm">Error: {error}</p>
      </div>
    );
  }

  if (!chart || !wheelSvg) return null;

  const planetEntries = getVisiblePlanetEntries(chart);
  const planets = planetEntries.map(([, planet]) => planet);
  const visibleAspects = getVisibleAspects(chart.aspects);
  const aspectMatrixEntries: MatrixEntry[] = [
    ...planetEntries.map(([key, planet]) => ({
      key: normalizeAspectBodyKey(key),
      label: planet.name,
      glyph: key,
    })),
    { key: "ascendant", label: "Ascendant", glyph: "ascendant" },
    { key: "mc", label: "MC", glyph: "mc" },
  ];
  const { ascendant } = chart.houses;
  const sun = getPlanetByKey(planetEntries, "sun");
  const moon = getPlanetByKey(planetEntries, "moon");
  const sortedHouses = [...chart.houses.houses].sort((a, b) => a.house - b.house);

  return (
    <div className="space-y-8">
      {/* Wheel */}
      <div className="rounded-[1.75rem] border border-white/10 bg-[#051427]/70 px-4 py-6 sm:px-8 sm:py-9">
        <div className="mx-auto">
          <div
            className="[&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: wheelSvg }}
          />
        </div>
      </div>

      {/* Big Three */}
      <div className="flex items-center justify-around py-6 rounded-lg bg-[#051427]/70 border border-white/10">
        <BigThreeCard label="Rising" sign={ascendant.sign} degree={ascendant.traditionalFormat} />
        {sun && <BigThreeCard label="Sun" sign={sun.zodiacPosition.sign} degree={sun.zodiacPosition.traditionalFormat} />}
        {moon && <BigThreeCard label="Moon" sign={moon.zodiacPosition.sign} degree={moon.zodiacPosition.traditionalFormat} />}
      </div>

      {/* Kaabalistic Tree of Life */}
      {treeSvg && (
        <div className="rounded-[1.75rem] border border-white/10 bg-[#051427]/70 px-4 py-6 sm:px-8 sm:py-9">
          <h2 className="text-2xl font-serif font-semibold text-[#e2d8c8] mb-5">Kaabalistic Tree of Life</h2>
          <div className="mx-auto max-w-[34rem]">
            <div
              className="[&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: treeSvg }}
            />
          </div>
          <p className="text-[#e2d8c8]/50 mt-4 text-center text-sm">
            Spheres and paths highlighted by astrological correspondences
          </p>
        </div>
      )}

      {/* Planets table */}
      <div className="rounded-[1.75rem] border border-white/10 bg-[#051427]/70 px-4 py-6 sm:px-8 sm:py-9">
        <h2 className="text-2xl font-serif font-semibold text-[#e2d8c8] mb-5">Planets</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-lg">
            <thead>
              <tr className="border-b border-[#e2d8c8]/20 text-left">
                <th className="pb-3 text-sm uppercase tracking-[0.22em] text-[#e2d8c8]/75 font-normal">Planet</th>
                <th className="pb-3 text-sm uppercase tracking-[0.22em] text-[#e2d8c8]/75 font-normal">Sign</th>
                <th className="pb-3 text-sm uppercase tracking-[0.22em] text-[#e2d8c8]/75 font-normal text-right">Degree</th>
                <th className="pb-3 text-sm uppercase tracking-[0.22em] text-[#e2d8c8]/75 font-normal text-right">House</th>
              </tr>
            </thead>
            <tbody>
              {planets.map((planet) => (
                <tr key={planet.id} className="border-b border-white/5">
                  <td className="py-4 font-medium text-[#e2d8c8]">
                    <span className="inline-flex items-center gap-3">
                      <AstroGlyph glyph={planet.name} size={30} />
                      {planet.name}
                    </span>
                  </td>
                  <td className="py-4 text-[#e2d8c8]">
                    <span className="inline-flex items-center gap-2.5">
                      <AstroGlyph glyph={planet.zodiacPosition.sign} size={25} />
                      {planet.zodiacPosition.sign}
                    </span>
                  </td>
                  <td className="py-4 text-right tabular-nums text-[#e2d8c8]/75">
                    {planet.zodiacPosition.traditionalFormat}
                  </td>
                  <td className="py-4 text-right tabular-nums text-[#e2d8c8]/75">
                    {planet.zodiacPosition.house}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Houses table */}
      <div className="rounded-[1.75rem] border border-white/10 bg-[#051427]/70 px-4 py-6 sm:px-8 sm:py-9">
        <h2 className="text-2xl font-serif font-semibold text-[#e2d8c8] mb-5">Houses</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-lg">
            <thead>
              <tr className="border-b border-[#e2d8c8]/20 text-left">
                <th className="pb-3 text-sm uppercase tracking-[0.22em] text-[#e2d8c8]/75 font-normal">House</th>
                <th className="pb-3 text-sm uppercase tracking-[0.22em] text-[#e2d8c8]/75 font-normal">Sign</th>
                <th className="pb-3 text-sm uppercase tracking-[0.22em] text-[#e2d8c8]/75 font-normal text-right">Degree</th>
              </tr>
            </thead>
            <tbody>
              {sortedHouses.map((house) => (
                <tr key={house.house} className="border-b border-white/5">
                  <td className="py-4 font-medium text-[#e2d8c8]">
                    {HOUSE_NAMES[house.house] ?? `House ${house.house}`}
                  </td>
                  <td className="py-4 text-[#e2d8c8]">
                    <span className="inline-flex items-center gap-2.5">
                      <AstroGlyph glyph={house.sign} size={25} />
                      {house.sign}
                    </span>
                  </td>
                  <td className="py-4 text-right tabular-nums text-[#e2d8c8]/85">
                    {house.traditionalFormat}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aspects matrix */}
      <div className="rounded-[1.75rem] border border-white/10 bg-[#051427]/70 px-4 py-6 sm:px-8 sm:py-9">
        <AspectsMatrix aspects={visibleAspects} entries={aspectMatrixEntries} />
      </div>
    </div>
  );
}
