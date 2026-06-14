// app/village/page.tsx
"use client";
import { useEffect, useState } from "react";
import MapWrapper from "../../components/MapWrapper";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

interface ResourceBarProps {
  type: "Gold" | "Elixir";
  amount: number;
  max: number;
  onCollect: (type: "Gold" | "Elixir") => void;
}

function ResourceBar({ type, amount, max, onCollect }: ResourceBarProps) {
  const percentage = Math.min((amount * 100) / max, 100);
  const isGold = type === "Gold";
  const barColor = isGold ? "bg-yellow-600" : "bg-purple-500";
  const textColor = isGold ? "text-yellow-400" : "text-purple-400";

  return (
    <div className="flex flex-col items-end gap-1 mb-3 pointer-events-auto">
      <div className="flex flex-row items-center gap-2">
        <button onClick={() => onCollect(type)}>
          <span
            className={`text-[16px] font-bold tracking-widest uppercase ${textColor}`}
          >
            {type}
          </span>
        </button>
        <div className="relative w-70 h-7 bg-slate-900 border-2 border-slate-700 rounded-full overflow-hidden shadow-lg">
          <div
            className={`absolute right-0 top-0 h-full ${barColor} transition-all duration-500 ease-out`}
            style={{ width: `${percentage}%` }} // React inline style connects your math to the DOM!
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[13px] font-bold text-white tracking-widest drop-shadow-md">
              {amount.toLocaleString()} / {max.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VillageSync {
  id: number;
  building_id: number;
  name: string;
  level: number;
  grid_x: number; 
  grid_y: number;
  is_built: boolean;
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

export default function VillageScreen() {
  const [playerData, setPlayerData] = useState<GameDataSyncResponse | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  // 2. The Auto-Fetch Logic
  useEffect(() => {
    async function syncVillage() {
      try {
        // Grab the token saved during the /login flow
        const token = localStorage.getItem("JWTtoken");

        // If they have no token, kick them back to the login screen
        if (!token) {
          window.location.href = "/login";
          return;
        }

        // Call your Go Server
        const res = await fetch(`${API_BASE}/village/sync`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Passes the VerifyJWT bouncer
          },
        });

        if (!res.ok) {
          throw new Error(`Sync failed with status: ${res.status}`);
        }

        // Parse the JSON sent by Go and update the React State
        const data = await res.json();
        setPlayerData(data);
      } catch (error) {
        console.error("Failed to sync village:", error);
      } finally {
        // Remove the loading screen whether the fetch succeeded or failed
        setIsSyncing(false);
      }
    }
    // Trigger the function
    syncVillage();
  }, []); // <-- The empty array means "Run this exactly ONCE when the component mounts"


  async function collectResource(type: "Gold" | "Elixir") {
      try {
        const token = localStorage.getItem("JWTtoken");
        if (!token) {
          window.location.href = "/login";
          return;
        }
        const res = await fetch(
          `${API_BASE}/village/collect/${type.toLowerCase()}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`, // Passes the VerifyJWT bouncer
            },
          },
        );

        if (!res.ok) {
          throw new Error(
            `collecting resource failed with status: ${res.status}`,
          );
        }

        const data = await res.json();
        setPlayerData((prev) => {
          if (!prev) return prev;

          // Let's manually patch the state so we don't have to reload the whole page
          // You'll need to adapt this slightly depending on EXACTLY what JSON your Go server returns!
          const updatedStats = { ...prev.stats };
          if (type === "Gold") updatedStats.gold += data.change; // Hardcoded fallback just for visual testing
          if (type === "Elixir") updatedStats.elixir += data.change;

          return { ...prev, stats: updatedStats };
        });
      } catch (error) {
        console.error("Failed to collect resource:", error);
      }
    }
  // 3. The Loading Screen
  // Prevents the game board from drawing before we know what buildings exist
  if (isSyncing || !playerData) {
    return (
      <main className="h-screen w-screen bg-stone-900 flex items-center justify-center">
        <p className="text-white font-mono animate-pulse">
          Syncing with Bastion Server...
        </p>
      </main>
    );
  }
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-green-800">
      {/* LAYER 1: The Game Engine/Grid (z-index 0) */}
      <div className="absolute inset-0 z-0">
        <MapWrapper buildings={playerData.buildings} />
      </div>

      {/* LAYER 2: The Fixed HUD (z-index 10) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Top Left: Player Info */}
        <div className="absolute top-4 left-4 pointer-events-auto">
          {/* <PlayerProfile username="Sujaan" level={12} /> */}
        </div>

        {/* Top Right: Resources */}
        <div className="absolute top-4 right-4 pointer-events-auto">
          <ResourceBar
            type="Gold"
            amount={playerData.stats.gold}
            max={playerData.stats.max_gold}
            onCollect={collectResource}
          />
          <ResourceBar
            type="Elixir"
            amount={playerData.stats.elixir}
            max={playerData.stats.max_elixir}
            onCollect={collectResource}
          />
        </div>

        {/* Bottom Left: Action Buttons */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-auto">
          <button className="bg-amber-400 h-10 w-40">Train Troops</button>
          <button className="bg-amber-400 size-30">BATTLE</button>
        </div>
        {/* Bottom Left: Action Buttons */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-auto">
          <button className="bg-amber-200 size-30">Build</button>
        </div>
      </div>
    </main>
  );
}
