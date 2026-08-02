"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import MapWrapper from "@/components/MapWrapper";
import { VillageSync } from "@/components/VillageMap";
import {
  Coins, Zap, Hammer, Sword, Shield, ChevronUp, X, Info, ArrowUpCircle, Users, Swords, Clock, Target,
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
  finish_time?: number | null;
}
interface UpgradeStats {
  current_level: number;
  next_level: number;
  cost_gold: number;
  cost_elixir: number;
  current_health: number;
  next_health: number;
  time: number;
  defense_stats?: { current_range: number; next_range: number; current_dmg: number; next_dmg: number };
  storage_stats?: { current_capacity: number; next_capacity: number };
  production_stats?: { current_gen: number; next_gen: number };
}

// Dynamic Catalog Interfaces
export interface CatalogBuilding { id: number; name: string; level: number; cost_gold: number; cost_elixir: number; thelev: number; buildTime: number; }
export interface CatalogTroop { id: number; name: string; damage: number; health: number; housing_space: number; level: number; speed: number; unlock_thall_level: number; range: number; cost_elixir: number; }
export type MaxBuildingsMap = Record<string, Record<number, number>>;

interface CatalogData {
  buildings: CatalogBuilding[];
  troops: CatalogTroop[];
  max_buildings: MaxBuildingsMap;
}

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

