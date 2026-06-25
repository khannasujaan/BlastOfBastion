"use client";
import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";

const GRID_SIZE = 31;
const TILE = 50;
const BOARD_PX = GRID_SIZE * TILE;
const BUILDING_TILES = 3;

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

const BUILDING_ASSETS: Record<string, { folder: string; prefix: string }> = {
  "TownHall": { folder: "resources/thall", prefix: "thall" },
  "GoldMine": { folder: "resources/gmine", prefix: "gmine" },
  "ElixirCollector": { folder: "resources/ecoll", prefix: "ecoll" },
  "ElixirColl": { folder: "resources/ecoll", prefix: "ecoll" },
  "GoldStorage": { folder: "resources/gstore", prefix: "gstore" },
  "GoldStor": { folder: "resources/gstore", prefix: "gstore" },
  "ElixirStorage": { folder: "resources/estore", prefix: "estore" },
  "ElixirStor": { folder: "resources/estore", prefix: "estore" },
  "ArmyCamp": { folder: "army/camp", prefix: "camp" },
  "Barracks": { folder: "army/barracks", prefix: "barracks" },
  "Barrack": { folder: "army/barracks", prefix: "barracks" },
  "Cannon": { folder: "defense/cannon", prefix: "cannon" },
  "ArcherTower": { folder: "defense/atower", prefix: "atower" },
  "ATower": { folder: "defense/atower", prefix: "atower" },
  "WizardTower": { folder: "defense/wtower", prefix: "wtower" },
  "WTower": { folder: "defense/wtower", prefix: "wtower" },
};

function nameKey(name: string) {
  return name.replace(/\s/g, "");
}

function getSpritePath(name: string, level: number): string {
  const asset = BUILDING_ASSETS[nameKey(name)];
  if (!asset) return `/assets/buildings/thall/thall1.png`;

  const safeLevel = Math.max(1, Math.min(level, 4));
  return `/assets/buildings/${asset.folder}/${asset.prefix}${safeLevel}.png`;
}

