"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AttackWrapper } from "@/components/MapWrapper";
import { authHeaders, TroopSprite } from "../village/page";
import { X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface VillageBuilding {
  id: number;
  building_id: number;
  name: string;
  level: number;
  grid_x: number;
  grid_y: number;
  is_built: boolean;
  finish_time?: string | null;
  hp: number;
  destroyed: boolean;
}

export interface DefenseBuilding {
  id: number;
  building_id: number;
  name: string;
  level: number;
  grid_x: number;
  grid_y: number;
  is_built: boolean;
  finish_time?: string | null;
  hp: number;
  range: number;
  damage: number;
  attackspeed: number;
}

export interface TroopBuilding {
  troop_id: number;
  name: string;
  level: number;
  quantity: number;
  speed: number;
  damage: number;
  range: number;
  hp: number;
}

interface GameDataSyncResponse {
  gold: number;
  elixir: number;
  name: string;
  buildings: VillageBuilding[];
  troops: TroopBuilding[];
}

export interface DeployedTroop {
  id: number;
  troopName: string;
  gridX: number;
  gridY: number;
  speed: number;
  damage: number;
  range: number;
  hp: number;
  maxHp: number;
  lastAttackTime?: number;
}

export interface DeployedTroops {
  troops: DeployedTroop[];
}

export interface Projectile {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  type: "cannon" | "arrow";
}

interface PersistedBattleState {
  opponentId: string;
  startTime: number;
  destroyedIds: number[];
  buildingHealth: Record<number, number>;
  troopQuantities: Record<string, number>;
  deployedTroops: DeployedTroop[];
}

function loadPersistedBattle(opponentId: string): PersistedBattleState | null {
  try {
    const raw = localStorage.getItem(BATTLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: PersistedBattleState = JSON.parse(raw);
    if (parsed.opponentId !== opponentId) return null;
    if (Date.now() - parsed.startTime >= 3 * 60 * 1000) {
      localStorage.removeItem(BATTLE_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
const BATTLE_STORAGE_KEY = "active_battle";
function savePersistedBattle(state: PersistedBattleState) {
  try {
    localStorage.setItem(BATTLE_STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

function clearPersistedBattle() {
  try {
    localStorage.removeItem(BATTLE_STORAGE_KEY);
  } catch {
  }
}

export default function BattlePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const opponentId   = searchParams.get("id");

  const [playerData,        setPlayerData]        = useState<GameDataSyncResponse | null>(null);
  const [defenseBuildings,  setDefBuildings]       = useState<DefenseBuilding[] | null>(null);
  const [selectedTroop,     setSelectedTroop]      = useState<string>("");
  const [deployedTroops,    setDeployedTroops]     = useState<DeployedTroops | null>(null);
  const [startTime,         setStartTime]          = useState<number | null>(null);
  const [endBattle,         setEndBattle]          = useState<boolean>(false);
  const [timerDisplay,      setTimerDisplay]       = useState<string>("03:00");
  const [fetchError,        setFetchError]         = useState<string | null>(null);
  const [buildingDestoryed, setBuildingDestroyed]  = useState<number>(0);
  const [isReturning,       setIsReturning]        = useState<boolean>(false);

  const BATTLE_DURATION_MS = 3 * 60 * 1000;

  const buildingHealthRef  = useRef<Record<number, number>>({});
  const buildingMaxHpRef   = useRef<Record<number, number>>({});
  const defenseCooldownRef = useRef<Record<number, number>>({});
  const projectilesRef     = useRef<Projectile[]>([]);
  const projIdRef          = useRef(0);
  const destructionRef     = useRef(0);
  const goldGainedRef      = useRef(0);
  const elixirGainedRef    = useRef(0);
  
  const deployedTroopsRef  = useRef<DeployedTroop[]>([]);

  const persistStateRef = useRef<{
    opponentId: string;
    startTime: number;
    destroyedIds: number[];
    troopQuantities: Record<string, number>;
  } | null>(null);

  const saveBattleState = useCallback(() => {
    if (!persistStateRef.current) return;
    savePersistedBattle({
      ...persistStateRef.current,
      buildingHealth: { ...buildingHealthRef.current },
      deployedTroops: deployedTroopsRef.current,
    });
  }, []);

  useEffect(() => {
    setPlayerData(null);
    setDefBuildings(null);
    setDeployedTroops(null);
    setEndBattle(false);
    setFetchError(null);
    buildingHealthRef.current  = {};
    buildingMaxHpRef.current   = {};
    defenseCooldownRef.current = {};
    projectilesRef.current     = [];
    deployedTroopsRef.current  = [];  
    persistStateRef.current    = null;

    if (!opponentId) return;

    const persisted = loadPersistedBattle(opponentId);

    async function fetchOpponentBase() {
      function getToken(): string | null {
        const t = localStorage.getItem("JWTtoken");
        if (!t) { window.location.href = "/login"; return null; }
        return t;
      }
      const token = getToken();
      if (!token || !opponentId) return;

      try {
        const res = await fetch(`${API_BASE}/battle/getvillage`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ opponent: opponentId }),
          cache: "no-store",
        });

        if (!res.ok) { setFetchError(`Server returned status ${res.status} for getvillage`); return; }

        const rawText = await res.text();
        if (!rawText) { setFetchError("Go Server returned an empty response for getvillage"); return; }

        const data = JSON.parse(rawText);
        const rawBuildings: VillageBuilding[] = data.buildings || [];
        const rawTroops: TroopBuilding[]      = data.troops    || [];

        if (persisted) {
          const destroyedSet = new Set(persisted.destroyedIds);

          const restoredBuildings = rawBuildings.map(b => ({
            ...b,
            destroyed: destroyedSet.has(b.id),
          }));

          const initialHp: Record<number, number> = {};
          const maxHp: Record<number, number>     = {};
          rawBuildings.forEach(b => {
            const hp = b.hp || 1000;
            maxHp[b.id]     = hp;
            initialHp[b.id] = destroyedSet.has(b.id)
              ? 0
              : (persisted.buildingHealth[b.id] ?? hp);
          });
          buildingHealthRef.current = initialHp;
          buildingMaxHpRef.current  = maxHp;

          const restoredTroops = rawTroops.map(t => ({
            ...t,
            quantity: persisted.troopQuantities[t.name] ?? t.quantity,
          }));

          setPlayerData({
            ...data,
            troops:    restoredTroops,
            buildings: restoredBuildings,
          });
          setStartTime(persisted.startTime);

          if (persisted.deployedTroops && persisted.deployedTroops.length > 0) {
            setDeployedTroops({ troops: persisted.deployedTroops });
            deployedTroopsRef.current = persisted.deployedTroops;
          }

          persistStateRef.current = {
            opponentId,
            startTime:       persisted.startTime,
            destroyedIds:    persisted.destroyedIds,
            troopQuantities: persisted.troopQuantities,
          };
        } else {
          const st = Date.now();

          setPlayerData({
            ...data,
            troops:    rawTroops,
            buildings: rawBuildings.map(b => ({ ...b, destroyed: false })),
          });
          setStartTime(st);

          const troopQuantities: Record<string, number> = {};
          rawTroops.forEach(t => { troopQuantities[t.name] = t.quantity; });

          persistStateRef.current = {
            opponentId,
            startTime:       st,
            destroyedIds:    [],
            troopQuantities,
          };

          savePersistedBattle({
            opponentId,
            startTime:      st,
            destroyedIds:   [],
            buildingHealth: {},
            troopQuantities,
            deployedTroops: [],
          });
        }

        const defRes = await fetch(`${API_BASE}/battle/getdefense`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ opponent: opponentId }),
          cache: "no-store",
        });
        if (defRes.ok) {
          const defText = await defRes.text();
          setDefBuildings(defText ? (JSON.parse(defText).defences || []) : []);
        } else {
          setDefBuildings([]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown JSON parsing error";
        console.error("Fetch Error:", err);
        setFetchError(msg);
      }
    }

    fetchOpponentBase();
  }, [opponentId, router]);

  useEffect(() => {
    if (!playerData || Object.keys(buildingHealthRef.current).length > 0) return;
    const initialHp: Record<number, number> = {};
    const maxHp:     Record<number, number> = {};
    playerData.buildings.forEach(b => {
      const hp = b.hp || 1000;
      initialHp[b.id] = hp;
      maxHp[b.id]     = hp;
    });
    buildingHealthRef.current = initialHp;
    buildingMaxHpRef.current  = maxHp;
  }, [playerData]);

  useEffect(() => {
    if (!playerData || !startTime || endBattle) return;
    const iv = setInterval(() => {
      const now         = Date.now();
      const remainingMs = BATTLE_DURATION_MS - (now - startTime);
      if (remainingMs <= 0) {
        setTimerDisplay("00:00");
        setDeployedTroops(null);
        setEndBattle(true);
        clearInterval(iv);
        return;
      }
      const totalSecs = Math.ceil(remainingMs / 1000);
      const m = Math.floor(totalSecs / 60);
      const s = totalSecs % 60;
      setTimerDisplay(`${m}:${s.toString().padStart(2, "0")}`);
    }, 100);
    return () => clearInterval(iv);
  }, [playerData, startTime, endBattle]);

  useEffect(() => {
    if (!startTime || endBattle) return;
    const iv = setInterval(() => { saveBattleState(); }, 2000);
    return () => clearInterval(iv);
  }, [startTime, endBattle, saveBattleState]);

  const deployTroops = (gridX: number, gridY: number) => {
    if (!selectedTroop) return;
    const troopData = playerData?.troops.find(t => t.name === selectedTroop);
    if (!troopData || troopData.quantity <= 0) return;

    setPlayerData(prev => {
      if (!prev) return prev;
      const updated = prev.troops.map(t =>
        t.name === selectedTroop ? { ...t, quantity: t.quantity - 1 } : t
      );
      if (persistStateRef.current) {
        const newQtys = { ...persistStateRef.current.troopQuantities };
        const troop   = updated.find(t => t.name === selectedTroop);
        if (troop) newQtys[selectedTroop] = troop.quantity;
        persistStateRef.current.troopQuantities = newQtys;
      }
      return { ...prev, troops: updated };
    });

    setDeployedTroops(prev => {
      const stats = playerData!.troops.find(t => t.name === selectedTroop)!;
      const newTroop: DeployedTroop = {
        id:        Date.now() + Math.random(),
        troopName: selectedTroop,
        gridX,
        gridY,
        speed:     (stats.speed / 250) || 0.05,
        damage:    stats.damage  || 2,
        range:     stats.range   || 2,
        hp:        stats.hp      || 100,
        maxHp:     stats.hp      || 100,
      };
      
      const updatedTroopsArray = prev ? [...prev.troops, newTroop] : [newTroop];
      deployedTroopsRef.current = updatedTroopsArray;
      
      return { troops: updatedTroopsArray };
    });
  };

  const destroyBuilding = useCallback((buildingId: number) => {
    setBuildingDestroyed(prev => prev + 1);
    setPlayerData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        buildings: prev.buildings.map(b =>
          b.id === buildingId ? { ...b, destroyed: true } : b
        ),
      };
    });

    if (persistStateRef.current) {
      if (!persistStateRef.current.destroyedIds.includes(buildingId)) {
        persistStateRef.current.destroyedIds = [
          ...persistStateRef.current.destroyedIds,
          buildingId,
        ];
      }
      savePersistedBattle({
        ...persistStateRef.current,
        buildingHealth: { ...buildingHealthRef.current },
        deployedTroops: deployedTroopsRef.current,
      });
    }
  }, []);

  const concludeBattle = async () => {
    if (isReturning) return;
    setIsReturning(true);
    clearPersistedBattle();

    const token = localStorage.getItem("JWTtoken");
    if (!token || !opponentId) {
      router.replace("/village");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/battle/conclusion`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          defender:   opponentId,
          percentage: destructionRef.current,
          gold:       goldGainedRef.current,
          elixir:     elixirGainedRef.current,
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        console.error(`Server returned status ${res.status} for conclusion`);
      }
    } catch (err: unknown) {
      console.error("Conclusion Fetch Error:", err instanceof Error ? err.message : err);
    }

    router.refresh();
    router.replace("/village");
  };

  useEffect(() => {
    if (!playerData) return;
    const total     = playerData.buildings.length;
    const destroyed = playerData.buildings.filter(b => b.destroyed).length;
    const pct = total > 0 ? Math.floor((destroyed / total) * 100) : 0;

    const totalGold   = playerData.buildings.filter(b => b.name === "GoldStor"   || b.name === "GoldStorage").length;
    const destGold    = playerData.buildings.filter(b => b.destroyed && (b.name === "GoldStor"   || b.name === "GoldStorage")).length;
    const totalElixir = playerData.buildings.filter(b => b.name === "ElixirStor" || b.name === "ElixirStorage").length;
    const destElixir  = playerData.buildings.filter(b => b.destroyed && (b.name === "ElixirStor" || b.name === "ElixirStorage")).length;

    destructionRef.current  = pct;
    goldGainedRef.current   = totalGold   > 0 ? Math.floor(playerData.gold   * (destGold   / totalGold)   * 0.20) : 0;
    elixirGainedRef.current = totalElixir > 0 ? Math.floor(playerData.elixir * (destElixir / totalElixir) * 0.20) : 0;
  }, [playerData]);

  const TILE = 50;
  const gridCentre = (gridX: number, gridY: number) => ({
    x: (gridX - 1) * TILE + TILE * 1.5,
    y: (gridY - 1) * TILE + TILE * 1.5,
  });
  const troopPixel = (gridX: number, gridY: number) => ({
    x: (gridX - 1.5) * TILE + TILE * 0.5,
    y: (gridY - 1.5) * TILE + TILE * 0.5,
  });

  useEffect(() => {
    const iv = setInterval(() => {
      projectilesRef.current = projectilesRef.current
        .map(p => ({ ...p, progress: p.progress + 0.12 }))
        .filter(p => p.progress < 1);
    }, 50);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!playerData || !playerData.buildings || !defenseBuildings) return;

    const battleTick = setInterval(() => {
      setDeployedTroops(prev => {
        if (!prev || prev.troops.length === 0) return prev;

        let currentTroops = [...prev.troops];
        const now = Date.now();

        defenseBuildings.forEach(def => {
          if ((buildingHealthRef.current[def.id] ?? 0) <= 0) return;

          let closestIdx = -1;
          let minDist    = Infinity;

          currentTroops.forEach((t, idx) => {
            if (t.hp <= 0) return;
            const dx   = (def.grid_x + 1.5) - t.gridX;
            const dy   = (def.grid_y + 1.5) - t.gridY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= def.range && dist < minDist) {
              minDist    = dist;
              closestIdx = idx;
            }
          });

          if (closestIdx !== -1) {
            const lastAtk = defenseCooldownRef.current[def.id] || 0;
            if (now - lastAtk >= def.attackspeed) {
              currentTroops[closestIdx] = {
                ...currentTroops[closestIdx],
                hp: currentTroops[closestIdx].hp - def.damage,
              };
              defenseCooldownRef.current[def.id] = now;

              const origin  = gridCentre(def.grid_x, def.grid_y);
              const target  = troopPixel(currentTroops[closestIdx].gridX, currentTroops[closestIdx].gridY);
              const defName = def.name ?? "";
              const projType: Projectile["type"] =
                defName.includes("Archer") || defName.includes("ATower") ||
                defName.includes("Wizard") || defName.includes("WTower")
                  ? "arrow" : "cannon";

              projectilesRef.current = [
                ...projectilesRef.current,
                { id: ++projIdRef.current, startX: origin.x, startY: origin.y, targetX: target.x, targetY: target.y, progress: 0, type: projType },
              ];
            }
          }
        });

        currentTroops = currentTroops.filter(t => t.hp > 0);
        if (currentTroops.length === 0) {
          deployedTroopsRef.current = [];
          const remainingUndeployed = playerData.troops.reduce((sum, t) => sum + t.quantity, 0);
          if (remainingUndeployed === 0 && startTime !== null) {
            setTimeout(() => setEndBattle(true), 0);
          }
          return { troops: [] };
        }

        const updatedTroops = currentTroops.map(troop => {
          let closestBuilding: VillageBuilding | null = null;
          let minDistance = Infinity;

          playerData.buildings.forEach(building => {
            if (building.destroyed) return;
            const dx   = building.grid_x - troop.gridX;
            const dy   = building.grid_y - troop.gridY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistance) { minDistance = dist; closestBuilding = building; }
          });

          if (!closestBuilding) {
            setDeployedTroops(null);
            setTimeout(() => setEndBattle(true), 0); 
            return troop;
          }

          const targetB = closestBuilding as VillageBuilding;
          const dx   = targetB.grid_x + 1.5 - troop.gridX;
          const dy   = targetB.grid_y + 1.5 - troop.gridY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= troop.range) {
            if (now - (troop.lastAttackTime || 0) >= 1000) {
              buildingHealthRef.current[targetB.id] -= troop.damage;
              if (buildingHealthRef.current[targetB.id] <= 0) {
                destroyBuilding(targetB.id);
              }

              if (troop.range > 1.5) {
                const troopCenter = troopPixel(troop.gridX, troop.gridY);
                const bldCenter   = gridCentre(targetB.grid_x, targetB.grid_y);
                projectilesRef.current = [
                  ...projectilesRef.current,
                  { id: ++projIdRef.current, startX: troopCenter.x, startY: troopCenter.y, targetX: bldCenter.x, targetY: bldCenter.y, progress: 0, type: "arrow" },
                ];
              }

              return { ...troop, lastAttackTime: now };
            }
            return troop;
          }

          return {
            ...troop,
            gridX: troop.gridX + (dx / dist) * troop.speed,
            gridY: troop.gridY + (dy / dist) * troop.speed,
          };
        });

        deployedTroopsRef.current = updatedTroops;
        
        return { troops: updatedTroops };
      });
    }, 50);

    return () => clearInterval(battleTick);
  }, [playerData, defenseBuildings, destroyBuilding]);

  if (!opponentId) {
    return (
      <p className="text-white flex h-screen items-center justify-center">
        Error: No opponent selected!
      </p>
    );
  }
  if (fetchError) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0d1117] gap-4">
        <p className="text-red-500 font-mono text-lg animate-pulse">Connection Error</p>
        <p className="text-white font-mono text-sm max-w-lg text-center bg-black/50 p-4 rounded-xl border border-red-500/30">{fetchError}</p>
        <button onClick={() => router.back()} className="mt-4 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/50 px-6 py-2 rounded-xl transition-all">
          Go Back
        </button>
      </div>
    );
  }
  if (!playerData) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0d1117] gap-4">
        <p className="text-white font-mono animate-pulse">Scouting enemy base...</p>
      </div>
    );
  }

  const totalBuildings        = playerData.buildings.length;
  const destroyedBuildings    = playerData.buildings.filter(b => b.destroyed).length;
  const destructionPercentage = totalBuildings > 0 ? Math.floor((destroyedBuildings / totalBuildings) * 100) : 0;
  const totalGoldStorages     = playerData.buildings.filter(b => b.name === "GoldStor"   || b.name === "GoldStorage").length;
  const destroyedGoldStorages = playerData.buildings.filter(b => b.destroyed && (b.name === "GoldStor"   || b.name === "GoldStorage")).length;
  const totalElixirStorages     = playerData.buildings.filter(b => b.name === "ElixirStor" || b.name === "ElixirStorage").length;
  const destroyedElixirStorages = playerData.buildings.filter(b => b.destroyed && (b.name === "ElixirStor" || b.name === "ElixirStorage")).length;
  const goldGained   = totalGoldStorages   > 0 ? Math.floor(playerData.gold   * (destroyedGoldStorages   / totalGoldStorages)   * 0.20) : 0;
  const elixirGained = totalElixirStorages > 0 ? Math.floor(playerData.elixir * (destroyedElixirStorages / totalElixirStorages) * 0.20) : 0;

  const isVictory       = destructionPercentage >= 50;
  const modalBorder     = isVictory ? "border-green-600"    : "border-red-600";
  const modalGlow       = isVictory ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.3)";
  const modalTitleColor = isVictory ? "text-green-500"      : "text-red-500";
  const modalTitle      = isVictory ? "Victory!"            : "Defeat";
  const btnFrom         = isVictory ? "from-green-500"      : "from-red-500";
  const btnTo           = isVictory ? "to-green-700"        : "to-red-700";
  const btnHoverFrom    = isVictory ? "hover:from-green-700": "hover:from-red-700";
  const btnHoverTo      = isVictory ? "hover:to-green-900"  : "hover:to-red-900";
  const btnShadow       = isVictory
    ? "shadow-[0_6px_0_rgb(5,94,11)] hover:shadow-[0_6px_0_rgb(5,115,11)] active:shadow-none"
    : "shadow-[0_6px_0_rgb(127,0,0)] hover:shadow-[0_6px_0_rgb(150,0,0)] active:shadow-none";

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-green-900">

      <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-md border border-red-500/30 rounded-xl px-4 py-2">
        <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Attacking</p>
        <h1 className="text-white font-bold text-lg">{playerData.name}</h1>
      </div>

      <div className="absolute top-4 right-4 z-10 bg-black/70 backdrop-blur-md border border-red-500/30 rounded-xl px-4 py-2">
        <button onClick={() => { setDeployedTroops(null); setEndBattle(true); }} className="text-red-400 hover:text-white transition-colors">
          EXIT <X size={35} />
        </button>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/80 backdrop-blur-md border border-white/20 rounded-xl px-6 py-2 shadow-lg flex flex-col items-center">
        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-0.5">Time Remaining</p>
        <h2 className={`font-mono font-bold text-2xl tracking-wider ${timerDisplay.startsWith("00:") ? "text-red-500 animate-pulse" : "text-white"}`}>
          {timerDisplay}
        </h2>
      </div>

      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-10 bg-black/70 backdrop-blur-md border border-red-500/30 rounded-xl px-4 py-2">
        <div className="grid grid-row-5 gap-3 p-4">
          {playerData.troops.map(troop => (
            <div
              key={troop.troop_id}
              onClick={() => setSelectedTroop(troop.name)}
              className={[
                "flex flex-row items-center gap-1.5 p-2 rounded-xl border transition-colors cursor-pointer",
                troop.quantity <= 0
                  ? "border-white/5 opacity-40"
                  : troop.name === selectedTroop
                  ? "border-purple-800 bg-purple-900"
                  : "border-purple-500/50 bg-purple-900/20",
              ].join(" ")}
            >
              <TroopSprite name={troop.name} />
              <span className="text-white text-[10px] font-semibold text-center leading-tight">{troop.name}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Lv {troop.level}</span>
              <span className="text-white/40 text-[9px]">x{troop.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-6 py-2 flex items-center gap-3">
        <span className="text-white/50 text-xs font-bold uppercase tracking-widest">Destruction</span>
        <div className="w-40 h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${destructionPercentage >= 50 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${destructionPercentage}%` }} />
        </div>
        <span className={`font-bold text-sm ${destructionPercentage >= 50 ? "text-green-400" : "text-red-400"}`}>{destructionPercentage}%</span>
      </div>

      <div className="absolute bottom-4 right-4 z-10 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-6 py-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold tracking-widest text-yellow-500 uppercase">
            Available Gold: {totalGoldStorages === 0 ? 0 : (0.2 * playerData.gold).toLocaleString()}
          </span>
          <span className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">
            Available Elixir: {totalElixirStorages === 0 ? 0 : (0.2 * playerData.elixir).toLocaleString()}
          </span>
        </div>
      </div>

      <AttackWrapper
        buildings={playerData.buildings}
        deployedTroops={deployedTroops?.troops || []}
        onDeployTroop={deployTroops}
        buildingHealthRef={buildingHealthRef}
        buildingMaxHpRef={buildingMaxHpRef}
        projectilesRef={projectilesRef}
      />

      {endBattle && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
          <div
            className={`bg-gray-900 border-2 ${modalBorder} rounded-3xl p-8 max-w-sm w-full flex flex-col items-center gap-6`}
            style={{ boxShadow: `0 0 50px ${modalGlow}` }}
          >
            <h2 className={`text-4xl font-black text-transparent bg-clip-text ${modalTitleColor} tracking-widest uppercase filter drop-shadow-lg`}>
              {modalTitle}
            </h2>

            <div className="flex gap-1 text-3xl">
              {["⭐","⭐","⭐"].map((star, i) => {
                const thresholds = [50, 75, 100];
                return (
                  <span key={i} className={`transition-opacity ${destructionPercentage >= thresholds[i] ? "opacity-100" : "opacity-20"}`}>
                    {star}
                  </span>
                );
              })}
            </div>

            <div className="w-full bg-black/60 rounded-xl p-5 flex flex-col gap-4 border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-bold text-sm uppercase tracking-wider">Destruction</span>
                <span className={`text-3xl font-black ${isVictory ? "text-green-400" : "text-red-400"}`}>{destructionPercentage}%</span>
              </div>
              <div className="h-px w-full bg-white/10" />
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-yellow-500 font-bold text-sm uppercase tracking-wider">Gold Gained</span>
                    <span className="text-xs text-yellow-600/70">{destroyedGoldStorages} / {totalGoldStorages} Storages</span>
                  </div>
                  <span className="text-2xl font-black text-yellow-400">+{goldGained}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-purple-400 font-bold text-sm uppercase tracking-wider">Elixir Gained</span>
                    <span className="text-xs text-purple-500/70">{destroyedElixirStorages} / {totalElixirStorages} Storages</span>
                  </div>
                  <span className="text-2xl font-black text-purple-300">+{elixirGained}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => { concludeBattle(); }}
              className={`w-full bg-linear-to-b ${btnFrom} ${btnTo} ${btnHoverFrom} ${btnHoverTo} text-white font-black text-lg py-4 rounded-xl uppercase tracking-widest ${btnShadow} active:translate-y-1.5 transition-all`}
            >
              Return Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}