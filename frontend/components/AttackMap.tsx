"use client";
import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { DeployedTroop } from "@/app/battle/page";

const GRID_SIZE      = 31;
const TILE           = 50;           
const BOARD_PX       = GRID_SIZE * TILE;
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

interface AttackMapProps {
  buildings: VillageSync[];
  deployedTroops: DeployedTroop[];
  onDeployTroop?: (gridX: number, gridY: number) => void; 
}

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

export default function AttackMap({
  buildings,
  deployedTroops,
  onDeployTroop
}: AttackMapProps) {
  const canvasRef       = useRef<HTMLDivElement>(null);
  const appRef          = useRef<PIXI.Application | null>(null);
  const buildingLayerRef= useRef<PIXI.Container | null>(null);
  const mapContainerRef = useRef<PIXI.Container | null>(null);
  const troopLayerRef   = useRef<PIXI.Container | null>(null);
  const onDeployRef = useRef(onDeployTroop);
  useEffect(() => {
    onDeployRef.current = onDeployTroop;
  }, [onDeployTroop]);
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
      bg.moveTo(i * TILE, 0);       bg.lineTo(i * TILE, BOARD_PX);
      bg.moveTo(0, i * TILE);       bg.lineTo(BOARD_PX, i * TILE);
    }

    bg.eventMode = "static";
    bg.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
        if (!onDeployRef.current) return;
        const localPos = bg.toLocal(e.global);
        const exactX = (localPos.x / TILE) + 1;
        const exactY = (localPos.y / TILE) + 1;
        
        onDeployRef.current(exactX, exactY);
    });
    
    mapContainer.addChild(bg);
    const buildingLayer = new PIXI.Container();
    mapContainer.addChild(buildingLayer);
    buildingLayerRef.current = buildingLayer;

    const troopLayer = new PIXI.Container();
    mapContainer.addChild(troopLayer);
    troopLayerRef.current = troopLayer;

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
  }, []); 

  useEffect(() => {
    const layer = buildingLayerRef.current;
    if (!layer) return;

    layer.removeChildren();

    buildings.forEach((b) => {
      const g       = new PIXI.Graphics();
      const color   = getBuildingColor(b);
      const px      = TILE * BUILDING_TILES;

      g.beginFill(color);
      g.lineStyle(2, 0x000000, 0.6);
      g.drawRoundedRect(0, 0, px, px, 4);
      g.endFill();

      if (!b.is_built) {
        g.lineStyle(2, 0x000000, 0.25);
        for (let d = 0; d < px * 2; d += 14) {
          g.moveTo(Math.min(d, px), Math.max(0, d - px));
          g.lineTo(Math.max(0, d - px), Math.min(d, px));
        }
      }

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

      const nameTag = new PIXI.Text(b.name.replace(/([A-Z])/g, " $1").trim(), {
        fontSize: 9, fill: 0xffffff, fontWeight: "600",
        wordWrap: true, wordWrapWidth: px - 4, align: "center",
      });
      nameTag.x = (px - nameTag.width) / 2;
      nameTag.y = px - nameTag.height - 3;
      g.addChild(nameTag);

      if (!b.is_built) {
        const con = new PIXI.Text("🔨", { fontSize: 18 });
        con.x = (px - con.width) / 2;
        con.y = (px - con.height) / 2 - 6;
        g.addChild(con);
      }

      g.x = (b.grid_x - 1) * TILE;
      g.y = (b.grid_y - 1) * TILE;

      layer.addChild(g);
    });
  }, [buildings]);

  useEffect(() => {
    const layer = troopLayerRef.current;
    if (!layer) return;

    layer.removeChildren();

    deployedTroops.forEach((t) => {
      const g = new PIXI.Graphics();
      
      g.beginFill(0xff3366); // Red/pink attacker color
      g.lineStyle(2, 0xffffff, 0.8);
      g.drawCircle(TILE / 2, TILE / 2, 16); 
      g.endFill();

      const label = new PIXI.Text(t.troopName.charAt(0).toUpperCase(), { 
          fontSize: 14, fill: 0xffffff, fontWeight: "bold" 
      });
      label.anchor.set(0.5);
      label.x = TILE / 2;
      label.y = TILE / 2;
      g.addChild(label);

      g.x = (t.gridX -1.5) * TILE;
      g.y = (t.gridY -1.5) * TILE;

      layer.addChild(g);
    });
  }, [deployedTroops]);


  return (
    <div ref={canvasRef} className="w-full h-full absolute inset-0 overflow-hidden" />
  );
}