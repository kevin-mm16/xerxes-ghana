import type { IntelligenceFeature } from "@/types/intelligence";

export interface IntelligenceMapProps {
  timelineVisible?: boolean;
  features: IntelligenceFeature[];
  selectedFeatureId?: string;
  onSelectFeature: (feature: IntelligenceFeature) => void;
  compact?: boolean;
  showLabels?: boolean;
}
