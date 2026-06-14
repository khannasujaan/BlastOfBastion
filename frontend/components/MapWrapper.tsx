"use client";
import dynamic from 'next/dynamic';
import { VillageSync } from './VillageMap'; // Import the interface!

const PixiMap = dynamic(() => import('./VillageMap'), { 
  ssr: false,
  loading: () => <div className="flex h-screen w-screen items-center justify-center bg-stone-900 text-white font-mono animate-pulse">Loading Engine...</div>
});

// Define the props for the wrapper
interface MapWrapperProps {
  buildings: VillageSync[];
}

export default function MapWrapper({ buildings }: MapWrapperProps) {
  return <PixiMap buildings={buildings} />;
}