function CollectionHint({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute top-15 right-60 z-30 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-amber-500/90 text-black px-4 py-3 rounded-xl shadow-2xl border border-amber-300 w-48 text-center relative">
        <button 
          onClick={onClose} 
          className="absolute -top-2 -right-2 bg-black text-white rounded-full p-0.5 hover:bg-gray-800"
        >
          <X size={12} />
        </button>
        <p className="text-xs font-bold leading-tight">
          Click these icons to collect your resources! 💰
        </p>
      </div>
      <div className="absolute -right-2 top-2 w-4 h-4 bg-amber-500 rotate-45" />
    </div>
  );
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
  label, amount, max, icon, barColor, onCollect, collecting,
}: {
  label: string; amount: number; max: number; icon: React.ReactNode; barColor: string; onCollect: () => void; collecting: boolean;
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

function ConstructionTimer({ finishTime, display }: { finishTime: string | number, display: boolean }) {
  const targetTimeMs = typeof finishTime === "string" ? new Date(finishTime).getTime() : finishTime;
  const [secsLeft, setSecsLeft] = useState(Math.max(0, Math.ceil((targetTimeMs - Date.now()) / 1000)));

  useEffect(() => {
    const iv = setInterval(() => setSecsLeft(Math.max(0, Math.ceil((targetTimeMs - Date.now()) / 1000))), 1000);
    return () => clearInterval(iv);
  }, [targetTimeMs]);
  
  if (!display) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-300`}>
      <Clock size={11} /> {formatTime(secsLeft)}
    </span>
  );
}

function BuildShop({
  onClose,
  onPlace,
  currentTHLevel,
  placedBuildings,
  catalogBuildings,
  maxBuildingsDB
}: {
  onClose: () => void;
  onPlace: (buildingId: number) => void;
  currentTHLevel: number;
  placedBuildings: VillageSync[];
  catalogBuildings: CatalogBuilding[];
  maxBuildingsDB: MaxBuildingsMap;
}) {
  const shopItems = catalogBuildings.filter(i => i.level === 1 && i.id !== 3001 && i.id !== 4001);
  const categories = Array.from(
    new Set(
      shopItems.map((i) => {
        if (i.id >= 1000 && i.id < 2000) return "Defense";
        if (i.id >= 2000 && i.id < 3000) return "Resources";
        return "Base";
      }),
    ),
  );
  const [activeTab, setActiveTab] = useState(categories[0]);

  const filtered = shopItems.filter((i) => {
    if (activeTab === "Defense") return i.id >= 1000 && i.id < 2000;
    if (activeTab === "Resources") return i.id >= 2000 && i.id < 3000;
    return i.id >= 3000;
  });

  const countPlaced = (displayName: string): number => {
    const dbKey = DISPLAY_TO_DB_KEY[displayName] || displayName;
    return placedBuildings.filter((b) => {
      const bKey = DISPLAY_TO_DB_KEY[b.name] || b.name;
      return bKey === dbKey || b.name === displayName;
    }).length;
  };

  const getBuildStatus = (item: CatalogBuilding): { disabled: boolean; reason: string | null } => {
    if (currentTHLevel < item.thelev) {
      return { disabled: true, reason: `TH${item.thelev}+` };
    }
    const dbKey = DISPLAY_TO_DB_KEY[item.name] || item.name.replace(/\s/g, "");
    if (maxBuildingsDB[dbKey]) {
      const maxAllowed = maxBuildingsDB[dbKey]?.[currentTHLevel] ?? 999;
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
    <div className="absolute inset-0 z-50 flex items-end justify-center pb-4 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose}>
      <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Hammer size={16} className="text-amber-400" />
            <h2 className="font-bold text-white tracking-wide text-sm">BUILD</h2>
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
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 p-4 max-h-[50vh] overflow-y-auto">
          {filtered.map((item) => {
            const { disabled, reason } = getBuildStatus(item);
            return (
              <div
                key={item.id}
                className={["flex flex-col items-center gap-2 p-3 rounded-xl border transition-all bg-white/5", disabled ? "border-white/5 opacity-50 cursor-not-allowed" : "border-white/10 hover:border-amber-500/50 cursor-pointer"].join(" ")}
              >
                <BuildingSprite name={item.name} size={52} />
                <span className="text-white text-xs font-semibold text-center leading-tight">{item.name}</span>
                <div className="flex flex-col items-center text-[10px] font-bold gap-0.5">
                  {item.cost_gold > 0 && (
                    <span className="text-yellow-400 flex items-center gap-0.5"><Coins size={9} />{item.cost_gold.toLocaleString()}</span>
                  )}
                  {item.cost_elixir > 0 && (
                    <span className="text-purple-400 flex items-center gap-0.5"><Zap size={9} />{item.cost_elixir.toLocaleString()}</span>
                  )}
                  <span className="text-white/40 flex items-center gap-0.5"><Clock size={9} />{formatTime(item.buildTime)}</span>
                </div>
                {disabled ? (
                  <span className="text-[10px] text-red-400 font-bold text-center">{reason}</span>
                ) : (
                  <button
                    onClick={() => { onPlace(item.id); onClose(); }}
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

function UpgradeConfirmModal({
  sel,
  currentGold,
  currentElixir,
  onConfirm,
  onCancel,
}: {
  sel: SelectionState;
  currentGold: number;
  currentElixir: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [stats, setStats] = useState<UpgradeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/village/building/upgrade-info?id=${sel.building_id}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error("Failed to load upgrade stats", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [sel.building_id]);

  if (loading) return <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white z-60 pointer-events-auto">Loading...</div>;
  if (!stats) return null;

  // FE Check: Ensure player has enough gold/elixir
  const canAfford = currentGold >= stats.cost_gold && currentElixir >= stats.cost_elixir;

  return (
    <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto" onClick={onCancel}>
      <div className="bg-[#1a1f2e] border border-white/15 rounded-2xl shadow-2xl w-80 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-3 flex items-center gap-2">
          <ArrowUpCircle size={16} className="text-amber-400" />
          <span className="text-white font-bold text-sm tracking-wide">Confirm Upgrade</span>
        </div>

        <div className="px-5 pt-4 pb-3 flex items-center gap-3">
          <BuildingSprite name={sel.name} size={44} />
          <div>
            <p className="text-white font-semibold text-sm">{sel.name.replace(/([A-Z])/g, " $1").trim()}</p>
            <p className="text-white/40 text-xs">Level {stats.current_level} → <span className="text-amber-400 font-bold">Level {stats.next_level}</span></p>
          </div>
        </div>
        <div className="mx-5 mb-4 rounded-xl bg-white/5 border border-white/10 divide-y divide-white/10 text-xs">
          {stats.cost_gold > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-white/60 font-semibold flex items-center gap-1.5"><Coins size={12} className="text-yellow-400"/> Gold</span>
              <span className={`${currentGold < stats.cost_gold ? "text-red-500" : "text-yellow-400"} font-bold`}>{stats.cost_gold.toLocaleString()}</span>
            </div>
          )}
          {stats.cost_elixir > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-white/60 font-semibold flex items-center gap-1.5"><Zap size={12} className="text-purple-400"/> Elixir</span>
              <span className={`${currentElixir < stats.cost_elixir ? "text-red-500" : "text-purple-400"} font-bold`}>{stats.cost_elixir.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-white/60 font-semibold flex items-center gap-1.5"><Clock size={12} className="text-sky-400"/> Time</span>
            <span className="text-sky-300 font-bold">{formatTime(stats.time)}</span>
          </div>
        </div>

        <div className="mx-5 mb-4 rounded-xl bg-white/5 border border-white/10 divide-y divide-white/10 text-xs">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-white/60 font-semibold flex items-center gap-1.5"><Shield size={12} className="text-emerald-400"/> Health</span>
            <span className="text-white font-bold">{stats.current_health} → <span className="text-emerald-400">{stats.next_health}</span></span>
          </div>
          {stats.defense_stats && (
            <>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-white/60 font-semibold flex items-center gap-1.5"><Target size={12} className="text-red-400"/> Range</span>
                <span className="text-white font-bold">{stats.defense_stats.current_range} → <span className="text-red-400">{stats.defense_stats.next_range}</span></span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-white/60 font-semibold flex items-center gap-1.5"><Target size={12} className="text-red-400"/> Damage</span>
                <span className="text-white font-bold">{stats.defense_stats.current_dmg} → <span className="text-red-400">{stats.defense_stats.next_dmg}</span></span>
              </div>
            </>
          )}
          {stats.storage_stats && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-white/60 font-semibold flex items-center gap-1.5"><Coins size={12} className="text-yellow-400"/> Capacity</span>
              <span className="text-white font-bold">{stats.storage_stats.current_capacity} → <span className="text-yellow-400">{stats.storage_stats.next_capacity}</span></span>
            </div>
          )}
          {stats.production_stats && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-white/60 font-semibold flex items-center gap-1.5"><Coins size={12} className="text-yellow-400"/> Generation/Hour</span>
              <span className="text-white font-bold">{stats.production_stats.current_gen} → <span className="text-yellow-400">{stats.production_stats.next_gen}</span></span>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 font-bold text-sm transition-colors">Cancel</button>
          <button 
            onClick={onConfirm} 
            disabled={!canAfford}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              canAfford 
                ? "bg-amber-500 hover:bg-amber-400 text-black active:scale-95" 
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            {canAfford ? "Upgrade" : "Not Enough Loot"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectionPanel({
  sel,
  onClose,
  onUpgrade,
  onTrainTroops,
  currentTHLevel,
  catalogBuildings,
  currentGold,
  currentElixir,
}: {
  sel: SelectionState;
  onClose: () => void;
  onUpgrade: () => void;
  onTrainTroops: () => void;
  currentTHLevel: number;
  catalogBuildings: CatalogBuilding[];
  currentGold: number;
  currentElixir: number;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const nextItem = catalogBuildings.find((i) => i.id === sel.building_id + 1);
  const isMaxLevel = !nextItem;
  const canUpgrade = nextItem ? currentTHLevel >= nextItem.thelev : false;
  const isBarracks = sel.name.startsWith("Barrack");

  return (
    <>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <div className="bg-[#1a1f2e]/95 border border-white/15 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 backdrop-blur-md">
          <BuildingSprite name={sel.name} size={44} />
          <div className="flex flex-col mr-2">
            <span className="text-white text-sm font-bold">{sel.name.replace(/([A-Z])/g, " $1").trim()}</span>
            <span className="text-white/50 text-xs">Level {sel.level}</span>
            {!sel.is_built && (
              <span className="text-amber-400 text-[11px] font-mono flex items-center gap-1 mt-0.5">
                <Clock size={10} /> Under construction
                <ConstructionTimer finishTime={sel.finish_time!} display={true} />
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {!isMaxLevel && sel.is_built && canUpgrade && (
              <ActionButton
                icon={<ArrowUpCircle size={14} />}
                label="Upgrade"
                color="bg-amber-500 hover:bg-amber-400"
                onClick={() => setShowConfirm(true)}
              />
            )}
            {!isMaxLevel && sel.is_built && !canUpgrade && (
               <span className="text-[10px] text-red-400 font-bold px-2 flex items-center">
                 TH{nextItem.thelev}+
               </span>
            )}

            {isBarracks && sel.is_built && (
              <ActionButton
                icon={<Users size={14} />}
                label="Train"
                color="bg-purple-600 hover:bg-purple-500"
                onClick={onTrainTroops}
              />
            )}
          </div>

          <button onClick={onClose} className="ml-1 text-white/30 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {showConfirm && (
        <UpgradeConfirmModal
          sel={sel}
          currentGold={currentGold}
          currentElixir={currentElixir}
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

function ActionButton({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void; }) {
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

function TrainTroopsModal({
  troopCatalog,
  currentTroops,
  currentTHLevel,
  housing_space,
  onClose,
  onTrain,
}: {
  troopCatalog: CatalogTroop[];
  currentTroops: TroopsSync[] | null;
  currentTHLevel: number;
  housing_space: number;
  onClose: () => void;
  onTrain: (troops: { troop_name: string; quantity: number }[]) => Promise<void>;
}) {
  const safeTroops = currentTroops ?? [];

  const [draft, setDraft] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    safeTroops.forEach((t) => m.set(t.name, t.quantity));
    return m;
  });
  const [training, setTraining] = useState(false);

  const totalUsed = Array.from(draft.entries()).reduce((sum, [name, qty]) => {
    const cat = troopCatalog.find((t) => t.name === name);
    return sum + qty * (cat?.housing_space ?? 0);
  }, 0);

  const adjust = (name: string, delta: number) => {
    const cat = troopCatalog.find((t) => t.name === name);
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

  const spacePct = housing_space > 0 ? Math.min((totalUsed / housing_space) * 100, 100) : 0;

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center pb-4 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose}>
      <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Swords size={15} className="text-purple-400" />
            <h2 className="font-bold text-white text-sm tracking-wide">TRAIN TROOPS</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50 font-mono">{totalUsed} / {housing_space} space</span>
            <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full transition-all ${spacePct >= 100 ? "bg-red-500" : "bg-purple-500"}`} style={{ width: `${spacePct}%` }} />
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3 p-4">
          {troopCatalog.map((troop) => {
            const locked = troop.unlock_thall_level > currentTHLevel;
            const qty = draft.get(troop.name) ?? 0;

            return (
              <div
                key={troop.id}
                className={["flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-colors", locked ? "border-white/5 opacity-40" : qty > 0 ? "border-purple-500/50 bg-purple-900/20" : "border-white/10 bg-white/5"].join(" ")}
              >
                <TroopSprite name={troop.name} />
                <span className="text-white text-[10px] font-semibold text-center leading-tight">{troop.name}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Lv {troop.level}</span>
                <span className="text-white/40 text-[9px]">{troop.housing_space}⚡</span>

                {locked ? (
                  <span className="text-[9px] text-red-400 font-bold mt-auto">TH{troop.unlock_thall_level}+</span>
                ) : (
                  <div className="flex items-center gap-1 mt-auto">
                    <button onClick={() => adjust(troop.name, -1)} className="w-5 h-5 rounded bg-white/10 hover:bg-red-500/30 text-white font-bold text-xs flex items-center justify-center transition-colors">−</button>
                    <span className={`font-mono text-xs w-5 text-center font-bold ${qty > 0 ? "text-purple-300" : "text-white/40"}`}>{qty}</span>
                    <button onClick={() => adjust(troop.name, +1)} className="w-5 h-5 rounded bg-white/10 hover:bg-green-500/30 text-white font-bold text-xs flex items-center justify-center transition-colors">+</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-4 mb-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1.5">Current Saved Army</p>
          {safeTroops.length === 0 ? (
            <p className="text-white/25 text-xs italic">No troops trained yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {safeTroops.map((t) => (
                <div key={t.troop_id} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
                  <span className="text-white text-[11px] font-semibold">{t.name}</span>
                  <span className="text-purple-300 text-[11px] font-mono">×{t.quantity}</span>
                  <span className="text-amber-400 text-[9px] font-bold">Lv{t.level}</span>
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
            {training ? "Sending to Barracks…" : `Train Army (${totalUsed} / ${housing_space} space)`}
          </button>
        </div>
      </div>
    </div>
  );
}

function UpgradeTroopsModal({
  troopCatalogAll,
  troopCatalog,
  troopUpgrade,
  currentTHLevel,
  currentElixir,
  onClose,
  onUpgrade,
}: {
  troopCatalogAll: CatalogTroop[];
  troopCatalog: CatalogTroop[];
  troopUpgrade: CatalogTroop[];
  currentTHLevel: number;
  currentElixir: number;
  onClose: () => void;
  onUpgrade: (troopName: string) => Promise<void>;
}) {
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const handleUpgrade = async (name: string) => {
    setUpgrading(name);
    await onUpgrade(name);
    setUpgrading(null);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center pb-4 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose}>
      <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ChevronUp size={15} className="text-amber-400" />
            <h2 className="font-bold text-white text-sm tracking-wide">UPGRADE TROOPS</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white"><X size={18} /></button>
        </div>

        <p className="px-5 pt-3 pb-1 text-white/40 text-xs">
          Upgrading a troop costs Elixir and immediately improves all units of that type.
        </p>

        <div className="grid grid-cols-5 gap-3 p-4">
          {troopUpgrade.map((troop) => {
            const currentItem = troopCatalog.find((t) => t.name === troop.name);
            const locked = troop.unlock_thall_level > currentTHLevel;
            const isMax = currentItem?.id === troop.id && (currentItem?.level ?? 1) > 1;
            const cantAfford = currentElixir < troop.cost_elixir;
            const isUpgrading = upgrading === troop.name;

            return (
              <div
                key={troop.id}
                className={["flex flex-col items-center gap-2 p-2 rounded-xl border transition-colors", locked || isMax ? "border-white/5 opacity-40" : "border-white/10 bg-white/5"].join(" ")}
              >
                <TroopSprite name={troop.name} />
                <span className="text-white text-[10px] font-semibold text-center leading-tight">{troop.name}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isMax ? `Lv ${troop.level} (MAX)` : `Lv ${troop.level}`}
                </span>

                {!isMax && (
                  <span className={`${cantAfford ? "text-red-500" : "text-purple-300"} text-[9px] flex items-center gap-0.5`}><Zap size={8} />{troop.cost_elixir.toLocaleString()}</span>
                )}

                {isMax ? (
                  <span className="text-[9px] text-emerald-400 font-bold mt-auto">MAX</span>
                ) : locked ? (
                  <span className="text-[9px] text-red-400 font-bold mt-auto">TH{troop.unlock_thall_level}+</span>
                ) : (
                  <button
                    onClick={() => handleUpgrade(troop.name)}
                    disabled={isUpgrading || cantAfford}
                    className={`w-full mt-auto disabled:opacity-60 text-black text-[10px] font-bold py-1 rounded-lg transition-all ${
                      cantAfford ? "bg-gray-600 text-gray-400 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-400 active:scale-95"
                    }`}
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

function BattleOverlay({ opponent, onClose }: { opponent: { opponent: string; name: string } | null; onClose: () => void; }) {
  const router = useRouter();
  const handleStartBattle = () => {
    if (!opponent) return;
    router.push(`/battle?id=${opponent.opponent}`);
  };
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto" onClick={onClose}>
      <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <Shield size={40} className="text-red-400 mx-auto mb-3" />
        <h2 className="text-white font-bold text-xl mb-1 tracking-wide">BATTLE</h2>
        {opponent == null ? (
          <p className="text-white/50 text-sm mt-4">No opponents found nearby. Check back later.</p>
        ) : (
          <>
            <p className="text-white/60 text-sm mb-4">Opponent Found</p>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto text-left">
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                <Sword size={13} className="text-red-400 shrink-0" />
                <span className="text-white text-xs font-mono">{opponent.name}</span>
                <span className="ml-auto text-[10px] text-white/30">{opponent.name}</span>
              </div>
            </div>
          </>
        )}
        <div className="flex flex-row justify-center items-center gap-4 w-full mt-5">
          <button onClick={handleStartBattle} className="w-2/5 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm">Battle</button>
          <button onClick={onClose} className="w-2/5 bg-red-800 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

const BUILDING_COLORS: Record<string, string> = {
  "Town Hall": "#3b82f6", "Gold Mine": "#eab308", "Elixir Collector": "#a855f7", "Gold Storage": "#ca8a04", "Elixir Storage": "#9333ea", "Army Camp": "#78716c", Barracks: "#ea580c", Cannon: "#6b7280", "Archer Tower": "#16a34a", "Wizard Tower": "#2563eb", TownHall: "#3b82f6", GoldMine: "#eab308", ElixirColl: "#a855f7", ElixirCollector: "#a855f7", GoldStor: "#ca8a04", GoldStorage: "#ca8a04", ElixirStor: "#9333ea", ElixirStorage: "#9333ea", ArmyCamp: "#78716c", Barrack: "#ea580c", ATower: "#16a34a", ArcherTower: "#16a34a", WTower: "#2563eb", WizardTower: "#2563eb",
};

function BuildingSprite({ name, size = 48 }: { name: string; size?: number }) {
  const color = BUILDING_COLORS[name] ?? "#888";
  const label = name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <div style={{ width: size, height: size, background: color, fontSize: size * 0.3 }} className="rounded-lg border-2 border-black/30 flex items-center justify-center font-bold text-white shadow-md shrink-0">
      {label}
    </div>
  );
}

export function TroopSprite({ name }: { name: string }) {
  const colors: Record<string, string> = { Barbarian: "#f97316", Archer: "#ec4899", Giant: "#84cc16", Goblin: "#22d3ee", Wizard: "#f43f5e" };
  const c = colors[name] ?? "#888";
  return (
    <div style={{ width: 40, height: 40, background: c }} className="rounded-full border-2 border-black/30 flex items-center justify-center font-bold text-white text-xs shadow">
      {name[0]}
    </div>
  );
}

type ActiveModal = "shop" | "train" | "upgrade-troops" | "battle" | null;

export default function VillageScreen() {
  const [playerData, setPlayerData] = useState<GameDataSyncResponse | null>(null);
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);
  const [placementMode, setPlacementMode] = useState<{ building_id: number; size: number; } | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [collectingGold, setCollectingGold] = useState(false);
  const [collectingElixir, setCollectingElixir] = useState(false);
  const [battleOpponent, setBattleOpponent] = useState<{ opponent: string; name: string; } | null>(null);
  const toastIdRef = useRef(0);

  const [troopCatalog, setTroopCatalog] = useState<CatalogTroop[]>([]);
  const [troopUpgrade, setTroopUpgrade] = useState<CatalogTroop[]>([]);
  const [showHint, setShowHint] = useState(false);

  const housingSp = playerData?.buildings
    .filter((b) => (b.name === "ArmyCamp" || b.name === "Army Camp") && b.is_built)
    .reduce((sum, camp) => sum + (10 + (camp.level * 10)), 0) || 20;

  function getToken(): string | null {
    const t = localStorage.getItem("JWTtoken");
    if (!t) { window.location.href = "/login"; return null; }
    return t;
  }

  const syncTroopLevelsLocally = useCallback((catData: CatalogData, rawLevelData: any) => {
    const newCatalog: CatalogTroop[] = [];
    const newUpgrade: CatalogTroop[] = [];

    const baseNames = ["Barbarian", "Archer", "Goblin", "Giant", "Wizard"];
    const baseIds: Record<string, number> = { Barbarian: 100, Archer: 200, Goblin: 300, Giant: 400, Wizard: 500 };

    baseNames.forEach((name) => {
      const lowerName = name.toLowerCase();
      let val = rawLevelData ? rawLevelData[lowerName] : undefined;

      if (val !== undefined && val < 100) val = baseIds[name] + val;

      if (val === undefined || val % 100 === 0) {
        const item = catData.troops.find((t) => t.id === baseIds[name] + 1);
        if (item) { newCatalog.push(item); newUpgrade.push(item); }
      } else {
        const currentItem = catData.troops.find((t) => t.id === val);
        if (currentItem) {
          newCatalog.push(currentItem);
          let upgradeItem = catData.troops.find((t) => t.id === val + 1);
          if (!upgradeItem) upgradeItem = currentItem;
          newUpgrade.push(upgradeItem);
        } else {
          const fallbackItem = catData.troops.find((t) => t.id === baseIds[name] + 1);
          if (fallbackItem) { newCatalog.push(fallbackItem); newUpgrade.push(fallbackItem); }
        }
      }
    });
    setTroopCatalog(newCatalog);
    setTroopUpgrade(newUpgrade);
  }, []);

  const fetchTroopLevelsStandalone = useCallback(async () => {
    if (!catalog) return;
    try {
      const res = await fetch(`${API_BASE}/village/troop/levelsync`, { headers: authHeaders() });
      if (res.ok) {
        const rawLevelData = await res.json();
        syncTroopLevelsLocally(catalog, rawLevelData);
      }
    } catch (error) {
      console.error("Failed to sync troop levels", error);
    }
  }, [catalog, syncTroopLevelsLocally]);

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) return;
      try {
        const [catRes, syncRes, tLevelRes] = await Promise.all([
          fetch(`${API_BASE}/village/catalog`, { headers: authHeaders() }),
          fetch(`${API_BASE}/village/sync`, { headers: authHeaders() }),
          fetch(`${API_BASE}/village/troop/levelsync`, { headers: authHeaders() })
        ]);

        if (!catRes.ok || !syncRes.ok) throw new Error("Initialization failed");

        const catData: CatalogData = await catRes.json();
        const syncData: GameDataSyncResponse = await syncRes.json();
        const tLevelData = await tLevelRes.json();

        setCatalog(catData);
        setPlayerData(syncData);
        syncTroopLevelsLocally(catData, tLevelData);

      } catch (err) {
        showToast("Failed to connect to Bastion server", "error");
      } finally {
        setIsSyncing(false);
      }
    })();
  }, [syncTroopLevelsLocally]);

  const showToast = useCallback((text: string, kind: ToastMsg["kind"] = "info") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, text, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  useEffect(() => {
    if (!playerData) return;
    const iv = setInterval(() => {
      const now = Date.now();
      playerData.buildings.forEach((b) => {
        if (!b.is_built && b.finish_time) {
          const targetTime = typeof b.finish_time === "string" ? new Date(b.finish_time).getTime() : b.finish_time;
          if (now >= targetTime) {
            completeBuilding(b.id, b.grid_x, b.grid_y);
          }
        }
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [playerData]);

  const townHall = playerData?.buildings.find((b) => b.name === "TownHall" || b.name === "Town Hall");
  const currentTHLevel = townHall?.level ?? 1;

  async function collectResource(type: "Gold" | "Elixir") {
    if (type === "Gold") setCollectingGold(true);
    else setCollectingElixir(true);
    try {
      const res = await fetch(`${API_BASE}/village/collect/${type.toLowerCase()}`, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error("collect failed");
      const data = await res.json();
      setPlayerData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            gold: type === "Gold" ? prev.stats.gold + data.change : prev.stats.gold,
            elixir: type === "Elixir" ? prev.stats.elixir + data.change : prev.stats.elixir,
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

  async function handleBuildBuilding(buildingId: number, gridX: number, gridY: number) {
    if (!catalog) return;
    if (gridX > 29 || gridX < 1 || gridY > 29 || gridY < 1) { setPlacementMode(null); return; }
    
    try {
      const res = await fetch(`${API_BASE}/village/building/new`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ building_id: buildingId, grid_x: gridX, grid_y: gridY }),
      });
      if (!res.ok) {
        const txt = await res.text();
        showToast(txt || "Build failed", "error");
        setPlacementMode(null);
        return;
      }
      const shopItem = catalog.buildings.find((i) => i.id === buildingId);
      if (!shopItem) return;
      const newB: VillageSync = {
        id: Date.now(), building_id: buildingId, name: shopItem.name, level: 1, grid_x: gridX, grid_y: gridY,
        is_built: false, finish_time: Date.now() + shopItem.buildTime * 1000,
      };
      setPlayerData((prev) => {
        if (!prev) return prev;
        return {
          ...prev, buildings: [...prev.buildings, newB],
          stats: { ...prev.stats, gold: prev.stats.gold - shopItem.cost_gold, elixir: prev.stats.elixir - shopItem.cost_elixir },
        };
      });
      showToast(`${shopItem.name} placed! Builds in ${formatTime(shopItem.buildTime)}`, "success");
      setPlacementMode(null);
    } catch {
      showToast("Build failed", "error");
      setPlacementMode(null);
    }
  }

  async function handleMoveBuilding(buildingId: number, newX: number, newY: number, oldX: number, oldY: number) {
    try {
      const res = await fetch(`${API_BASE}/village/building/move`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ building_id: buildingId, grid_x: newX, grid_y: newY, init_grid_x: oldX, init_grid_y: oldY }),
      });
      if (!res.ok) {
        showToast("Can't move there", "error");
        setPlayerData((prev) => prev ? { ...prev, buildings: [...prev.buildings] } : prev);
        return;
      }
      setPlayerData((prev) => {
        if (!prev) return prev;
        return { ...prev, buildings: prev.buildings.map((b) => b.id === buildingId ? { ...b, grid_x: newX, grid_y: newY } : b) };
      });
    } catch {
      showToast("Move failed", "error");
    }
  }

  async function completeBuilding(instanceId: number, gridX: number, gridY: number) {
    try {
      const res = await fetch(`${API_BASE}/village/building/upgrade-finish`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ id: instanceId, grid_x: gridX, grid_y: gridY }),
      });
      if (!res.ok) return;
      setPlayerData((prev) => {
        if (!prev) return prev;
        let dGold = 0, dElixir = 0;
        const buildings = prev.buildings.map((b) => {
          if (b.id !== instanceId) return b;
          if (b.building_id === 3011) dGold += 1500;
          if (b.building_id === 3021) dElixir += 1500;
          return { ...b, is_built: true, finish_time: null };
        });
        return {
          ...prev, buildings,
          stats: { ...prev.stats, max_gold: prev.stats.max_gold + dGold, max_elixir: prev.stats.max_elixir + dElixir },
        };
      });
    } catch { }
  }

  async function handleUpgradeBuilding(buildingId: number, gridX: number, gridY: number) {
    if (!catalog) return;
    try {
      const res = await fetch(`${API_BASE}/village/building/upgrade-start`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ building_id: buildingId, grid_x: gridX, grid_y: gridY }),
      });
      if (!res.ok) {
        const t = await res.text();
        showToast(t || "Upgrade failed", "error");
        return;
      }

      const target = playerData?.buildings.find((b) => b.building_id === buildingId && b.grid_x === gridX && b.grid_y === gridY);
      const nextItem = catalog.buildings.find((i) => i.id === buildingId + 1);
      if (!target || !nextItem) return;

      setPlayerData((prev) => {
        if (!prev) return prev;
        const buildings = prev.buildings.map((b) =>
          b.building_id === buildingId && b.grid_x === gridX && b.grid_y === gridY
            ? { ...b, building_id: buildingId + 1, level: b.level + 1, is_built: false, finish_time: Date.now() + nextItem.buildTime * 1000 }
            : b,
        );
        return {
          ...prev, buildings,
          stats: { ...prev.stats, gold: prev.stats.gold - nextItem.cost_gold, elixir: prev.stats.elixir - nextItem.cost_elixir },
        };
      });
      showToast(`Upgrading ${target.name} to Lv ${target.level + 1}! (${formatTime(nextItem.buildTime)})`, "info");
      setSelection(null);
    } catch {
      showToast("Upgrade failed", "error");
    }
  }

  async function handleTrainTroops(troops: { troop_name: string; quantity: number }[]) {
    if (!catalog) return;
    try {
      const res = await fetch(`${API_BASE}/village/troop/train`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ troops }),
      });
      if (!res.ok) {
        const t = await res.text();
        showToast(t || "Training failed", "error");
        return;
      }

      setPlayerData((prev) => {
        if (!prev) return prev;
        const updatedTroops: TroopsSync[] = troops
          .filter((t) => t.quantity > 0)
          .map((t) => {
            const existing = prev.troops?.find((e) => e.name === t.troop_name);
            const cat = catalog.troops.find((c) => c.name === t.troop_name);
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

  async function handleUpgradeTroop(troopName: string) {
    try {
      const res = await fetch(`${API_BASE}/village/troop/upgrade`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ troop_name: troopName }),
      });
      if (!res.ok) {
        const t = await res.text();
        showToast(t || "Upgrade failed", "error");
        return;
      }

      setPlayerData((prev) => {
        if (!prev) return prev;
        return {
          ...prev, troops: (prev.troops ?? []).map((t) => t.name === troopName ? { ...t, level: t.level + 1 } : t),
        };
      });
      showToast(`${troopName} upgraded!`, "success");
      await fetchTroopLevelsStandalone();
    } catch {
      showToast("Upgrade failed", "error");
    }
  }

  async function handleBattle() {
    const hasArmy = playerData?.troops && playerData.troops.some(t => t.quantity > 0);
    if (!hasArmy) { setActiveModal("train"); return; }
    showToast("Searching for opponents…", "info");
    try {
      const res = await fetch(`${API_BASE}/battle/matchmake`, { headers: authHeaders() });
      if (res.status === 404) { showToast("HAHA looser, only u play BlastOfBastion", "error"); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBattleOpponent({ opponent: data.opponent, name: data.name });
      setActiveModal("battle");
    } catch {
      showToast("Matchmaking failed", "error");
    }
  }

  useEffect(() => {
    const hasSeen = localStorage.getItem("has_seen_collection_hint");
    if (!hasSeen) {
      const timer = setTimeout(() => setShowHint(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissHint = () => {
    setShowHint(false);
    localStorage.setItem("has_seen_collection_hint", "true");
  };

  const selectBuilding = useCallback((buildingId: number | null, gridX?: number, gridY?: number) => {
    if (buildingId == null) { setSelection(null); return; }
    const b = playerData?.buildings.find((b) => b.building_id === buildingId && b.grid_x === gridX && b.grid_y === gridY);
    if (!b) return;
    setSelection({
      building_id: b.building_id, instance_id: b.id, gridX: b.grid_x, gridY: b.grid_y, name: b.name,
      level: b.level, is_built: b.is_built, is_barracks: b.name.startsWith("Barrack"), finish_time: b.finish_time,
    });
  }, [playerData]);

  if (isSyncing || !playerData || !catalog) {
    return (
      <main className="h-screen w-screen bg-[#0d1117] flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <Shield size={28} className="text-ember animate-pulse" style={{ color: "#E8673A" }} />
          <span className="font-mono font-bold text-xl text-white">BlastOfBastion</span>
        </div>
        <p className="text-white/40 text-sm animate-pulse font-mono">Syncing with Bastion Server…</p>
      </main>
    );
  }

  const stats = playerData.stats;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-green-900">
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

      {playerData.buildings.filter((b) => !b.is_built && b.finish_time).length > 0 && (
        <div className="absolute top-24 right-4 z-20 flex flex-col gap-1 pointer-events-none">
          {playerData.buildings.filter((b) => !b.is_built && b.finish_time).map((b) => (
            <ConstructionTimer key={b.id} finishTime={b.finish_time!} display={false} />
          ))}
        </div>
      )}

      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute top-3 right-3 flex flex-col gap-2 pointer-events-auto">
          {showHint && <CollectionHint onClose={dismissHint} />}
          <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2.5 flex flex-col gap-2">
            <ResourceBar label="Gold" amount={stats.gold} max={stats.max_gold} icon={<Coins size={13} className="text-yellow-400" />} barColor="bg-yellow-500" onCollect={() => collectResource("Gold")} collecting={collectingGold} />
            <ResourceBar label="Elixir" amount={stats.elixir} max={stats.max_elixir} icon={<Zap size={13} className="text-purple-400" />} barColor="bg-purple-500" onCollect={() => collectResource("Elixir")} collecting={collectingElixir} />
          </div>
          <div className="self-end bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5">
            <Shield size={11} className="text-amber-400" />
            <span className="text-white font-bold text-xs">{stats.trophies}</span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-auto">
          <HudButton icon={<ChevronUp size={16} />} label="Upgrade Troops" color="bg-amber-500 border-amber-700" onClick={() => setActiveModal("upgrade-troops")} />
          <HudButton icon={<Swords size={18} />} label="BATTLE" color="bg-red-600 border-red-800 text-lg tracking-widest" onClick={handleBattle} large />
        </div>

        <div className="absolute bottom-4 right-4 pointer-events-auto">
          <HudButton
            icon={<Hammer size={18} />} label="BUILD" color="bg-amber-400 border-amber-600 text-lg tracking-widest"
            onClick={() => { setActiveModal("shop"); setSelection(null); }} large
          />
        </div>

        {placementMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center gap-3 text-white text-sm">
              <span className="font-semibold">Click map to place · </span>
              <button onClick={() => setPlacementMode(null)} className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1"><X size={14} /> Cancel</button>
            </div>
          </div>
        )}
      </div>

      <ToastStack toasts={toasts} />

      {activeModal === "shop" && (
        <BuildShop
          onClose={() => setActiveModal(null)}
          onPlace={(id) => { setPlacementMode({ building_id: id, size: 3 }); setActiveModal(null); }}
          currentTHLevel={currentTHLevel}
          placedBuildings={playerData.buildings}
          catalogBuildings={catalog.buildings}
          maxBuildingsDB={catalog.max_buildings}
        />
      )}

      {activeModal === "train" && (
        <TrainTroopsModal
          troopCatalog={troopCatalog} currentTroops={playerData.troops} currentTHLevel={currentTHLevel} housing_space={housingSp}
          onClose={() => setActiveModal(null)} onTrain={handleTrainTroops}
        />
      )}

      {activeModal === "upgrade-troops" && (
        <UpgradeTroopsModal
          troopCatalogAll={catalog.troops} troopCatalog={troopCatalog} troopUpgrade={troopUpgrade} currentTHLevel={currentTHLevel} currentElixir={stats.elixir}
          onClose={() => setActiveModal(null)} onUpgrade={handleUpgradeTroop}
        />
      )}

      {activeModal === "battle" && (
        <BattleOverlay opponent={battleOpponent} onClose={() => setActiveModal(null)} />
      )}

      {selection && activeModal === null && !placementMode && (
        <SelectionPanel
          sel={selection} onClose={() => setSelection(null)} currentTHLevel={currentTHLevel} catalogBuildings={catalog.buildings}
          currentGold={stats.gold} currentElixir={stats.elixir}
          onUpgrade={() => handleUpgradeBuilding(selection.building_id, selection.gridX, selection.gridY)}
          onTrainTroops={() => setActiveModal("train")}
        />
      )}
    </main>
  );
}

function HudButton({ icon, label, color, onClick, large }: { icon: React.ReactNode; label: string; color: string; onClick: () => void; large?: boolean; }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 font-bold text-black border-b-4 rounded-xl shadow-lg active:border-b-0 active:translate-y-1 transition-transform ${color} ${large ? "px-5 py-3 text-base" : "px-4 py-2 text-xs"}`}>
      {icon} {label}
    </button>
  );
}