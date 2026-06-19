"use client";
import dynamic from "next/dynamic";
import { VillageSync } from "./VillageMap";
import type { DeployedTroop, VillageBuilding, Projectile } from "@/app/battle/page";

const PixiMap = dynamic(() => import("./VillageMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0d1117] text-white font-mono text-sm animate-pulse">
      Loading Engine…
    </div>
  ),
});

interface MapWrapperProps {
  buildings:        VillageSync[];
  onMoveBuilding:   (id: number, newX: number, newY: number, oldX: number, oldY: number) => void;
  placementMode:    { building_id: number; size: number } | null;
  onBuild:          (buildingId: number, gridX: number, gridY: number) => void;
  onSelectBuilding: (buildingId: number | null, gridX?: number, gridY?: number) => void;
  onCancelBuild:    () => void;
}

export default function MapWrapper(props: MapWrapperProps) {
  return <PixiMap {...props} />;
}

const PixiAttackMap = dynamic(() => import("./AttackMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0d1117] text-white font-mono text-sm animate-pulse">
      Loading Battle Engine…
    </div>
  ),
});

interface AttackWrapperProps {
  buildings:         VillageBuilding[];
  deployedTroops:    DeployedTroop[];
  onDeployTroop?:    (gridX: number, gridY: number) => void;
  buildingHealthRef: React.RefObject<Record<number, number>>;
  buildingMaxHpRef:  React.RefObject<Record<number, number>>;
  projectilesRef:    React.RefObject<Projectile[]>;
}

export function AttackWrapper(props: AttackWrapperProps) {
  return <PixiAttackMap {...props} />;
}