export default function VillageMap({
  buildings,
  onMoveBuilding,
  placementMode,
  onBuild,
  onSelectBuilding,
}: VillageMapProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const buildingLayerRef = useRef<PIXI.Container | null>(null);
  const ghostLayerRef = useRef<PIXI.Container | null>(null);
  const mapContainerRef = useRef<PIXI.Container | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x2d4a1e,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    appRef.current = app;
    canvasRef.current.appendChild(app.view as unknown as Node);

    const mapContainer = new PIXI.Container();
    app.stage.addChild(mapContainer);
    mapContainerRef.current = mapContainer;

    const bg = new PIXI.Graphics();
    bg.beginFill(0x4caf50);
    bg.drawRect(0, 0, BOARD_PX, BOARD_PX);
    bg.endFill();

    bg.lineStyle(1, 0x000000, 0.2);
    for (let i = 0; i <= GRID_SIZE; i++) {
      bg.moveTo(i * TILE, 0);
      bg.lineTo(i * TILE, BOARD_PX);
      bg.moveTo(0, i * TILE);
      bg.lineTo(BOARD_PX, i * TILE);
    }

    bg.eventMode = "static";
    bg.on("pointerdown", () => onSelectBuilding(null));
    mapContainer.addChild(bg);

    const buildingLayer = new PIXI.Container();
    mapContainer.addChild(buildingLayer);
    buildingLayerRef.current = buildingLayer;

    const ghostLayer = new PIXI.Container();
    mapContainer.addChild(ghostLayer);
    ghostLayerRef.current = ghostLayer;

    const onResize = () => {
      app.renderer.resize(window.innerWidth, window.innerHeight);
      const pad = 40;
      const scale = Math.min(
        (window.innerWidth - pad) / BOARD_PX,
        (window.innerHeight - pad) / BOARD_PX,
      );
      mapContainer.scale.set(scale);
      mapContainer.x = (window.innerWidth - BOARD_PX * scale) / 2;
      mapContainer.y = (window.innerHeight - BOARD_PX * scale) / 2;
    };
    onResize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    };
  }, []);

  useEffect(() => {
    const layer = buildingLayerRef.current;
    if (!layer) return;

    layer.removeChildren();

    buildings.forEach((b) => {
      const g = new PIXI.Container();
      const px = TILE * BUILDING_TILES;

      const territory = new PIXI.Graphics();
      territory.beginFill(0x84dc16, 0.25); 
      territory.lineStyle(2, 0x84ec16, 0.4);
      territory.drawRoundedRect(0, 0, px, px, 4); 
      territory.endFill();
      g.addChild(territory);

      const spritePath = getSpritePath(b.name, b.level);
      const sprite = PIXI.Sprite.from(spritePath);
      sprite.width = px;
      sprite.height = px;
      g.addChild(sprite);

      if (!b.is_built) {
        const overlay = new PIXI.Graphics();

        overlay.beginFill(0x000000, 0.4);
        overlay.drawRect(0, 0, px, px);
        overlay.endFill();

        overlay.lineStyle(2, 0xffffff, 0.3);
        for (let d = 0; d < px * 2; d += 14) {
          overlay.moveTo(Math.min(d, px), Math.max(0, d - px));
          overlay.lineTo(Math.max(0, d - px), Math.min(d, px));
        }
        g.addChild(overlay);

        const con = new PIXI.Text("🔨", { fontSize: 24 });
        con.x = (px - con.width) / 2;
        con.y = (px - con.height) / 2 - 10;
        g.addChild(con);
      }

      const uiLayer = new PIXI.Graphics();
      uiLayer.beginFill(0x000000, 0.65);
      uiLayer.drawRoundedRect(0, 0, 18, 14, 3);
      uiLayer.endFill();
      uiLayer.x = px - 20;
      uiLayer.y = 3;
      g.addChild(uiLayer);

      const lvlText = new PIXI.Text(`L${b.level}`, {
        fontSize: 9,
        fill: 0xffffff,
        fontWeight: "bold",
      });
      lvlText.x = uiLayer.x + 2;
      lvlText.y = uiLayer.y + 2;
      g.addChild(lvlText);

      const nameTag = new PIXI.Text(b.name.replace(/([A-Z])/g, " $1").trim(), {
        fontSize: 10,
        fill: 0xffffff,
        fontWeight: "bold",
        stroke: 0x000000,
        strokeThickness: 3,
        wordWrap: true,
        wordWrapWidth: px - 4,
        align: "center",
      });
      nameTag.x = (px - nameTag.width) / 2;
      nameTag.y = px - nameTag.height - 3;
      g.addChild(nameTag);

      g.x = (b.grid_x - 1) * TILE;
      g.y = (b.grid_y - 1) * TILE;

      g.eventMode = "static";
      g.cursor = "pointer";

      let dragging = false;
      let startGX = b.grid_x;
      let startGY = b.grid_y;

      g.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
        dragging = true;
        startGX = b.grid_x;
        startGY = b.grid_y;
        g.alpha = 0.7;
        g.zIndex = 999;
        layer.sortableChildren = true;
        e.stopPropagation();
      });

      g.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
        if (!dragging) return;
        const local = layer.toLocal(e.global);
        const snapX = Math.max(0, Math.floor(local.x / TILE));
        const snapY = Math.max(0, Math.floor(local.y / TILE));
        g.x = (snapX - 1) * TILE;
        g.y = (snapY - 1) * TILE;
      });

      const onDrop = () => {
        if (!dragging) return;
        dragging = false;
        g.alpha = 1;
        g.zIndex = 0;

        const newGX = Math.floor(g.x / TILE) + 1;
        const newGY = Math.floor(g.y / TILE) + 1;

        const clampedX = Math.min(Math.max(newGX, 1), GRID_SIZE - BUILDING_TILES);
        const clampedY = Math.min(Math.max(newGY, 1), GRID_SIZE - BUILDING_TILES);

        if (clampedX !== startGX || clampedY !== startGY) {
          onMoveBuilding(b.id, clampedX, clampedY, startGX, startGY);
        } else {
          onSelectBuilding(b.building_id, b.grid_x, b.grid_y);
        }

        g.x = (startGX - 1) * TILE;
        g.y = (startGY - 1) * TILE;
      };

      g.on("pointerup", onDrop);
      g.on("pointerupoutside", onDrop);

      layer.addChild(g);
    });
  }, [buildings, onMoveBuilding, onSelectBuilding]);

  useEffect(() => {
    const ghostLayer = ghostLayerRef.current;
    const app = appRef.current;
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

    const cross = new PIXI.Graphics();
    cross.lineStyle(1, 0xffffff, 0.4);
    cross.moveTo(sz / 2, 0);
    cross.lineTo(sz / 2, sz);
    cross.moveTo(0, sz / 2);
    cross.lineTo(sz, sz / 2);
    ghost.addChild(cross);

    app.stage.eventMode = "static";
    app.stage.hitArea = new PIXI.Rectangle(-1e5, -1e5, 2e5, 2e5);

    const onMove = (e: PIXI.FederatedPointerEvent) => {
      ghost.visible = true;
      const local = ghostLayer.toLocal(e.global);
      ghost.x = (Math.floor(local.x / TILE) - 1) * TILE;
      ghost.y = (Math.floor(local.y / TILE) - 1) * TILE;
    };

    const onClick = () => {
      if (!ghost.visible) return;
      const gx = Math.floor(ghost.x / TILE) + 1;
      const gy = Math.floor(ghost.y / TILE) + 1;
      onBuild(placementMode.building_id, gx, gy);
    };

    app.stage.on("pointermove", onMove);
    app.stage.on("pointerup", onClick);

    return () => {
      app.stage.off("pointermove", onMove);
      app.stage.off("pointerup", onClick);
    };
  }, [placementMode, onBuild]);

  return (
    <div ref={canvasRef} className="w-full h-full absolute inset-0 overflow-hidden" />
  );
}