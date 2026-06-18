"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AttackWrapper } from "@/components/MapWrapper"; 
import { VillageSync } from "@/components/VillageMap";
import { authHeaders, TroopsSync, TroopSprite } from "../village/page";
import { X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

interface GameDataSyncResponse {
  gold: number;
  elixir: number;
  name: string;
  buildings: VillageSync[];
  troops: TroopsSync[];
}

export interface DeployedTroop{
    id : number;
    troopName : string;
    gridX : number;
    gridY : number;
}

export interface DeployedTroops{
    troops: DeployedTroop[];
}

export default function BattlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const opponentId = searchParams.get("id");
  const [playerData, setPlayerData] = useState<GameDataSyncResponse | null>(null);
  const [selectedTroop, setSelectedTroop] = useState<string>("");
  const [deployedTroops, setDeployedTroops] = useState<DeployedTroops|null>(null);
  const [startTime, setStartTime] = useState<number|null>(null);
  const [endBattle, setEndBattle] = useState<boolean>(false);
  const BATTLE_DURATION_MS = 3 * 60 * 1000; 
  const [timerDisplay, setTimerDisplay] = useState<string>("03:00");

  useEffect(()=>{
    setStartTime(Date.now())
  }, [])

  useEffect(() => {
    async function fetchOpponentBase() {
      function getToken(): string | null {
        const t = localStorage.getItem("JWTtoken");
        if (!t) {
          window.location.href = "/login";
          return null;
        }
        return t;
      }
      
      const token = getToken();
      if (!token || !opponentId) return;

      try {
        const res = await fetch(`${API_BASE}/battle/getvillage`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            opponent: opponentId,
          }),
        });
        
        if (!res.ok) {
          router.back();
          return;
        }
        
        const data = await res.json();
        setPlayerData(data);
        
      } catch {
        router.back();
      }
    }

    fetchOpponentBase();
  }, [opponentId, router]);

useEffect(() => {
    if (!playerData || !startTime || endBattle) return;

    const iv = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remainingMs = BATTLE_DURATION_MS - elapsed;

      if (remainingMs <= 0) {
        setTimerDisplay("00:00");
        setEndBattle(true);
        clearInterval(iv);
        console.log("TIME IS UP! Battle Over.");
        return;
      }
      const totalSeconds = Math.ceil(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
      setTimerDisplay(formattedTime);

    }, 100);

    return () => clearInterval(iv);
  }, [playerData, startTime, endBattle]);

  const deployTroops = (gridX: number, gridY: number)=>{
    console.log(selectedTroop)
    if (!selectedTroop) return;
    const troopData = playerData?.troops.find(t => t.name === selectedTroop);
      if (!troopData || troopData.quantity <= 0) {
          console.log("No more of this troop left!");
          return; 
      }
    setPlayerData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        troops: prev.troops.map((t) => 
          t.name === selectedTroop ? { ...t, quantity: t.quantity - 1 } : t
        )
      };
    });
    setDeployedTroops((prev)=>{
      const newTroop : DeployedTroop = {
          id: Date.now(),
          troopName : selectedTroop,
          gridX: gridX,
          gridY: gridY,
      }
      if (!prev) {
          return { troops: [newTroop] };
      }
      return {...prev, troops:[...prev.troops, newTroop]}
    })
    console.log(deployedTroops)
  }


  if (!opponentId) {
    return <p className="text-white flex h-screen items-center justify-center">Error: No opponent selected!</p>;
  }

  if (!playerData) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0d1117] gap-4">
        <p className="text-white font-mono animate-pulse">Scouting enemy base...</p>
      </div>
    );
  }


  return (
    <div className="relative w-screen h-screen overflow-hidden bg-green-900">
      <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-md border border-red-500/30 rounded-xl px-4 py-2">
        <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Attacking</p>
        <h1 className="text-white font-bold text-lg">{playerData.name}</h1>
      </div>
      <div className="absolute top-4 right-4 z-10 bg-black/70 backdrop-blur-md border border-red-500/30 rounded-xl px-4 py-2">
        <button
            onClick={()=>{setEndBattle(true)}}
            className="text-red-400 hover:text-white transition-colors"
          >
            EXIT
            <X size={35} />
        </button>
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/80 backdrop-blur-md border border-white/20 rounded-xl px-6 py-2 shadow-lg flex flex-col items-center">
        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-0.5">Time Remaining</p>
        <h2 className={`font-mono font-bold text-2xl tracking-wider ${
          timerDisplay.startsWith("00:") ? "text-red-500 animate-pulse" : "text-white"
        }`}>
          {timerDisplay}
        </h2>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-10 bg-black/70 backdrop-blur-md border border-red-500/30 rounded-xl px-4 py-2">
        <div className="grid grid-row-5 gap-3 p-4">
          {playerData.troops.map((troop) => {
            const qty = troop.quantity;
            const level = troop.level;

            return (
              <div
                key={troop.troop_id}
                className={[
                  "flex flex-row items-center gap-1.5 p-2 rounded-xl border transition-colors",
                  qty<=0
                    ? "border-white/5 opacity-40"
                    : qty > 0
                      ? troop.name == selectedTroop 
                        ? "border-purple-800 bg-purple-900"
                        : "border-purple-500/50 bg-purple-900/20"
                      : "border-white/10 bg-white/5",
                  
                ].join(" ")}
                onClick={()=>{setSelectedTroop(troop.name)}}
              >
                <TroopSprite name={troop.name} />
                <span className="text-white text-[10px] font-semibold text-center leading-tight">
                  {troop.name}
                </span>

                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Lv {level}
                </span>

                <span className="text-white/40 text-[9px]">
                  x{qty}
                </span>

                {/* {locked ? (
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
                )} */}
              </div>
            );
          })}
        </div>
      </div>
      <AttackWrapper
        buildings={playerData.buildings}
        deployedTroops={deployedTroops?.troops || []}
        onDeployTroop={deployTroops}
      />
      {endBattle? 
        <div
          className="absolute inset-0 z-50 flex items-end justify-center pb-4 bg-black/60 backdrop-blur-sm pointer-events-auto"
        >
          <div className="flex items-center gap-2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <button
              onClick={()=>{router.back()}}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Back to village
            </button>
          </div>
        </div>
          :1}
    </div>
  );
}