"use client";
import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const GRID_SIZE      = 31;
const TILE           = 50;           // px per grid cell
const BOARD_PX       = GRID_SIZE * TILE;
const BUILDING_TILES = 3;            // all buildings are 3×3

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface VillageSync {
  id: number;
  building_id: number;
  name: string;
  level: number;
  grid_x: number;
  grid_y: number;
  is_built: boolean;
  finish_time?: number | null;
}

interface VillageMapProps {
  buildings: VillageSync[];
  onMoveBuilding: (instanceId: number, newX: number, newY: number, oldX: number, oldY: number) => void;
  placementMode: { building_id: number; size: number } | null;
  onBuild: (buildingId: number, gridX: number, gridY: number) => void;
  onSelectBuilding: (buildingId: number | null, gridX?: number, gridY?: number) => void;
  onCancelBuild: () => void;
}

// ─────────────────────────────────────────────
// Color palette (keyed by building name)
// ─────────────────────────────────────────────
// Covers all backend DB name variants (short keys like "Barrack", "ElixirColl",
// "ATower", "WTower", "GoldStor", "ElixirStor" and longer camelCase forms).
const BUILDING_COLORS: Record<string, number> = {
  "TownHall":        0x3b82f6,
  "GoldMine":        0xeab308,
  "ElixirCollector": 0xa855f7,
  "ElixirColl":      0xa855f7,
  "GoldStorage":     0xca8a04,
  "GoldStor":        0xca8a04,
  "ElixirStorage":   0x9333ea,
  "ElixirStor":      0x9333ea,
  "ArmyCamp":        0x78716c,
  "Barracks":        0xea580c,
  "Barrack":         0xea580c,
  "Cannon":          0x6b7280,
  "ArcherTower":     0x16a34a,
  "ATower":          0x16a34a,
  "WizardTower":     0x2563eb,
  "WTower":          0x2563eb,
};

function nameKey(name: string) { return name.replace(/\s/g, ""); }

