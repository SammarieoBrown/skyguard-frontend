import dynamic from 'next/dynamic';

// Lazy load icons that aren't immediately visible
export const Shield = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Shield })), { ssr: false });
export const Zap = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Zap })), { ssr: false });
export const Globe = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Globe })), { ssr: false });
export const ChevronRight = dynamic(() => import('lucide-react').then(mod => ({ default: mod.ChevronRight })), { ssr: false });
export const AlertTriangle = dynamic(() => import('lucide-react').then(mod => ({ default: mod.AlertTriangle })), { ssr: false });
export const Database = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Database })), { ssr: false });
export const LineChart = dynamic(() => import('lucide-react').then(mod => ({ default: mod.LineChart })), { ssr: false });
export const TrendingUp = dynamic(() => import('lucide-react').then(mod => ({ default: mod.TrendingUp })), { ssr: false });
export const Target = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Target })), { ssr: false });
export const Activity = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Activity })), { ssr: false });
export const Lock = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Lock })), { ssr: false });
export const Smartphone = dynamic(() => import('lucide-react').then(mod => ({ default: mod.Smartphone })), { ssr: false });

// Keep critical icons that are visible on initial render
export { 
  ArrowRight,
  BarChart3,
  Star,
  Users,
  Brain,
  Play,
  CheckCircle,
  Sparkles,
  CloudLightning,
  MapPin,
  Layers
} from 'lucide-react';