"use client";
import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { DeployedTroop, VillageBuilding, Projectile } from "@/app/battle/page";

const GRID_SIZE = 31;
const TILE = 50;
const BOARD_PX = GRID_SIZE * TILE;
const BUILDING_TILES = 3;

const HP_BAR_W = TILE * BUILDING_TILES - 4;
const HP_BAR_H = 6;
const HP_BAR_Y_OFFSET = -10;

const TROOP_HP_BAR_W = 28;
const TROOP_HP_BAR_H = 4;
const TROOP_HP_BAR_Y = -8;

const TROOP_COLORS: Record<string, number> = {
  Barbarian: 0xf97316,
  Archer: 0xec4899,
  Giant: 0x84cc16,
  Goblin: 0x22d3ee,
  Wizard: 0x8b5cf6,
};

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

const TROOP_ASSETS: Record<string, string> = {
  Barbarian: "/assets/troops/barb.png",
  Archer:    "/assets/troops/archer.png",
  Giant:     "/assets/troops/giant.png",
  Goblin:    "/assets/troops/goblin.png",
  Wizard:    "/assets/troops/wizard.png",
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

function drawHpBar(
  g: PIXI.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
) {
  const clampedPct = Math.max(0, Math.min(1, pct));
  g.beginFill(0xdc2626);
  g.drawRoundedRect(x, y, w, h, 2);
  g.endFill();
  
  if (clampedPct > 0) {
    const fgColor = clampedPct > 0.5 ? 0x22c55e : clampedPct > 0.25 ? 0xeab308 : 0xef4444;
    g.beginFill(fgColor);
    g.drawRoundedRect(x, y, w * clampedPct, h, 2);
    g.endFill();
  }
  
  g.lineStyle(1, 0x000000, 0.5);
  g.drawRoundedRect(x, y, w, h, 2);
  g.lineStyle(0);
}

interface AttackMapProps {
  buildings: VillageBuilding[];
  deployedTroops: DeployedTroop[];
  onDeployTroop?: (gridX: number, gridY: number) => void;
  buildingHealthRef: React.RefObject<Record<number, number>>;
  buildingMaxHpRef: React.RefObject<Record<number, number>>;
  projectilesRef: React.RefObject<Projectile[]>;
}

export default function AttackMap({
  buildings,
  deployedTroops,
  onDeployTroop,
  buildingHealthRef,
  buildingMaxHpRef,
  projectilesRef,
}: AttackMapProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const buildingLayerRef = useRef<PIXI.Container | null>(null);
  const troopLayerRef = useRef<PIXI.Container | null>(null);
  const projectileLayerRef = useRef<PIXI.Container | null>(null);
  const mapContainerRef = useRef<PIXI.Container | null>(null);
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
      bg.moveTo(i * TILE, 0);    
      bg.lineTo(i * TILE, BOARD_PX);
      bg.moveTo(0, i * TILE);    
      bg.lineTo(BOARD_PX, i * TILE);
    }
    bg.eventMode = "static";
    bg.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
      if (!onDeployRef.current) return;
      const local = bg.toLocal(e.global);
      onDeployRef.current((local.x / TILE) + 1, (local.y / TILE) + 1);
    });
    mapContainer.addChild(bg);

    const buildingLayer = new PIXI.Container();
    const troopLayer = new PIXI.Container();
    const projectileLayer = new PIXI.Container();
    mapContainer.addChild(buildingLayer);
    mapContainer.addChild(troopLayer);
    mapContainer.addChild(projectileLayer);
    buildingLayerRef.current = buildingLayer;
    troopLayerRef.current = troopLayer;
    projectileLayerRef.current = projectileLayer;

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

    app.ticker.add(() => {
      buildingLayer.children.forEach(child => {
        const container = child as PIXI.Container & { _buildingId?: number; _hpBar?: PIXI.Graphics };
        if (container._buildingId === undefined || !container._hpBar) return;

        const id = container._buildingId;
        const current = buildingHealthRef.current?.[id] ?? 0;
        const max = buildingMaxHpRef.current?.[id] ?? 1;

        container._hpBar.clear();
        if (current < max && current > 0) {
          const pct = current / max;
          drawHpBar(container._hpBar, 2, HP_BAR_Y_OFFSET, HP_BAR_W, HP_BAR_H, pct);
        }
      });

      const projLayer = projectileLayerRef.current;
      if (!projLayer) return;
      projLayer.removeChildren();

      const projectiles = projectilesRef.current ?? [];
      projectiles.forEach(p => {
        const g = new PIXI.Graphics();
        const x = p.startX + (p.targetX - p.startX) * p.progress;
        const y = p.startY + (p.targetY - p.startY) * p.progress;

        if (p.type === "cannon") {
          g.beginFill(0x111111);
          g.lineStyle(1, 0x555555, 0.8);
          g.drawCircle(0, 0, 4);
          g.endFill();
        } else {
          const angle = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
          const len = 12;
          g.lineStyle(2, 0x92400e, 1);
          g.moveTo(-Math.cos(angle) * len, -Math.sin(angle) * len);
          g.lineTo(0, 0);
          g.beginFill(0x78350f);
          g.drawPolygon([
            0, 0,
            -Math.cos(angle - 0.4) * 5, -Math.sin(angle - 0.4) * 5,
            -Math.cos(angle + 0.4) * 5, -Math.sin(angle + 0.4) * 5,
          ]);
          g.endFill();
        }

        g.x = x;
        g.y = y;
        projLayer.addChild(g);
      });
    });

    return () => {
      window.removeEventListener("resize", onResize);
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    };
  }, []); 

  useEffect(() => {
    const layer = buildingLayerRef.current;
    if (!layer) return;
    layer.removeChildren();

    buildings.forEach(b => {
      if (b.destroyed) return;

      const container = new PIXI.Container() as PIXI.Container & {
        _buildingId: number;
        _hpBar: PIXI.Graphics;
      };
      container._buildingId = b.id;
      const px = TILE * BUILDING_TILES;

      const territory = new PIXI.Graphics();
      territory.beginFill(0x84cc16, 0.25);
      territory.lineStyle(2, 0x84cc16, 0.4);
      territory.drawRoundedRect(0, 0, px, px, 4);
      territory.endFill();
      container.addChild(territory);

      const spritePath = getSpritePath(b.name, b.level);
      const sprite = PIXI.Sprite.from(spritePath);
      sprite.width = px;
      sprite.height = px;
      container.addChild(sprite);

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
        container.addChild(overlay);

        const con = new PIXI.Text("🔨", { fontSize: 24 });
        con.x = (px - con.width) / 2;
        con.y = (px - con.height) / 2 - 10;
        container.addChild(con);
      }

      // const uiLayer = new PIXI.Graphics();
      // uiLayer.beginFill(0x000000, 0.65);
      // uiLayer.drawRoundedRect(0, 0, 18, 14, 3);
      // uiLayer.endFill();
      // uiLayer.x = px - 20;
      // uiLayer.y = 3;
      // container.addChild(uiLayer);

      // const lvlText = new PIXI.Text(`L${b.level}`, {
      //   fontSize: 9, fill: 0xffffff, fontWeight: "bold",
      // });
      // lvlText.x = uiLayer.x + 2;
      // lvlText.y = uiLayer.y + 2;
      // container.addChild(lvlText);

      // const nameTag = new PIXI.Text(b.name.replace(/([A-Z])/g, " $1").trim(), {
      //   fontSize: 10, fill: 0xffffff, fontWeight: "bold",
      //   stroke: 0x000000, strokeThickness: 3,
      //   wordWrap: true, wordWrapWidth: px - 4, align: "center",
      // });
      // nameTag.x = (px - nameTag.width) / 2;
      // nameTag.y = px - nameTag.height - 3;
      // container.addChild(nameTag);

      const hpBar = new PIXI.Graphics();
      const initHp = buildingHealthRef.current?.[b.id] ?? b.hp ?? 1000;
      const maxHp = buildingMaxHpRef.current?.[b.id] ?? b.hp ?? 1000;
      if (initHp < maxHp && initHp > 0) {
        drawHpBar(hpBar, 2, HP_BAR_Y_OFFSET, HP_BAR_W, HP_BAR_H, initHp / maxHp);
      }
      container._hpBar = hpBar;
      container.addChild(hpBar);

      container.x = (b.grid_x - 1) * TILE;
      container.y = (b.grid_y - 1) * TILE;
      layer.addChild(container);
    });
  }, [buildings, buildingHealthRef, buildingMaxHpRef]);

  useEffect(() => {
    const layer = troopLayerRef.current;
    if (!layer) return;
    layer.removeChildren();

    deployedTroops.forEach(t => {
      const container = new PIXI.Container();
      const spritePath = TROOP_ASSETS[t.troopName];

      if (spritePath) {
        const sprite = PIXI.Sprite.from(spritePath);
        sprite.width = 32; 
        sprite.height = 32;
        sprite.anchor.set(0.5);
        sprite.x = TILE / 2;
        sprite.y = TILE / 2;
        
        container.addChild(sprite);
      } else {
        const g = new PIXI.Graphics();
        const color = TROOP_COLORS[t.troopName] ?? 0xff3366;
        g.beginFill(color);
        g.lineStyle(2, 0xffffff, 0.8);
        g.drawCircle(TILE / 2, TILE / 2, 16);
        g.endFill();
        container.addChild(g);

        const label = new PIXI.Text(t.troopName.charAt(0).toUpperCase(), {
          fontSize: 14, fill: 0xffffff, fontWeight: "bold",
        });
        label.anchor.set(0.5);
        label.x = TILE / 2;
        label.y = TILE / 2;
        container.addChild(label);
      }

      const hpPct = t.maxHp > 0 ? Math.max(0, t.hp / t.maxHp) : 1;
      const hpBar = new PIXI.Graphics();
      drawHpBar(
        hpBar,
        (TILE / 2) - TROOP_HP_BAR_W / 2,
        TROOP_HP_BAR_Y,
        TROOP_HP_BAR_W,
        TROOP_HP_BAR_H,
        hpPct,
      );
      container.addChild(hpBar);

      container.x = (t.gridX - 1.5) * TILE;
      container.y = (t.gridY - 1.5) * TILE;
      layer.addChild(container);
    });
  }, [deployedTroops]);

  return (
    <div ref={canvasRef} className="w-full h-full absolute inset-0 overflow-hidden" />
  );
}