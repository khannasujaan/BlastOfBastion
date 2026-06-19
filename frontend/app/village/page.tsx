// app/village/page.tsx
"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import MapWrapper from "@/components/MapWrapper";
import { VillageSync } from "@/components/VillageMap";
import {
  Coins,
  Zap,
  Hammer,
  Sword,
  Shield,
  ChevronUp,
  X,
  Info,
  ArrowUpCircle,
  Users,
  Swords,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function authHeaders() {
  const token = localStorage.getItem("JWTtoken") ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

interface TroopsSync {
  troop_id: number;
  name: string;
  level: number;
  quantity: number;
}
interface StatsSync {
  gold: number;
  elixir: number;
  max_gold: number;
  max_elixir: number;
  trophies: number;
}
interface GameDataSyncResponse {
  stats: StatsSync;
  buildings: VillageSync[];
  troops: TroopsSync[];
}
export interface ToastMsg {
  id: number;
  text: string;
  kind: "success" | "error" | "info";
}
interface SelectionState {
  building_id: number;
  instance_id: number;
  gridX: number;
  gridY: number;
  name: string;
  level: number;
  is_built: boolean;
  is_barracks: boolean;
}

const ALL_ITEMS = [
  {
    id: 3001,
    name: "Town Hall",
    level: 1,
    cost_gold: 1,
    cost_elixir: 0,
    thelev: 1,
    buildTime: 0,
  },
  {
    id: 3002,
    name: "Town Hall",
    level: 2,
    cost_gold: 1000,
    cost_elixir: 0,
    thelev: 1,
    buildTime: 10,
  },
  {
    id: 3003,
    name: "Town Hall",
    level: 3,
    cost_gold: 4000,
    cost_elixir: 0,
    thelev: 2,
    buildTime: 1800,
  },
  {
    id: 3004,
    name: "Town Hall",
    level: 4,
    cost_gold: 25000,
    cost_elixir: 0,
    thelev: 3,
    buildTime: 10800,
  },
  {
    id: 3011,
    name: "Gold Storage",
    level: 1,
    cost_gold: 0,
    cost_elixir: 300,
    thelev: 1,
    buildTime: 10,
  },
  {
    id: 3012,
    name: "Gold Storage",
    level: 2,
    cost_gold: 0,
    cost_elixir: 750,
    thelev: 2,
    buildTime: 120,
  },
  {
    id: 3013,
    name: "Gold Storage",
    level: 3,
    cost_gold: 0,
    cost_elixir: 1500,
    thelev: 2,
    buildTime: 300,
  },
  {
    id: 3014,
    name: "Gold Storage",
    level: 4,
    cost_gold: 0,
    cost_elixir: 3000,
    thelev: 4,
    buildTime: 900,
  },
  {
    id: 3021,
    name: "Elixir Storage",
    level: 1,
    cost_gold: 300,
    cost_elixir: 0,
    thelev: 1,
    buildTime: 10,
  },
  {
    id: 3022,
    name: "Elixir Storage",
    level: 2,
    cost_gold: 750,
    cost_elixir: 0,
    thelev: 2,
    buildTime: 120,
  },
  {
    id: 3023,
    name: "Elixir Storage",
    level: 3,
    cost_gold: 1500,
    cost_elixir: 0,
    thelev: 2,
    buildTime: 300,
  },
  {
    id: 3024,
    name: "Elixir Storage",
    level: 4,
    cost_gold: 3000,
    cost_elixir: 0,
    thelev: 4,
    buildTime: 900,
  },
  {
    id: 3031,
    name: "Army Camp",
    level: 1,
    cost_gold: 0,
    cost_elixir: 200,
    thelev: 1,
    buildTime: 60,
  },
  {
    id: 3032,
    name: "Army Camp",
    level: 2,
    cost_gold: 0,
    cost_elixir: 2000,
    thelev: 3,
    buildTime: 18000,
  },
  {
    id: 2011,
    name: "Gold Mine",
    level: 1,
    cost_gold: 0,
    cost_elixir: 150,
    thelev: 1,
    buildTime: 5,
  },
  {
    id: 2012,
    name: "Gold Mine",
    level: 2,
    cost_gold: 0,
    cost_elixir: 300,
    thelev: 2,
    buildTime: 15,
  },
  {
    id: 2013,
    name: "Gold Mine",
    level: 3,
    cost_gold: 0,
    cost_elixir: 700,
    thelev: 2,
    buildTime: 60,
  },
  {
    id: 2014,
    name: "Gold Mine",
    level: 4,
    cost_gold: 0,
    cost_elixir: 1400,
    thelev: 4,
    buildTime: 300,
  },
  {
    id: 2021,
    name: "Elixir Collector",
    level: 1,
    cost_gold: 150,
    cost_elixir: 0,
    thelev: 1,
    buildTime: 5,
  },
  {
    id: 2022,
    name: "Elixir Collector",
    level: 2,
    cost_gold: 300,
    cost_elixir: 0,
    thelev: 2,
    buildTime: 15,
  },
  {
    id: 2023,
    name: "Elixir Collector",
    level: 3,
    cost_gold: 700,
    cost_elixir: 0,
    thelev: 2,
    buildTime: 60,
  },
  {
    id: 2024,
    name: "Elixir Collector",
    level: 4,
    cost_gold: 1400,
    cost_elixir: 0,
    thelev: 4,
    buildTime: 300,
  },
  {
    id: 4001,
    name: "Barracks",
    level: 1,
    cost_gold: 0,
    cost_elixir: 100,
    thelev: 1,
    buildTime: 10,
  },
  {
    id: 4002,
    name: "Barracks",
    level: 2,
    cost_gold: 0,
    cost_elixir: 500,
    thelev: 2,
    buildTime: 15,
  },
  {
    id: 4003,
    name: "Barracks",
    level: 3,
    cost_gold: 0,
    cost_elixir: 2500,
    thelev: 3,
    buildTime: 120,
  },
  {
    id: 4004,
    name: "Barracks",
    level: 4,
    cost_gold: 0,
    cost_elixir: 5000,
    thelev: 4,
    buildTime: 1800,
  },
  {
    id: 1011,
    name: "Cannon",
    level: 1,
    cost_gold: 250,
    cost_elixir: 0,
    thelev: 1,
    buildTime: 5,
  },
  {
    id: 1012,
    name: "Cannon",
    level: 2,
    cost_gold: 1000,
    cost_elixir: 0,
    thelev: 2,
    buildTime: 30,
  },
  {
    id: 1013,
    name: "Cannon",
    level: 3,
    cost_gold: 4000,
    cost_elixir: 0,
    thelev: 3,
    buildTime: 120,
  },
  {
    id: 1014,
    name: "Cannon",
    level: 4,
    cost_gold: 16000,
    cost_elixir: 0,
    thelev: 4,
    buildTime: 1200,
  },
  {
    id: 1021,
    name: "Archer Tower",
    level: 1,
    cost_gold: 1000,
    cost_elixir: 0,
    thelev: 2,
    buildTime: 15,
  },
  {
    id: 1022,
    name: "Archer Tower",
    level: 2,
    cost_gold: 2000,
    cost_elixir: 0,
    thelev: 2,
    buildTime: 120,
  },
  {
    id: 1023,
    name: "Archer Tower",
    level: 3,
    cost_gold: 5000,
    cost_elixir: 0,
    thelev: 3,
    buildTime: 1200,
  },
  {
    id: 1024,
    name: "Archer Tower",
    level: 4,
    cost_gold: 20000,
    cost_elixir: 0,
    thelev: 4,
    buildTime: 3600,
  },
  {
    id: 1031,
    name: "Wizard Tower",
    level: 1,
    cost_gold: 5000,
    cost_elixir: 0,
    thelev: 3,
    buildTime: 1800,
  },
  {
    id: 1032,
    name: "Wizard Tower",
    level: 2,
    cost_gold: 25000,
    cost_elixir: 0,
    thelev: 4,
    buildTime: 3600,
  },
];

const SHOP_ITEMS = ALL_ITEMS.filter((i) => i.level === 1 && i.id !== 3001);

const TROOP_CATALOG = [
  {
    id: 1,
    name: "Barbarian",
    level: 1,
    housing_space: 1,
    unlock_thall_level: 1,
    cost_elixir: 10,
  },
  {
    id: 2,
    name: "Archer",
    level: 1,
    housing_space: 1,
    unlock_thall_level: 2,
    cost_elixir: 15,
  },
  {
    id: 3,
    name: "Giant",
    level: 1,
    housing_space: 5,
    unlock_thall_level: 2,
    cost_elixir: 80,
  },
  {
    id: 4,
    name: "Goblin",
    level: 1,
    housing_space: 1,
    unlock_thall_level: 2,
    cost_elixir: 12,
  },
  {
    id: 5,
    name: "Wizard",
    level: 1,
    housing_space: 4,
    unlock_thall_level: 3,
    cost_elixir: 60,
  },
];

const MAX_BUILDINGS: Record<string, Record<number, number>> = {
  TownHall: { 1: 1, 2: 1, 3: 1, 4: 1 },
  GoldStor: { 1: 1, 2: 1, 3: 2, 4: 2 },
  ElixirStor: { 1: 1, 2: 1, 3: 2, 4: 2 },
  ArmyCamp: { 1: 1, 2: 1, 3: 2, 4: 2 },
  GoldMine: { 1: 1, 2: 2, 3: 3, 4: 4 },
  ElixirColl: { 1: 1, 2: 2, 3: 3, 4: 4 },
  Barrack: { 1: 1, 2: 1, 3: 1, 4: 1 },
  Cannon: { 1: 2, 2: 2, 3: 3, 4: 3 },
  ATower: { 1: 0, 2: 1, 3: 1, 4: 2 },
  WTower: { 1: 0, 2: 0, 3: 1, 4: 2 },
};

const DISPLAY_TO_DB_KEY: Record<string, string> = {
  "Town Hall": "TownHall",
  "Gold Storage": "GoldStor",
  "Elixir Storage": "ElixirStor",
  "Army Camp": "ArmyCamp",
  "Gold Mine": "GoldMine",
  "Elixir Collector": "ElixirColl",
  Barracks: "Barrack",
  Cannon: "Cannon",
  "Archer Tower": "ATower",
  "Wizard Tower": "WTower",
};

function formatTime(seconds: number): string {
  if (seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function ToastStack({ toasts }: { toasts: ToastMsg[] }) {
  const colors: Record<string, string> = {
    success: "bg-emerald-700 border-emerald-500",
    error: "bg-red-800   border-red-600",
    info: "bg-slate-700 border-slate-500",
  };
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-200 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded-lg border text-sm font-semibold text-white shadow-lg ${colors[t.kind]} animate-fade-in`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

function ResourceBar({
  label,
  amount,
  max,
  icon,
  barColor,
  onCollect,
  collecting,
}: {
  label: string;
  amount: number;
  max: number;
  icon: React.ReactNode;
  barColor: string;
  onCollect: () => void;
  collecting: boolean;
}) {
  const pct = max > 0 ? Math.min((amount / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onCollect}
        disabled={collecting}
        title={`Collect ${label}`}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-black/40 border border-white/20 hover:bg-black/60 active:scale-95 transition-transform disabled:opacity-50 shrink-0"
      >
        {icon}
      </button>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold tracking-widest text-white/60 uppercase">
          {label}
        </span>
        <div className="relative w-44 h-5 bg-black/50 rounded-full overflow-hidden border border-white/10">
          <div
            className={`absolute left-0 top-0 h-full ${barColor} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white drop-shadow">
            {amount.toLocaleString()} / {max.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function ConstructionTimer({ finishTime }: { finishTime: number }) {
  const [secsLeft, setSecsLeft] = useState(
    Math.max(0, Math.ceil((finishTime - Date.now()) / 1000)),
  );
  useEffect(() => {
    const iv = setInterval(
      () =>
        setSecsLeft(Math.max(0, Math.ceil((finishTime - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(iv);
  }, [finishTime]);
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-300">
      <Clock size={11} /> {formatTime(secsLeft)}
    </span>
  );
}

function BuildShop({
  onClose,
  onPlace,
  currentTHLevel,
  placedBuildings,
}: {
  onClose: () => void;
  onPlace: (buildingId: number) => void;
  currentTHLevel: number;
  // The player's current village buildings — used to count how many of each type exist
  placedBuildings: VillageSync[];
}) {
  const categories = Array.from(
    new Set(
      SHOP_ITEMS.map((i) => {
        if (i.id >= 1000 && i.id < 2000) return "Defense";
        if (i.id >= 2000 && i.id < 3000) return "Resources";
        return "Base";
      }),
    ),
  );
  const [activeTab, setActiveTab] = useState(categories[0]);

  const filtered = SHOP_ITEMS.filter((i) => {
    if (activeTab === "Defense") return i.id >= 1000 && i.id < 2000;
    if (activeTab === "Resources") return i.id >= 2000 && i.id < 3000;
    return i.id >= 3000;
  });

  // Count how many of each building the player already has on the map.
  // Backend names may be short ("Barrack", "ElixirColl") so we normalize via DISPLAY_TO_DB_KEY.
  const countPlaced = (displayName: string): number => {
    const dbKey = DISPLAY_TO_DB_KEY[displayName];
    if (!dbKey) return 0;
    return placedBuildings.filter((b) => {
      const bKey = nameKeyShop(b.name);
      return bKey === dbKey || b.name === displayName;
    }).length;
  };

  // Normalise a backend name to its MAX_BUILDINGS key.
  // e.g. "Barracks"→"Barrack", "ElixirCollector"→"ElixirColl", "ArcherTower"→"ATower"
  const nameKeyShop = (name: string): string => {
    const map: Record<string, string> = {
      TownHall: "TownHall",
      GoldMine: "GoldMine",
      ElixirCollector: "ElixirColl",
      ElixirColl: "ElixirColl",
      GoldStorage: "GoldStor",
      GoldStor: "GoldStor",
      ElixirStorage: "ElixirStor",
      ElixirStor: "ElixirStor",
      ArmyCamp: "ArmyCamp",
      Barracks: "Barrack",
      Barrack: "Barrack",
      Cannon: "Cannon",
      ArcherTower: "ATower",
      ATower: "ATower",
      WizardTower: "WTower",
      WTower: "WTower",
    };
    return map[name.replace(/\s/g, "")] ?? name;
  };

  // Determine why a building might be disabled and what label to show
  const getBuildStatus = (
    item: (typeof SHOP_ITEMS)[number],
  ): { disabled: boolean; reason: string | null } => {
    // TH level too low
    if (currentTHLevel < item.thelev) {
      return { disabled: true, reason: `TH${item.thelev}+` };
    }
    // Max building limit reached
    const dbKey = DISPLAY_TO_DB_KEY[item.name];
    if (dbKey) {
      const maxAllowed = MAX_BUILDINGS[dbKey]?.[currentTHLevel] ?? 999;
      const placed = countPlaced(item.name);
      if (placed >= maxAllowed) {
        return {
          disabled: true,
          reason: `Max ${maxAllowed} (${placed}/${maxAllowed})`,
        };
      }
    }
    return { disabled: false, reason: null };
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-end justify-center pb-4 bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Hammer size={16} className="text-amber-400" />
            <h2 className="font-bold text-white tracking-wide text-sm">
              BUILD
            </h2>
          </div>
          <div className="flex gap-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveTab(c)}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${activeTab === c ? "bg-amber-500 text-black" : "text-white/50 hover:text-white"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 gap-3 p-4 max-h-[50vh] overflow-y-auto">
          {filtered.map((item) => {
            const { disabled, reason } = getBuildStatus(item);
            return (
              <div
                key={item.id}
                className={[
                  "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all bg-white/5",
                  disabled
                    ? "border-white/5 opacity-50 cursor-not-allowed"
                    : "border-white/10 hover:border-amber-500/50 cursor-pointer",
                ].join(" ")}
              >
                <BuildingSprite name={item.name} size={52} />
                <span className="text-white text-xs font-semibold text-center leading-tight">
                  {item.name}
                </span>
                <div className="flex flex-col items-center text-[10px] font-bold gap-0.5">
                  {item.cost_gold > 0 && (
                    <span className="text-yellow-400 flex items-center gap-0.5">
                      <Coins size={9} />
                      {item.cost_gold.toLocaleString()}
                    </span>
                  )}
                  {item.cost_elixir > 0 && (
                    <span className="text-purple-400 flex items-center gap-0.5">
                      <Zap size={9} />
                      {item.cost_elixir.toLocaleString()}
                    </span>
                  )}
                  <span className="text-white/40 flex items-center gap-0.5">
                    <Clock size={9} />
                    {formatTime(item.buildTime)}
                  </span>
                </div>
                {disabled ? (
                  <span className="text-[10px] text-red-400 font-bold text-center">
                    {reason}
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      onPlace(item.id);
                      onClose();
                    }}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold py-1 rounded-lg active:scale-95 transition-transform"
                  >
                    Place
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** UPGRADE CONFIRMATION MODAL */
function UpgradeConfirmModal({
  sel,
  nextItem,
  onConfirm,
  onCancel,
}: {
  sel: SelectionState;
  nextItem: (typeof ALL_ITEMS)[number];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto"
      onClick={onCancel}
    >
      <div
        className="bg-[#1a1f2e] border border-white/15 rounded-2xl shadow-2xl w-80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-3 flex items-center gap-2">
          <ArrowUpCircle size={16} className="text-amber-400" />
          <span className="text-white font-bold text-sm tracking-wide">
            Confirm Upgrade
          </span>
        </div>

        {/* Building info */}
        <div className="px-5 pt-4 pb-3 flex items-center gap-3">
          <BuildingSprite name={sel.name} size={44} />
          <div>
            {/* Use a friendly display name: strip camelCase from backend name */}
            <p className="text-white font-semibold text-sm">
              {sel.name.replace(/([A-Z])/g, " $1").trim()}
            </p>
            <p className="text-white/40 text-xs">
              Level {sel.level} →{" "}
              <span className="text-amber-400 font-bold">
                Level {nextItem.level}
              </span>
            </p>
          </div>
        </div>

        {/* Cost + time */}
        <div className="mx-5 mb-4 rounded-xl bg-white/5 border border-white/10 divide-y divide-white/10">
          {nextItem.cost_gold > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-white/60 text-xs font-semibold flex items-center gap-1.5">
                <Coins size={12} className="text-yellow-400" /> Gold cost
              </span>
              <span className="text-yellow-400 font-bold text-sm">
                {nextItem.cost_gold.toLocaleString()}
              </span>
            </div>
          )}
          {nextItem.cost_elixir > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-white/60 text-xs font-semibold flex items-center gap-1.5">
                <Zap size={12} className="text-purple-400" /> Elixir cost
              </span>
              <span className="text-purple-400 font-bold text-sm">
                {nextItem.cost_elixir.toLocaleString()}
              </span>
            </div>
          )}
          {nextItem.cost_gold === 0 && nextItem.cost_elixir === 0 && (
            <div className="px-4 py-2.5">
              <span className="text-white/40 text-xs">Free upgrade</span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-white/60 text-xs font-semibold flex items-center gap-1.5">
              <Clock size={12} className="text-sky-400" /> Build time
            </span>
            <span className="text-sky-300 font-bold text-sm">
              {formatTime(nextItem.buildTime)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 font-bold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm active:scale-95 transition-transform"
          >
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}

/** BUILDING SELECTION PANEL */
function SelectionPanel({
  sel,
  onClose,
  onUpgrade,
  onTrainTroops,
}: {
  sel: SelectionState;
  onClose: () => void;
  onUpgrade: () => void;
  onTrainTroops: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  // ── BUG FIX: look up only by building_id + 1, NO name check.
  // The backend returns names like "TownHall" (no spaces), but ALL_ITEMS uses
  // "Town Hall". The name guard was causing every multi-word building to be
  // misidentified as max-level. IDs are globally unique so no guard is needed.
  const nextItem = ALL_ITEMS.find((i) => i.id === sel.building_id + 1);
  const isMaxLevel = !nextItem;

  // FIX: Backend DB stores the name as "Barrack" (no trailing 's').
  // Use startsWith so both "Barrack" and "Barracks" are handled safely.
  const isBarracks = sel.name.startsWith("Barrack");

  return (
    <>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <div className="bg-[#1a1f2e]/95 border border-white/15 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 backdrop-blur-md">
          <BuildingSprite name={sel.name} size={44} />
          <div className="flex flex-col mr-2">
            {/* Friendly display name */}
            <span className="text-white text-sm font-bold">
              {sel.name.replace(/([A-Z])/g, " $1").trim()}
            </span>
            <span className="text-white/50 text-xs">Level {sel.level}</span>
            {!sel.is_built && (
              <span className="text-amber-400 text-[11px] font-mono flex items-center gap-1 mt-0.5">
                <Clock size={10} /> Under construction
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {/* INFO */}
            <ActionButton
              icon={<Info size={14} />}
              label="Info"
              color="bg-blue-600 hover:bg-blue-500"
              onClick={() => {}}
            />

            {/* UPGRADE — only when built and not at max */}
            {!isMaxLevel && sel.is_built && (
              <ActionButton
                icon={<ArrowUpCircle size={14} />}
                label="Upgrade"
                color="bg-amber-500 hover:bg-amber-400"
                onClick={() => setShowConfirm(true)}
              />
            )}
            {isMaxLevel && sel.is_built && (
              <span className="text-[10px] text-emerald-400 font-bold px-2 flex items-center">
                MAX
              </span>
            )}

            {/* TRAIN TROOPS — Barracks only, when built */}
            {isBarracks && sel.is_built && (
              <ActionButton
                icon={<Users size={14} />}
                label="Train"
                color="bg-purple-600 hover:bg-purple-500"
                onClick={onTrainTroops}
              />
            )}
          </div>

          <button
            onClick={onClose}
            className="ml-1 text-white/30 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Upgrade confirmation modal */}
      {showConfirm && nextItem && (
        <UpgradeConfirmModal
          sel={sel}
          nextItem={nextItem}
          onConfirm={() => {
            setShowConfirm(false);
            onUpgrade();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${color} text-white active:scale-95 transition-transform`}
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

/** TRAIN TROOPS MODAL */
function TrainTroopsModal({
  currentTroops,
  currentTHLevel,
  housing_space,
  onClose,
  onTrain,
}: {
  currentTroops: TroopsSync[] | null;
  currentTHLevel: number;
  housing_space: number;
  onClose: () => void;
  // Updated DTO: backend now identifies troops by name, not numeric id
  onTrain: (
    troops: { troop_name: string; quantity: number }[],
  ) => Promise<void>;
}) {
  // Null-guard: Go encodes nil slices as JSON null, not [].
  const safeTroops = currentTroops ?? [];

  // Build a name→quantity map seeded from the player's current persistent army.
  // Using troop name as key because the new DTO is name-based.
  const [draft, setDraft] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    safeTroops.forEach((t) => m.set(t.name, t.quantity));
    return m;
  });
  const [training, setTraining] = useState(false);

  // Derive the live level for a troop: prefer server-reported level, fall back to catalog.
  const liveLevel = (troopName: string): number => {
    return (
      safeTroops.find((t) => t.name === troopName)?.level ??
      TROOP_CATALOG.find((c) => c.name === troopName)?.level ??
      1
    );
  };

  const totalUsed = Array.from(draft.entries()).reduce((sum, [name, qty]) => {
    const cat = TROOP_CATALOG.find((t) => t.name === name);
    return sum + qty * (cat?.housing_space ?? 0);
  }, 0);

  const adjust = (name: string, delta: number) => {
    const cat = TROOP_CATALOG.find((t) => t.name === name);
    if (!cat) return;
    const current = draft.get(name) ?? 0;
    const next = Math.max(0, current + delta);
    const spaceIfAdded = totalUsed + (next - current) * cat.housing_space;
    if (spaceIfAdded > housing_space) return;
    setDraft((prev) => {
      const m = new Map(prev);
      m.set(name, next);
      return m;
    });
  };

  const handleTrain = async () => {
    setTraining(true);
    const troops = Array.from(draft.entries()).map(
      ([troop_name, quantity]) => ({ troop_name, quantity }),
    );
    await onTrain(troops);
    setTraining(false);
    onClose();
  };

  const spacePct =
    housing_space > 0 ? Math.min((totalUsed / housing_space) * 100, 100) : 0;

  return (
    <div
      className="absolute inset-0 z-50 flex items-end justify-center pb-4 bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Swords size={15} className="text-purple-400" />
            <h2 className="font-bold text-white text-sm tracking-wide">
              TRAIN TROOPS
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50 font-mono">
              {totalUsed} / {housing_space} space
            </span>
            <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${spacePct >= 100 ? "bg-red-500" : "bg-purple-500"}`}
                style={{ width: `${spacePct}%` }}
              />
            </div>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Troop cards */}
        <div className="grid grid-cols-5 gap-3 p-4">
          {TROOP_CATALOG.map((troop) => {
            const locked = troop.unlock_thall_level > currentTHLevel;
            const qty = draft.get(troop.name) ?? 0;
            const level = liveLevel(troop.name);

            return (
              <div
                key={troop.id}
                className={[
                  "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-colors",
                  locked
                    ? "border-white/5 opacity-40"
                    : qty > 0
                      ? "border-purple-500/50 bg-purple-900/20"
                      : "border-white/10 bg-white/5",
                ].join(" ")}
              >
                <TroopSprite name={troop.name} />
                <span className="text-white text-[10px] font-semibold text-center leading-tight">
                  {troop.name}
                </span>

                {/* Level badge — shows live server level */}
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Lv {level}
                </span>

                <span className="text-white/40 text-[9px]">
                  {troop.housing_space}⚡
                </span>

                {locked ? (
                  <span className="text-[9px] text-red-400 font-bold mt-auto">
                    TH{troop.unlock_thall_level}+
                  </span>
                ) : (
                  <div className="flex items-center gap-1 mt-auto">
                    <button
                      onClick={() => adjust(troop.name, -1)}
                      className="w-5 h-5 rounded bg-white/10 hover:bg-red-500/30 text-white font-bold text-xs flex items-center justify-center transition-colors"
                    >
                      −
                    </button>
                    <span
                      className={`font-mono text-xs w-5 text-center font-bold ${qty > 0 ? "text-purple-300" : "text-white/40"}`}
                    >
                      {qty}
                    </span>
                    <button
                      onClick={() => adjust(troop.name, +1)}
                      className="w-5 h-5 rounded bg-white/10 hover:bg-green-500/30 text-white font-bold text-xs flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Persistent army summary — always visible when player has a saved army */}
        <div className="mx-4 mb-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1.5">
            Current Saved Army
          </p>
          {safeTroops.length === 0 ? (
            <p className="text-white/25 text-xs italic">
              No troops trained yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {safeTroops.map((t) => (
                <div
                  key={t.troop_id}
                  className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2 py-1"
                >
                  <span className="text-white text-[11px] font-semibold">
                    {t.name}
                  </span>
                  <span className="text-purple-300 text-[11px] font-mono">
                    ×{t.quantity}
                  </span>
                  <span className="text-amber-400 text-[9px] font-bold">
                    Lv{t.level}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={handleTrain}
            disabled={training || totalUsed === 0}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl active:scale-95 transition-transform text-sm"
          >
            {training
              ? "Sending to Barracks…"
              : `Train Army (${totalUsed} / ${housing_space} space)`}
          </button>
        </div>
      </div>
    </div>
  );
}

function UpgradeTroopsModal({
  currentTHLevel,
  currentTroops,
  onClose,
  onUpgrade,
}: {
  currentTHLevel: number;
  currentTroops: TroopsSync[] | null;
  onClose: () => void;
  // Updated DTO: backend now uses troop_name string, not numeric troop_id
  onUpgrade: (troopName: string) => Promise<void>;
}) {
  const safeTroops = currentTroops ?? [];
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // Get the live level for a troop from the server-synced army
  const liveLevel = (troopName: string): number =>
    safeTroops.find((t) => t.name === troopName)?.level ??
    TROOP_CATALOG.find((c) => c.name === troopName)?.level ??
    1;

  const handleUpgrade = async (name: string) => {
    setUpgrading(name);
    await onUpgrade(name);
    setUpgrading(null);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-end justify-center pb-4 bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ChevronUp size={15} className="text-amber-400" />
            <h2 className="font-bold text-white text-sm tracking-wide">
              UPGRADE TROOPS
            </h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <p className="px-5 pt-3 pb-1 text-white/40 text-xs">
          Upgrading a troop costs Elixir and immediately improves all units of
          that type.
        </p>

        {/* Troop cards */}
        <div className="grid grid-cols-5 gap-3 p-4">
          {TROOP_CATALOG.map((troop) => {
            const locked = troop.unlock_thall_level > currentTHLevel;
            const isUpgrading = upgrading === troop.name;
            const level = liveLevel(troop.name);

            return (
              <div
                key={troop.id}
                className={[
                  "flex flex-col items-center gap-2 p-2 rounded-xl border transition-colors",
                  locked
                    ? "border-white/5 opacity-40"
                    : "border-white/10 bg-white/5",
                ].join(" ")}
              >
                <TroopSprite name={troop.name} />
                <span className="text-white text-[10px] font-semibold text-center leading-tight">
                  {troop.name}
                </span>

                {/* Live level badge */}
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Lv {level}
                </span>

                {/* Cost hint */}
                <span className="text-purple-300 text-[9px] flex items-center gap-0.5">
                  <Zap size={8} />
                  {troop.cost_elixir.toLocaleString()}
                </span>

                {locked ? (
                  <span className="text-[9px] text-red-400 font-bold mt-auto">
                    TH{troop.unlock_thall_level}+
                  </span>
                ) : (
                  <button
                    onClick={() => handleUpgrade(troop.name)}
                    disabled={isUpgrading}
                    className="w-full mt-auto bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black text-[10px] font-bold py-1 rounded-lg active:scale-95 transition-all"
                  >
                    {isUpgrading ? "…" : "Upgrade"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BattleOverlay({
  opponent,
  onClose,
}: {
  opponent: { opponent: string; name: string } | null;
  onClose: () => void;
}) {
    const router = useRouter();

  // 3. Create the navigation function
  const handleStartBattle = () => {
    if (!opponent) return;
    // Push to the /battle page and attach the ID to the URL
    router.push(`/battle?id=${opponent.opponent}`);
  };
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Shield size={40} className="text-red-400 mx-auto mb-3" />
        <h2 className="text-white font-bold text-xl mb-1 tracking-wide">
          BATTLE
        </h2>
        {opponent == null ? (
          <p className="text-white/50 text-sm mt-4">
            No opponents found nearby. Check back later.
          </p>
        ) : (
          <>
            <p className="text-white/60 text-sm mb-4">Opponent Found</p>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto text-left">
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                <Sword size={13} className="text-red-400 shrink-0" />
                <span className="text-white text-xs font-mono">
                  {opponent.name}
                </span>
                <span className="ml-auto text-[10px] text-white/30">
                  {opponent.name}
                </span>
              </div>
            </div>
          </>
        )}
        <div className="flex flex-row justify-center items-center gap-4 w-full mt-5">
          <button
            onClick={handleStartBattle}
            className="w-2/5 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm"
          >
            Battle
          </button>

          <button
            onClick={onClose}
            className="w-2/5 bg-red-800 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const BUILDING_COLORS: Record<string, string> = {
  // ── Display names (ALL_ITEMS / Shop) ──
  "Town Hall": "#3b82f6",
  "Gold Mine": "#eab308",
  "Elixir Collector": "#a855f7",
  "Gold Storage": "#ca8a04",
  "Elixir Storage": "#9333ea",
  "Army Camp": "#78716c",
  Barracks: "#ea580c",
  Cannon: "#6b7280",
  "Archer Tower": "#16a34a",
  "Wizard Tower": "#2563eb",
  // ── Backend DB names (no spaces) ──
  TownHall: "#3b82f6",
  GoldMine: "#eab308",
  ElixirColl: "#a855f7",
  ElixirCollector: "#a855f7",
  GoldStor: "#ca8a04",
  GoldStorage: "#ca8a04",
  ElixirStor: "#9333ea",
  ElixirStorage: "#9333ea",
  ArmyCamp: "#78716c",
  Barrack: "#ea580c",
  ATower: "#16a34a",
  ArcherTower: "#16a34a",
  WTower: "#2563eb",
  WizardTower: "#2563eb",
};

function BuildingSprite({ name, size = 48 }: { name: string; size?: number }) {
  const color = BUILDING_COLORS[name] ?? "#888";
  const label = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  return (
    <div
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.3,
      }}
      className="rounded-lg border-2 border-black/30 flex items-center justify-center font-bold text-white shadow-md shrink-0"
    >
      {label}
    </div>
  );
}

export function TroopSprite({ name }: { name: string }) {
  const colors: Record<string, string> = {
    Barbarian: "#f97316",
    Archer: "#ec4899",
    Giant: "#84cc16",
    Goblin: "#22d3ee",
    Wizard: "#f43f5e",
  };
  const c = colors[name] ?? "#888";
  return (
    <div
      style={{ width: 40, height: 40, background: c }}
      className="rounded-full border-2 border-black/30 flex items-center justify-center font-bold text-white text-xs shadow"
    >
      {name[0]}
    </div>
  );
}

type ActiveModal = "shop" | "train" | "upgrade-troops" | "battle" | null;

export default function VillageScreen() {
  const [playerData, setPlayerData] = useState<GameDataSyncResponse | null>(
    null,
  );
  const [isSyncing, setIsSyncing] = useState(true);
  const [placementMode, setPlacementMode] = useState<{
    building_id: number;
    size: number;
  } | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [collectingGold, setCollectingGold] = useState(false);
  const [collectingElixir, setCollectingElixir] = useState(false);
  const [battleOpponent, setBattleOpponent] = useState<{
    opponent: string;
    name: string;
  } | null>(null);
  const [housingSp, setHousingSp] = useState(0);
  const toastIdRef = useRef(0);

  // ── Toast helper ──
  const showToast = useCallback(
    (text: string, kind: ToastMsg["kind"] = "info") => {
      const id = ++toastIdRef.current;
      setToasts((prev) => [...prev, { id, text, kind }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        3000,
      );
    },
    [],
  );

  // ── Auth guard ──
  function getToken(): string | null {
    const t = localStorage.getItem("JWTtoken");
    if (!t) {
      window.location.href = "/login";
      return null;
    }
    return t;
  }

  // ── Initial sync ──
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("JWTtoken");
      if (!token) {
        window.location.href = "/login";
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/village/sync`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("sync failed");
        const data: GameDataSyncResponse = await res.json();
        setPlayerData(data);
        // Approximate housing space from Army Camps
        const camps = data.buildings.filter(
          (b) => b.name === "ArmyCamp" && b.is_built,
        );
        setHousingSp(camps.length * 20 || 20); // default 20 per camp
      } catch {
        showToast("Failed to connect to Bastion server", "error");
      } finally {
        setIsSyncing(false);
      }
    })();
  }, []);

  // ── Auto-complete construction timer ──
  useEffect(() => {
    if (!playerData) return;
    const iv = setInterval(() => {
      const now = Date.now();
      playerData.buildings.forEach((b) => {
        if (!b.is_built && b.finish_time && now >= b.finish_time) {
          completeBuilding(b.id, b.grid_x, b.grid_y);
        }
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [playerData]);

  // ── Derived state ──
  const townHall = playerData?.buildings.find((b) => b.name === "TownHall");
  const currentTHLevel = townHall?.level ?? 1;

  // ── API calls ──
  async function collectResource(type: "Gold" | "Elixir") {
    const token = getToken();
    if (!token) return;
    if (type === "Gold") setCollectingGold(true);
    else setCollectingElixir(true);
    try {
      const res = await fetch(
        `${API_BASE}/village/collect/${type.toLowerCase()}`,
        {
          method: "POST",
          headers: authHeaders(),
        },
      );
      if (!res.ok) throw new Error("collect failed");
      const data = await res.json();
      setPlayerData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            gold:
              type === "Gold" ? prev.stats.gold + data.change : prev.stats.gold,
            elixir:
              type === "Elixir"
                ? prev.stats.elixir + data.change
                : prev.stats.elixir,
          },
        };
      });
      showToast(`+${data.change} ${type} collected!`, "success");
    } catch {
      showToast(`Failed to collect ${type}`, "error");
    } finally {
      if (type === "Gold") setCollectingGold(false);
      else setCollectingElixir(false);
    }
  }

  async function handleBuildBuilding(
    buildingId: number,
    gridX: number,
    gridY: number,
  ) {
    if (gridX > 29 || gridX < 1 || gridY > 29 || gridY < 1) {
      setPlacementMode(null);
      return;
    }
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/village/building/new`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          building_id: buildingId,
          grid_x: gridX,
          grid_y: gridY,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        showToast(txt || "Build failed", "error");
        setPlacementMode(null);
        return;
      }
      const shopItem = SHOP_ITEMS.find((i) => i.id === buildingId);
      if (!shopItem) return;
      const newB: VillageSync = {
        id: Date.now(),
        building_id: buildingId,
        name: shopItem.name,
        level: 1,
        grid_x: gridX,
        grid_y: gridY,
        is_built: false,
        finish_time: Date.now() + shopItem.buildTime * 1000,
      };
      setPlayerData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          buildings: [...prev.buildings, newB],
          stats: {
            ...prev.stats,
            gold: prev.stats.gold - shopItem.cost_gold,
            elixir: prev.stats.elixir - shopItem.cost_elixir,
          },
        };
      });
      showToast(
        `${shopItem.name} placed! Builds in ${formatTime(shopItem.buildTime)}`,
        "success",
      );
      setPlacementMode(null);
    } catch {
      showToast("Build failed", "error");
      setPlacementMode(null);
    }
  }

  async function handleMoveBuilding(
    buildingId: number,
    newX: number,
    newY: number,
    oldX: number,
    oldY: number,
  ) {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/village/building/move`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          building_id: buildingId,
          grid_x: newX,
          grid_y: newY,
          init_grid_x: oldX,
          init_grid_y: oldY,
        }),
      });
      if (!res.ok) {
        showToast("Can't move there", "error");
        setPlayerData((prev) =>
          prev ? { ...prev, buildings: [...prev.buildings] } : prev,
        );
        return;
      }
      setPlayerData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          buildings: prev.buildings.map((b) =>
            b.id === buildingId ? { ...b, grid_x: newX, grid_y: newY } : b,
          ),
        };
      });
    } catch {
      showToast("Move failed", "error");
    }
  }

  async function completeBuilding(
    instanceId: number,
    gridX: number,
    gridY: number,
  ) {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/village/building/upgrade-finish`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ id: instanceId, grid_x: gridX, grid_y: gridY }),
      });
      if (!res.ok) return;
      setPlayerData((prev) => {
        if (!prev) return prev;
        let dGold = 0,
          dElixir = 0;
        const buildings = prev.buildings.map((b) => {
          if (b.id !== instanceId) return b;
          // Bump storage caps upon completion
          if (b.building_id === 3011) dGold += 5000;
          if (b.building_id === 3021) dElixir += 5000;
          return { ...b, is_built: true, finish_time: null };
        });
        return {
          ...prev,
          buildings,
          stats: {
            ...prev.stats,
            max_gold: prev.stats.max_gold + dGold,
            max_elixir: prev.stats.max_elixir + dElixir,
          },
        };
      });
    } catch {
      /* silent — will retry next tick */
    }
  }

  async function handleUpgradeBuilding(
    buildingId: number,
    gridX: number,
    gridY: number,
  ) {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/village/building/upgrade-start`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          building_id: buildingId,
          grid_x: gridX,
          grid_y: gridY,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        showToast(t || "Upgrade failed", "error");
        return;
      }

      const target = playerData?.buildings.find(
        (b) =>
          b.building_id === buildingId &&
          b.grid_x === gridX &&
          b.grid_y === gridY,
      );
      const nextItem = ALL_ITEMS.find((i) => i.id === buildingId + 1);
      if (!target || !nextItem) return;

      setPlayerData((prev) => {
        if (!prev) return prev;
        const buildings = prev.buildings.map((b) =>
          b.building_id === buildingId &&
          b.grid_x === gridX &&
          b.grid_y === gridY
            ? {
                ...b,
                building_id: buildingId + 1,
                level: b.level + 1,
                is_built: false,
                finish_time: Date.now() + nextItem.buildTime * 1000,
              }
            : b,
        );
        return {
          ...prev,
          buildings,
          stats: {
            ...prev.stats,
            gold: prev.stats.gold - nextItem.cost_gold,
            elixir: prev.stats.elixir - nextItem.cost_elixir,
          },
        };
      });
      showToast(
        `Upgrading ${target.name} to Lv ${target.level + 1}! (${formatTime(nextItem.buildTime)})`,
        "info",
      );
      setSelection(null);
    } catch {
      showToast("Upgrade failed", "error");
    }
  }

  // troops payload shape: { troop_name, quantity } — new backend DTO
  async function handleTrainTroops(
    troops: { troop_name: string; quantity: number }[],
  ) {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/village/troop/train`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ troops }),
      });
      if (!res.ok) {
        const t = await res.text();
        showToast(t || "Training failed", "error");
        return;
      }

      // Optimistic state update — preserve the server-known level for each troop
      setPlayerData((prev) => {
        if (!prev) return prev;
        const updatedTroops: TroopsSync[] = troops
          .filter((t) => t.quantity > 0)
          .map((t) => {
            const existing = prev.troops?.find((e) => e.name === t.troop_name);
            const cat = TROOP_CATALOG.find((c) => c.name === t.troop_name);
            return {
              troop_id: cat?.id ?? 0,
              name: t.troop_name,
              level: existing?.level ?? cat?.level ?? 1,
              quantity: t.quantity,
            };
          });
        return { ...prev, troops: updatedTroops };
      });
      showToast("Army trained!", "success");
    } catch {
      showToast("Training failed", "error");
    }
  }

  // troopName: string — new backend DTO uses troop_name
  async function handleUpgradeTroop(troopName: string) {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/village/troop/upgrade`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ troop_name: troopName }),
      });
      if (!res.ok) {
        const t = await res.text();
        showToast(t || "Upgrade failed", "error");
        return;
      }

      // Increment the level of this troop in local state immediately
      setPlayerData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          troops: (prev.troops ?? []).map((t) =>
            t.name === troopName ? { ...t, level: t.level + 1 } : t,
          ),
        };
      });
      showToast(`${troopName} upgraded!`, "success");
    } catch {
      showToast("Upgrade failed", "error");
    }
  }

  async function handleBattle() {
    const token = getToken();
    if (!token) return;
    showToast("Searching for opponents…", "info");
    try {
      const res = await fetch(`${API_BASE}/battle/matchmake`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        showToast("HAHA looser, only u play BlastOfBastion", "error");
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      console.log("matchmake:", data)
      setBattleOpponent({ opponent: data.opponent, name: data.name });
      setActiveModal("battle");
    } catch {
      showToast("Matchmaking failed", "error");
    }
  }

  // ── Pixi callbacks ──
  const selectBuilding = useCallback(
    (buildingId: number | null, gridX?: number, gridY?: number) => {
      if (buildingId == null) {
        setSelection(null);
        return;
      }
      const b = playerData?.buildings.find(
        (b) =>
          b.building_id === buildingId &&
          b.grid_x === gridX &&
          b.grid_y === gridY,
      );
      if (!b) return;
      setSelection({
        building_id: b.building_id,
        instance_id: b.id,
        gridX: b.grid_x,
        gridY: b.grid_y,
        name: b.name,
        level: b.level,
        is_built: b.is_built,
        is_barracks: b.name.startsWith("Barrack"),
      });
    },
    [playerData],
  );

  if (isSyncing || !playerData) {
    return (
      <main className="h-screen w-screen bg-[#0d1117] flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <Shield
            size={28}
            className="text-ember animate-pulse"
            style={{ color: "#E8673A" }}
          />
          <span className="font-mono font-bold text-xl text-white">
            BlastOfBastion
          </span>
        </div>
        <p className="text-white/40 text-sm animate-pulse font-mono">
          Syncing with Bastion Server…
        </p>
      </main>
    );
  }

  const stats = playerData.stats;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-green-900">
      {/* ── LAYER 0: Pixi canvas ── */}
      <div className="absolute inset-0 z-0">
        <MapWrapper
          buildings={playerData.buildings}
          onMoveBuilding={handleMoveBuilding}
          placementMode={placementMode}
          onBuild={handleBuildBuilding}
          onSelectBuilding={selectBuilding}
          onCancelBuild={() => setPlacementMode(null)}
        />
      </div>

      {/* ── LAYER 1: Construction timers overlay ── */}
      {/* These float in the HUD but show per-building info */}
      {playerData.buildings.filter((b) => !b.is_built && b.finish_time).length >
        0 && (
        <div className="absolute top-24 right-4 z-20 flex flex-col gap-1 pointer-events-none">
          {playerData.buildings
            .filter((b) => !b.is_built && b.finish_time)
            .map((b) => (
              <div
                key={b.id}
                className="bg-black/60 backdrop-blur-sm border border-amber-500/30 rounded-lg px-3 py-1.5 flex items-center gap-2"
              >
                <BuildingSprite name={b.name} size={20} />
                <span className="text-white text-xs font-semibold">
                  {b.name}
                </span>
                <ConstructionTimer finishTime={b.finish_time!} />
              </div>
            ))}
        </div>
      )}

      {/* ── LAYER 2: HUD ── */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* TOP-RIGHT: Resources */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 pointer-events-auto">
          <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2.5 flex flex-col gap-2">
            <ResourceBar
              label="Gold"
              amount={stats.gold}
              max={stats.max_gold}
              icon={<Coins size={13} className="text-yellow-400" />}
              barColor="bg-yellow-500"
              onCollect={() => collectResource("Gold")}
              collecting={collectingGold}
            />
            <ResourceBar
              label="Elixir"
              amount={stats.elixir}
              max={stats.max_elixir}
              icon={<Zap size={13} className="text-purple-400" />}
              barColor="bg-purple-500"
              onCollect={() => collectResource("Elixir")}
              collecting={collectingElixir}
            />
          </div>
          {/* Trophies pill */}
          <div className="self-end bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5">
            <Shield size={11} className="text-amber-400" />
            <span className="text-white font-bold text-xs">
              {stats.trophies}
            </span>
          </div>
        </div>

        {/* BOTTOM-LEFT: Battle + Upgrade Troops */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-auto">
          <HudButton
            icon={<ChevronUp size={16} />}
            label="Upgrade Troops"
            color="bg-amber-500 border-amber-700"
            onClick={() => setActiveModal("upgrade-troops")}
          />
          <HudButton
            icon={<Swords size={18} />}
            label="BATTLE"
            color="bg-red-600 border-red-800 text-lg tracking-widest"
            onClick={handleBattle}
            large
          />
        </div>

        {/* BOTTOM-RIGHT: Build */}
        <div className="absolute bottom-4 right-4 pointer-events-auto">
          <HudButton
            icon={<Hammer size={18} />}
            label="BUILD"
            color="bg-amber-400 border-amber-600 text-lg tracking-widest"
            onClick={() => {
              setActiveModal("shop");
              setSelection(null);
            }}
            large
          />
        </div>

        {/* Placement mode cancel hint */}
        {placementMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center gap-3 text-white text-sm">
              <span className="font-semibold">Click map to place · </span>
              <button
                onClick={() => setPlacementMode(null)}
                className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── LAYER 3: Toasts ── */}
      <ToastStack toasts={toasts} />

      {/* ── LAYER 4: Modals ── */}
      {activeModal === "shop" && (
        <BuildShop
          onClose={() => setActiveModal(null)}
          onPlace={(id) => {
            setPlacementMode({ building_id: id, size: 3 });
            setActiveModal(null);
          }}
          currentTHLevel={currentTHLevel}
          placedBuildings={playerData.buildings}
        />
      )}

      {activeModal === "train" && (
        <TrainTroopsModal
          currentTroops={playerData.troops}
          currentTHLevel={currentTHLevel}
          housing_space={housingSp}
          onClose={() => setActiveModal(null)}
          onTrain={handleTrainTroops}
        />
      )}

      {activeModal === "upgrade-troops" && (
        <UpgradeTroopsModal
          currentTHLevel={currentTHLevel}
          currentTroops={playerData.troops}
          onClose={() => setActiveModal(null)}
          onUpgrade={handleUpgradeTroop}
        />
      )}

      {activeModal === "battle" && (
        <BattleOverlay
          opponent={battleOpponent}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* ── Building Selection Panel ── */}
      {selection && activeModal === null && !placementMode && (
        <SelectionPanel
          sel={selection}
          onClose={() => setSelection(null)}
          onUpgrade={() =>
            handleUpgradeBuilding(
              selection.building_id,
              selection.gridX,
              selection.gridY,
            )
          }
          onTrainTroops={() => setActiveModal("train")}
        />
      )}
    </main>
  );
}

function HudButton({
  icon,
  label,
  color,
  onClick,
  large,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
  large?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 font-bold text-black border-b-4 rounded-xl shadow-lg active:border-b-0 active:translate-y-1 transition-transform ${color} ${large ? "px-5 py-3 text-base" : "px-4 py-2 text-xs"}`}
    >
      {icon} {label}
    </button>
  );
}