function getBuildingColor(b: VillageSync): number {
  if (!b.is_built) return 0x9c3214;
  return BUILDING_COLORS[nameKey(b.name)] ?? 0x888888;
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function VillageMap({
  buildings,
  onMoveBuilding,
  placementMode,
  onBuild,
  onSelectBuilding,
}: VillageMapProps) {
  const canvasRef       = useRef<HTMLDivElement>(null);
  const appRef          = useRef<PIXI.Application | null>(null);
  const buildingLayerRef= useRef<PIXI.Container | null>(null);
  const ghostLayerRef   = useRef<PIXI.Container | null>(null);
  const mapContainerRef = useRef<PIXI.Container | null>(null);

  // ─── ENGINE BOOT (runs once) ────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x2d4a1e,     // dark forest green for visible outer area
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    appRef.current = app;
    canvasRef.current.appendChild(app.view as unknown as Node);

    // ── Map container (scales + centres everything) ──
    const mapContainer = new PIXI.Container();
    app.stage.addChild(mapContainer);
    mapContainerRef.current = mapContainer;

    // ── Grass board ──
    const bg = new PIXI.Graphics();
    bg.beginFill(0x4caf50);
    bg.drawRect(0, 0, BOARD_PX, BOARD_PX);
    bg.endFill();

    // Grid lines
    bg.lineStyle(1, 0x000000, 0.2);
    for (let i = 0; i <= GRID_SIZE; i++) {
      bg.moveTo(i * TILE, 0);       bg.lineTo(i * TILE, BOARD_PX);
      bg.moveTo(0, i * TILE);       bg.lineTo(BOARD_PX, i * TILE);
    }

    bg.eventMode = "static";
    bg.on("pointerdown", () => onSelectBuilding(null));
    mapContainer.addChild(bg);

    // ── Layers ──
    const buildingLayer = new PIXI.Container();
    mapContainer.addChild(buildingLayer);
    buildingLayerRef.current = buildingLayer;

    const ghostLayer = new PIXI.Container();
    mapContainer.addChild(ghostLayer);
    ghostLayerRef.current = ghostLayer;

    // ── Resize handler ──
    const onResize = () => {
      app.renderer.resize(window.innerWidth, window.innerHeight);
      const pad = 40;
      const scale = Math.min(
        (window.innerWidth  - pad) / BOARD_PX,
        (window.innerHeight - pad) / BOARD_PX,
      );
      mapContainer.scale.set(scale);
      mapContainer.x = (window.innerWidth  - BOARD_PX * scale) / 2;
      mapContainer.y = (window.innerHeight - BOARD_PX * scale) / 2;
    };
    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── BUILDING SYNC (re-runs whenever buildings array changes) ────────
  useEffect(() => {
    const layer = buildingLayerRef.current;
    if (!layer) return;

    layer.removeChildren();

    buildings.forEach((b) => {
      const g = new PIXI.Graphics();
      const color   = getBuildingColor(b);
      const px      = TILE * BUILDING_TILES;

      // Main body
      g.beginFill(color);
      g.lineStyle(2, 0x000000, 0.6);
      g.drawRoundedRect(0, 0, px, px, 4);
      g.endFill();

      // Under-construction hatching overlay
      if (!b.is_built) {
        g.lineStyle(2, 0x000000, 0.25);
        for (let d = 0; d < px * 2; d += 14) {
          g.moveTo(Math.min(d, px), Math.max(0, d - px));
          g.lineTo(Math.max(0, d - px), Math.min(d, px));
        }
      }

      // Level badge (top-right corner)
      const badge = new PIXI.Graphics();
      badge.beginFill(0x000000, 0.55);
      badge.drawRoundedRect(0, 0, 18, 14, 3);
      badge.endFill();
      badge.x = px - 20;
      badge.y = 3;
      g.addChild(badge);

      const lvlText = new PIXI.Text(`L${b.level}`, { fontSize: 9, fill: 0xffffff, fontWeight: "bold" });
      lvlText.x = badge.x + 2;
      lvlText.y = badge.y + 2;
      g.addChild(lvlText);

      // Building name label
      const nameTag = new PIXI.Text(b.name.replace(/([A-Z])/g, " $1").trim(), {
        fontSize: 9, fill: 0xffffff, fontWeight: "600",
        wordWrap: true, wordWrapWidth: px - 4, align: "center",
      });
      nameTag.x = (px - nameTag.width) / 2;
      nameTag.y = px - nameTag.height - 3;
      g.addChild(nameTag);

      // Construction icon (hammer)
      if (!b.is_built) {
        const con = new PIXI.Text("🔨", { fontSize: 18 });
        con.x = (px - con.width) / 2;
        con.y = (px - con.height) / 2 - 6;
        g.addChild(con);
      }

      // Position on grid (grid_x / grid_y are 1-indexed)
      g.x = (b.grid_x - 1) * TILE;
      g.y = (b.grid_y - 1) * TILE;

      // ── Drag & drop ──
      g.eventMode = "static";
      g.cursor    = "pointer";

      let dragging     = false;
      let startGX      = b.grid_x;
      let startGY      = b.grid_y;
      let startMouseX  = 0;
      let startMouseY  = 0;

      g.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
        dragging    = true;
        startGX     = b.grid_x;
        startGY     = b.grid_y;
        startMouseX = e.global.x;
        startMouseY = e.global.y;
        g.alpha     = 0.55;
        g.zIndex    = 999;
        layer.sortableChildren = true;
        e.stopPropagation();
      });

      g.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
        if (!dragging) return;
        const local = layer.toLocal(e.global);
        const snapX = Math.max(0, Math.floor(local.x / TILE));
        const snapY = Math.max(0, Math.floor(local.y / TILE));
        g.x = (snapX-1) * TILE;
        g.y = (snapY-1) * TILE;
      });

      const onDrop = () => {
        if (!dragging) return;
        dragging    = false;
        g.alpha     = 1;
        g.zIndex    = 0;

        const newGX = Math.floor(g.x / TILE) + 1;
        const newGY = Math.floor(g.y / TILE) + 1;

        // Clamp to valid range
        const clampedX = Math.min(Math.max(newGX, 1), GRID_SIZE - BUILDING_TILES);
        const clampedY = Math.min(Math.max(newGY, 1), GRID_SIZE - BUILDING_TILES);

        if (clampedX !== startGX || clampedY !== startGY) {
          onMoveBuilding(b.id, clampedX, clampedY, startGX, startGY);
        } else {
          // tap: select
          onSelectBuilding(b.building_id, b.grid_x, b.grid_y);
        }

        // Snap visual back to its real position (React state will re-render if move succeeds)
        g.x = (startGX - 1) * TILE;
        g.y = (startGY - 1) * TILE;
      };

      g.on("pointerup",        onDrop);
      g.on("pointerupoutside", onDrop);

      layer.addChild(g);
    });
  }, [buildings, onMoveBuilding, onSelectBuilding]);

  // ─── PLACEMENT GHOST ────────────────────────────────────────────────
  useEffect(() => {
    const ghostLayer  = ghostLayerRef.current;
    const app         = appRef.current;
    if (!ghostLayer || !app) return;

    ghostLayer.removeChildren();
    if (!placementMode) return;

    const sz = placementMode.size * TILE;

    const ghost = new PIXI.Graphics();
    ghost.beginFill(0x4ade80, 0.45);
    ghost.lineStyle(2, 0xffffff, 0.8);
    ghost.drawRoundedRect(0, 0, sz, sz, 4);
    ghost.endFill();
    ghost.visible = false;
    ghostLayer.addChild(ghost);

    // Grid-snap cross-hairs
    const cross = new PIXI.Graphics();
    cross.lineStyle(1, 0xffffff, 0.4);
    cross.moveTo(sz / 2, 0);    cross.lineTo(sz / 2, sz);
    cross.moveTo(0, sz / 2);    cross.lineTo(sz, sz / 2);
    ghost.addChild(cross);

    // Expand stage hit area to track mouse everywhere
    app.stage.eventMode = "static";
    app.stage.hitArea   = new PIXI.Rectangle(-1e5, -1e5, 2e5, 2e5);

    const onMove = (e: PIXI.FederatedPointerEvent) => {
      ghost.visible = true;
      const local   = ghostLayer.toLocal(e.global);
      ghost.x       = (Math.floor(local.x / TILE)-1) * TILE;
      ghost.y       = (Math.floor(local.y / TILE)-1) * TILE;
    };

    const onClick = () => {
      if (!ghost.visible) return;
      const gx = Math.floor(ghost.x / TILE) + 1;
      const gy = Math.floor(ghost.y / TILE) + 1;
      onBuild(placementMode.building_id, gx, gy);
    };

    app.stage.on("pointermove", onMove);
    app.stage.on("pointerup",   onClick);

    return () => {
      app.stage.off("pointermove", onMove);
      app.stage.off("pointerup",   onClick);
    };
  }, [placementMode, onBuild]);

  return (
    <div ref={canvasRef} className="w-full h-full absolute inset-0 overflow-hidden" />
  );
}