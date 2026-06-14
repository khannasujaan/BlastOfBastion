"use client";
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

const GRID_SIZE = 31;
const BASE_TILE_SIZE = 50; 
const BOARD_PIXELS = GRID_SIZE * BASE_TILE_SIZE; 

// 1. Define the blueprint of what a building looks like
export interface VillageSync {
  id: number;
  building_id: number;
  name: string;
  level: number;
  grid_x: number;
  grid_y: number;
}

interface VillageMapProps {
  buildings: VillageSync[];
}

export default function VillageMap({ buildings }: VillageMapProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // 2. We need refs to store our layers so React can talk to them after the engine boots
  const appRef = useRef<PIXI.Application | null>(null);
  const buildingLayerRef = useRef<PIXI.Container | null>(null);

  // --- ENGINE BOOTUP (Runs exactly ONCE) ---
  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x2d2d2d,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    
    appRef.current = app;
    canvasRef.current.appendChild(app.view as unknown as Node);

    const mapContainer = new PIXI.Container();
    app.stage.addChild(mapContainer);

    // Draw the static grass and grid
    const bgGraphics = new PIXI.Graphics();
    bgGraphics.beginFill(0x4CAF50);
    bgGraphics.drawRect(0, 0, BOARD_PIXELS, BOARD_PIXELS);
    bgGraphics.endFill();
    bgGraphics.lineStyle(2, 0x000000, 0.3); 
    for (let i = 0; i <= GRID_SIZE; i++) {
      bgGraphics.moveTo(i * BASE_TILE_SIZE, 0);
      bgGraphics.lineTo(i * BASE_TILE_SIZE, BOARD_PIXELS);
      bgGraphics.moveTo(0, i * BASE_TILE_SIZE);
      bgGraphics.lineTo(BOARD_PIXELS, i * BASE_TILE_SIZE);
    }
    mapContainer.addChild(bgGraphics);

    // Create the empty, invisible Building Layer on top of the grass!
    const buildingLayer = new PIXI.Container();
    mapContainer.addChild(buildingLayer);
    buildingLayerRef.current = buildingLayer; // Save it to the ref so React can reach it

    // Responsive Scaling
    const handleResize = () => {
      app.renderer.resize(window.innerWidth, window.innerHeight);
      const padding = 40; 
      const availableWidth = window.innerWidth - padding;
      const availableHeight = window.innerHeight - padding;
      const scale = Math.min(availableWidth / BOARD_PIXELS, availableHeight / BOARD_PIXELS);
      
      mapContainer.scale.set(scale);
      mapContainer.x = (window.innerWidth - (BOARD_PIXELS * scale)) / 2;
      mapContainer.y = (window.innerHeight - (BOARD_PIXELS * scale)) / 2;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    };
  }, []); 


  // --- BUILDING SYNC LOOP (Runs every time the 'buildings' array changes) ---
  useEffect(() => {
    const layer = buildingLayerRef.current;
    if (!layer) return;

    // 1. Wipe the clear plastic sheet completely clean
    layer.removeChildren();

    // 2. Redraw every building from the Go database
    buildings.forEach((b) => {
      const bGraphic = new PIXI.Graphics();
      
      // Determine size and color based on the building name!
      let tileSize =3; // Default 1x1
      let color = 0x888888; // Default gray
      
      if (b.name === "TownHall") {
          color = 0x3b82f6; // Blue
      } else if (b.name.includes("Gold")) {
          color = 0xeab308; // Yellow
      } else if (b.name.includes("Elixir")) {
          color = 0xa855f7; // Purple
      }

      // Draw the colored square
      bGraphic.beginFill(color);
      bGraphic.lineStyle(2, 0x000000, 0.8); // Black border
      bGraphic.drawRect(0, 0, BASE_TILE_SIZE * tileSize, BASE_TILE_SIZE * tileSize);
      bGraphic.endFill();

      // Position it exactly on the grid coordinates!
      bGraphic.x = (b.grid_x-1) * BASE_TILE_SIZE;
      bGraphic.y = (b.grid_y-1) * BASE_TILE_SIZE;

      // Stick it to the plastic sheet
      layer.addChild(bGraphic);
    });

  }, [buildings]); // <-- Notice the dependency array!

  return <div ref={canvasRef} className="w-full h-full absolute inset-0 overflow-hidden" />;
}