import type { IntelligenceFeature } from "@/types/intelligence";
import type { MapCamera } from "@/utils/map-view";

export interface IntelligenceMapProps {
  timelineVisible?: boolean;
  features: IntelligenceFeature[];
  selectedFeatureId?: string;
  onSelectFeature: (feature: IntelligenceFeature) => void;
  compact?: boolean;
  showLabels?: boolean;
  initialCamera?: MapCamera;
  onCameraChange?: (camera: MapCamera) => void;
  focusFeature?: IntelligenceFeature;
}
