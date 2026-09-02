"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  MapPin,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  X,
  Droplets,
  ShieldAlert,
  Activity,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";
import { acknowledgeAlert, resolveAlert } from "../actions";

export type PlottedLocation = {
  id: string;
  name: string;
  district: string;
  type: string;
  latitude: number;
  longitude: number;
  population: number;
  households: number;
  vulnerabilityIndex: number;
  baselineDailyCases: number;
  score: number;
  level: string;
  warningLevel: string;
  priority: string;
  confidence: number;
  dominantSyndrome: string | null;
  reasoning: string;
  factors: Record<string, number>;
  reasons?: string[];
  recommendedAction?: string[];
  rainfall72h?: number;
  reportsCount24h?: number;
  waterSources: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    waterRisk?: number;
    warningLevel?: string;
    turbidityNTU?: number | null;
    freeChlorine?: number | null;
    ecoliDetected?: boolean | null;
    inspectionScore?: number | null;
    reasons?: string[];
  }>;
  alerts: Array<{
    id: string;
    title: string;
    message: string;
    level: string;
    priority: string;
    warningLevel: string;
    status: string;
    recommendedAction: string;
    triggeredAt: string | Date;
  }>;
};

interface InteractiveRiskMapProps {
  locations: PlottedLocation[];
  onSelectLocationForSimulator?: (locationId: string) => void;
}

const FACTOR_LABELS = [
  ["diseaseSignal", "Syndrome match"],
  ["anomaly", "Anomaly vs baseline"],
  ["growth", "24h growth"],
  ["water", "Water quality"],
  ["environmental", "Rainfall"],
  ["spatial", "Spatial cluster"],
  ["vulnerability", "Vulnerability"],
  ["exposure", "Population exposure"],
] as const;

const warningClass: Record<string, string> = {
  NORMAL: "warning-pill normal",
  WATCH: "warning-pill moderate",
  EARLY_WARNING: "warning-pill high",
  OUTBREAK: "warning-pill critical",
};

const priorityClass: Record<string, string> = {
  P0: "priority-pill p0",
  P1: "priority-pill p1",
  P2: "priority-pill p2",
  P3: "priority-pill p3",
};

const levelClass: Record<string, string> = {
  LOW: "level low",
  MODERATE: "level moderate",
  HIGH: "level high",
  CRITICAL: "level critical",
};

function getMapPosition(latitude: number, longitude: number) {
  const bounds = {
    north: 22.62,
    south: 22.45,
    west: 88.08,
    east: 88.44,
  };
  const x = ((longitude - bounds.west) / (bounds.east - bounds.west)) * 88 + 6;
  const y = ((bounds.north - latitude) / (bounds.north - bounds.south)) * 52 + 6;

  return {
    x: Math.min(94, Math.max(6, x)),
    y: Math.min(58, Math.max(6, y)),
  };
}

export function InteractiveRiskMap({ locations }: InteractiveRiskMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [warningFilter, setWarningFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"overview" | "water" | "alerts">("overview");

  // Map Pan & Zoom State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showLayers, setShowLayers] = useState({
    riverRoads: true,
    waterSources: true,
    riskHalos: true,
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Selected location object
  const selectedLocation = useMemo(
    () => locations.find((loc) => loc.id === selectedId) ?? null,
    [locations, selectedId]
  );


  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (warningFilter !== "ALL" && loc.warningLevel !== warningFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = loc.name.toLowerCase().includes(query);
        const matchesDistrict = loc.district.toLowerCase().includes(query);
        const matchesSyndrome = loc.dominantSyndrome?.toLowerCase().includes(query);
        if (!matchesName && !matchesDistrict && !matchesSyndrome) return false;
      }
      return true;
    });
  }, [locations, warningFilter, searchQuery]);

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(3.5, Number((prev + 0.35).toFixed(2))));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.85, Number((prev - 0.35).toFixed(2))));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Center map on a location
  const centerOnLocation = useCallback((location: PlottedLocation) => {
    const pos = getMapPosition(location.latitude, location.longitude);
    const container = mapContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const targetX = ((50 - pos.x) / 100) * rect.width * 0.8;
    const targetY = ((50 - pos.y) / 100) * rect.height * 0.8;
    setZoom(1.6);
    setPan({ x: targetX, y: targetY });
    setSelectedId(location.id);
  }, []);

  // Pan dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest(".map-marker-btn") || target.closest(".map-ctrl-btn") || target.closest(".popup-inspector")) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const target = e.target as HTMLElement;
      if (target.closest(".map-marker-btn") || target.closest(".popup-inspector")) return;
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setZoom((prev) => Math.max(0.85, Math.min(3.5, Number((prev + delta).toFixed(2)))));
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Quick action: jump to report form with location
  const handleJumpToReport = (locId: string) => {
    const select = document.querySelector('select[name="locationId"]') as HTMLSelectElement | null;
    if (select) {
      select.value = locId;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const intakeSection = document.getElementById("intake");
    if (intakeSection) {
      intakeSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="interactive-map-wrapper">
      {/* Top Map Action & Filter Bar */}
      <div className="map-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search ward, village, syndrome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="map-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="search-clear-btn"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="filter-chips" role="group" aria-label="Warning filters">
            <button
              type="button"
              className={`filter-chip ${warningFilter === "ALL" ? "active" : ""}`}
              onClick={() => setWarningFilter("ALL")}
            >
              All Zones ({locations.length})
            </button>
            <button
              type="button"
              className={`filter-chip outbreak ${warningFilter === "OUTBREAK" ? "active" : ""}`}
              onClick={() => setWarningFilter("OUTBREAK")}
            >
              Outbreak ({locations.filter((l) => l.warningLevel === "OUTBREAK").length})
            </button>
            <button
              type="button"
              className={`filter-chip early ${warningFilter === "EARLY_WARNING" ? "active" : ""}`}
              onClick={() => setWarningFilter("EARLY_WARNING")}
            >
              Early Warning ({locations.filter((l) => l.warningLevel === "EARLY_WARNING").length})
            </button>
            <button
              type="button"
              className={`filter-chip watch ${warningFilter === "WATCH" ? "active" : ""}`}
              onClick={() => setWarningFilter("WATCH")}
            >
              Watch ({locations.filter((l) => l.warningLevel === "WATCH").length})
            </button>
          </div>
        </div>

        <div className="toolbar-right">
          <div className="layer-toggles">
            <button
              type="button"
              className={`layer-toggle-btn ${showLayers.riskHalos ? "active" : ""}`}
              onClick={() => setShowLayers((s) => ({ ...s, riskHalos: !s.riskHalos }))}
              title="Toggle Risk Halo Zones"
            >
              <ShieldAlert size={14} />
              <span>Halos</span>
            </button>
            <button
              type="button"
              className={`layer-toggle-btn ${showLayers.waterSources ? "active" : ""}`}
              onClick={() => setShowLayers((s) => ({ ...s, waterSources: !s.waterSources }))}
              title="Toggle Water Source Points"
            >
              <Droplets size={14} />
              <span>Water</span>
            </button>
            <button
              type="button"
              className={`layer-toggle-btn ${showLayers.riverRoads ? "active" : ""}`}
              onClick={() => setShowLayers((s) => ({ ...s, riverRoads: !s.riverRoads }))}
              title="Toggle Geographic Roads & Rivers"
            >
              <Layers size={14} />
              <span>Geog</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Viewport */}
      <div
        className={`interactive-geo-viewport ${isDragging ? "dragging" : ""}`}
        ref={mapContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        tabIndex={0}
        aria-label="Interactive surveillance map: Click markers to inspect, drag to pan, scroll to zoom"
      >
        {/* Floating Zoom & Map Controls */}
        <div className="map-zoom-controls">
          <button
            type="button"
            className="map-ctrl-btn"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            className="map-ctrl-btn"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            className="map-ctrl-btn reset"
            onClick={handleResetView}
            title="Reset View"
            aria-label="Reset map pan and zoom"
          >
            <RotateCcw size={14} />
            <span className="ctrl-hint">{Math.round(zoom * 100)}%</span>
          </button>
        </div>

        {/* Map Canvas with Pan/Zoom Transform */}
        <div
          className="map-transform-canvas"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "50% 50%",
          }}
        >
          {/* Base SVG Geographic Layer */}
          <svg
            className="geo-base-interactive"
            viewBox="0 0 100 64"
            role="img"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="outbreakGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#6f1d1b" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#a53b32" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#a53b32" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="warningGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#c85d25" stopOpacity="0.38" />
                <stop offset="70%" stopColor="#b7791f" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#b7791f" stopOpacity="0" />
              </radialGradient>
              <pattern id="gridPattern" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(34, 124, 112, 0.06)" strokeWidth="0.5" />
              </pattern>
            </defs>

            {/* Grid overlay */}
            <rect width="100" height="64" fill="url(#gridPattern)" />

            {/* District outline */}
            {showLayers.riverRoads && (
              <path
                className="district-shape"
                d="M14 13 L46 7 L72 15 L91 36 L74 57 L39 55 L10 44 Z"
              />
            )}

            {/* River & Roads */}
            {showLayers.riverRoads && (
              <g className="roads-rivers-group">
                <path className="river" d="M4 42 C16 35 24 41 35 34 C47 26 54 32 64 23 C75 14 84 19 96 10" />
                <path className="road primary" d="M10 18 C26 18 34 24 47 25 C61 26 72 31 89 29" />
                <path className="road" d="M19 52 C31 45 42 44 56 40 C69 36 76 43 90 39" />
                <path className="road" d="M30 8 C37 20 43 29 52 39 C60 48 69 52 82 58" />
              </g>
            )}

            {/* Risk Halos / Radiation Circles */}
            {showLayers.riskHalos &&
              filteredLocations.map((location) => {
                const pos = getMapPosition(location.latitude, location.longitude);
                if (location.warningLevel === "OUTBREAK") {
                  return (
                    <circle
                      key={`halo-${location.id}`}
                      cx={pos.x}
                      cy={pos.y}
                      r={14}
                      fill="url(#outbreakGlow)"
                      className="radar-pulse-outbreak"
                    />
                  );
                }
                if (location.warningLevel === "EARLY_WARNING") {
                  return (
                    <circle
                      key={`halo-${location.id}`}
                      cx={pos.x}
                      cy={pos.y}
                      r={10}
                      fill="url(#warningGlow)"
                      className="radar-pulse-warning"
                    />
                  );
                }
                return null;
              })}

            {/* Selected Location Target Crosshairs */}
            {selectedLocation && (() => {
              const pos = getMapPosition(selectedLocation.latitude, selectedLocation.longitude);
              return (
                <g className="selected-target-ring" key={`target-${selectedLocation.id}`}>
                  <circle cx={pos.x} cy={pos.y} r={7} fill="none" stroke="var(--accent)" strokeWidth="1" strokeDasharray="1.5 1.5" />
                  <circle cx={pos.x} cy={pos.y} r={2} fill="var(--accent)" />
                </g>
              );
            })()}
          </svg>

          {/* Interactive Markers Layer */}
          <div className="interactive-markers-layer">
            {filteredLocations.map((location) => {
              const position = getMapPosition(location.latitude, location.longitude);
              const isSelected = selectedId === location.id;
              const isHovered = hoveredId === location.id;
              const hasAlerts = location.alerts && location.alerts.length > 0;

              return (
                <div
                  key={location.id}
                  className={`marker-anchor ${isSelected ? "selected" : ""} ${isHovered ? "hovered" : ""}`}
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    zIndex: isSelected ? 40 : isHovered ? 30 : 10 + Math.round(location.score / 5),
                  }}
                >
                  <button
                    type="button"
                    className={`map-marker-btn ${location.level.toLowerCase()} ring-${location.warningLevel.toLowerCase()} ${
                      isSelected ? "is-active" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedId === location.id) {
                        setSelectedId(null);
                      } else {
                        setSelectedId(location.id);
                        setActiveTab("overview");
                      }
                    }}
                    onMouseEnter={() => setHoveredId(location.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    aria-label={`${location.name}, ${location.warningLevel.replace("_", " ")}, risk score ${location.score} of 100`}
                    title={`Click to inspect ${location.name}`}
                  >
                    <span className="marker-score-badge">{location.score}</span>
                    <div className="marker-content">
                      <div className="marker-title-row">
                        <strong>{location.name}</strong>
                        {hasAlerts && (
                          <span className="marker-alert-dot" title={`${location.alerts.length} active alert`}>
                            !
                          </span>
                        )}
                      </div>
                      <small className="marker-sub">
                        {location.district} · {location.warningLevel.replace("_", " ")} · {location.priority}
                      </small>
                    </div>
                  </button>

                  {/* Micro Tooltip on Hover when not selected */}
                  {isHovered && !isSelected && (
                    <div className="marker-hover-card">
                      <div className="hover-topline">
                        <strong>{location.name}</strong>
                        <span className={warningClass[location.warningLevel]}>
                          {location.warningLevel.replace("_", " ")}
                        </span>
                      </div>
                      <p className="hover-reasoning">{location.reasoning.slice(0, 110)}...</p>
                      <div className="hover-footer">
                        <span>Confidence {location.confidence}%</span>
                        <span className="click-hint">Click to inspect →</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Informational Guidance Badge */}
        <div className="map-guidance-badge">
          <Info size={13} />
          <span>Drag to pan · Scroll to zoom · Click any marker to open interactive inspector</span>
        </div>
      </div>

      {/* Interactive Location Inspector Modal / Bottom Drawer */}
      {selectedLocation && (
        <aside
          className="popup-inspector"
          role="dialog"
          aria-label={`Inspection details for ${selectedLocation.name}`}
        >
          {/* Header */}
          <div className="inspector-header">
            <div className="header-meta">
              <div className="location-title-row">
                <MapPin size={18} className="text-accent" />
                <h3>{selectedLocation.name}</h3>
                <span className="type-badge">{selectedLocation.type}</span>
              </div>
              <p className="location-submeta">
                {selectedLocation.district} · Lat: {selectedLocation.latitude.toFixed(4)}, Lon: {selectedLocation.longitude.toFixed(4)} · Pop: {selectedLocation.population.toLocaleString()} · {selectedLocation.households.toLocaleString()} households
              </p>
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="inspector-focus-btn"
                onClick={() => centerOnLocation(selectedLocation)}
                title="Recenter view on this zone"
              >
                Focus
              </button>
              <button
                type="button"
                className="inspector-close-btn"
                onClick={() => setSelectedId(null)}
                aria-label="Close inspector"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="inspector-metrics-bar">
            <div className="metric-cell">
              <span className="cell-label">Risk Score</span>
              <div className="cell-val">
                <strong>{selectedLocation.score}</strong>
                <span className="cell-max">/100</span>
                <span className={levelClass[selectedLocation.level]}>
                  {selectedLocation.level.toLowerCase()}
                </span>
              </div>
            </div>
            <div className="metric-cell">
              <span className="cell-label">Warning Level</span>
              <span className={warningClass[selectedLocation.warningLevel]}>
                {selectedLocation.warningLevel.replace("_", " ")}
              </span>
            </div>
            <div className="metric-cell">
              <span className="cell-label">Alert Priority</span>
              <span className={priorityClass[selectedLocation.priority]}>
                {selectedLocation.priority}
              </span>
            </div>
            <div className="metric-cell">
              <span className="cell-label">Evidence Confidence</span>
              <strong className="cell-strong">{selectedLocation.confidence}%</strong>
            </div>
            {selectedLocation.rainfall72h !== undefined && (
              <div className="metric-cell">
                <span className="cell-label">Rainfall (72h)</span>
                <strong className="cell-strong">{Math.round(selectedLocation.rainfall72h)} mm</strong>
              </div>
            )}
          </div>

          {/* Inspector Navigation Tabs */}
          <div className="inspector-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "overview"}
              className={`inspector-tab ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              <Activity size={15} />
              Risk & Syndromes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "water"}
              className={`inspector-tab ${activeTab === "water" ? "active" : ""}`}
              onClick={() => setActiveTab("water")}
            >
              <Droplets size={15} />
              Water Quality ({selectedLocation.waterSources.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "alerts"}
              className={`inspector-tab ${activeTab === "alerts" ? "active" : ""}`}
              onClick={() => setActiveTab("alerts")}
            >
              <ShieldAlert size={15} />
              Active Alerts ({selectedLocation.alerts.length})
            </button>
          </div>

          {/* Tab Content 1: Overview */}
          {activeTab === "overview" && (
            <div className="inspector-body">
              <div className="inspector-card">
                <div className="syndrome-headline">
                  <span className="card-kicker">Clinical & Surveillance Match</span>
                  {selectedLocation.dominantSyndrome && selectedLocation.dominantSyndrome !== "none" ? (
                    <span className="feed-syndrome">
                      {selectedLocation.dominantSyndrome.replace(/_/g, " ")}
                    </span>
                  ) : (
                    <span className="muted-tag">No dominant syndrome</span>
                  )}
                </div>
                <p className="inspector-reasoning">{selectedLocation.reasoning}</p>

                {selectedLocation.recommendedAction && selectedLocation.recommendedAction.length > 0 && (
                  <div className="recommended-action-box">
                    <CheckCircle2 size={15} className="text-accent" />
                    <div>
                      <strong>Recommended Actions:</strong>
                      <p>{selectedLocation.recommendedAction.join(" · ")}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 8 Factor Breakdown Bars */}
              <div className="inspector-card">
                <span className="card-kicker">Explainable 8-Factor Weightings</span>
                <div className="factor-grid-2col">
                  {FACTOR_LABELS.map(([key, label]) => {
                    const factorVal = selectedLocation.factors[key] ?? 0;
                    const pct = Math.round(Number(factorVal) * 100);
                    return (
                      <div className="factor-bar-item" key={key}>
                        <div className="factor-bar-header">
                          <span>{label}</span>
                          <strong>{pct}%</strong>
                        </div>
                        <div className="factor-progress-track">
                          <div
                            className="factor-progress-fill"
                            style={{
                              width: `${Math.min(100, pct)}%`,
                              backgroundColor:
                                pct > 65
                                  ? "var(--danger)"
                                  : pct > 35
                                  ? "var(--warn)"
                                  : "var(--accent)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Water Sources */}
          {activeTab === "water" && (
            <div className="inspector-body">
              {selectedLocation.waterSources.length === 0 ? (
                <div className="empty-state">No monitored water sources registered for this location.</div>
              ) : (
                <div className="water-sources-list">
                  {selectedLocation.waterSources.map((source) => (
                    <div className="water-source-card" key={source.id}>
                      <div className="source-topline">
                        <div className="source-identity">
                          <Droplets size={16} className="text-accent" />
                          <strong>{source.name}</strong>
                          <span className="source-type-tag">{source.type.toLowerCase().replace("_", " ")}</span>
                        </div>
                        <span className={`source-status-tag ${source.status.toLowerCase()}`}>
                          {source.status}
                        </span>
                      </div>

                      <div className="source-readings">
                        <div className="reading-item">
                          <span>Turbidity</span>
                          <strong>{source.turbidityNTU != null ? `${source.turbidityNTU} NTU` : "N/A"}</strong>
                        </div>
                        <div className="reading-item">
                          <span>Free Chlorine</span>
                          <strong>{source.freeChlorine != null ? `${source.freeChlorine} mg/L` : "N/A"}</strong>
                        </div>
                        <div className="reading-item">
                          <span>E. Coli Test</span>
                          <strong className={source.ecoliDetected ? "text-danger" : "text-good"}>
                            {source.ecoliDetected == null ? "Not tested" : source.ecoliDetected ? "POSITIVE" : "Negative"}
                          </strong>
                        </div>
                        <div className="reading-item">
                          <span>Sanitary Score</span>
                          <strong>{source.inspectionScore != null ? `${source.inspectionScore}/100` : "N/A"}</strong>
                        </div>
                      </div>

                      {source.reasons && source.reasons.length > 0 && (
                        <p className="source-reason-note">⚠ {source.reasons[0]}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content 3: Active Alerts & Direct Actions */}
          {activeTab === "alerts" && (
            <div className="inspector-body">
              {selectedLocation.alerts.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle2 size={24} className="text-good" />
                  <p>No open or acknowledged alerts for {selectedLocation.name}. Surveillance is running normally.</p>
                </div>
              ) : (
                <div className="inspector-alerts-list">
                  {selectedLocation.alerts.map((alert) => (
                    <div className="inspector-alert-card" key={alert.id}>
                      <div className="alert-topline">
                        <div className="pill-row">
                          <span className={priorityClass[alert.priority]}>{alert.priority}</span>
                          <span className={warningClass[alert.warningLevel]}>
                            {alert.warningLevel.replace("_", " ")}
                          </span>
                          <span className={levelClass[alert.level]}>{alert.level.toLowerCase()}</span>
                        </div>
                        <span className="alert-status-badge">{alert.status}</span>
                      </div>
                      <h4>{alert.title}</h4>
                      <p className="alert-desc">{alert.message}</p>
                      <div className="alert-action-rec">
                        <strong>Action:</strong> {alert.recommendedAction}
                      </div>

                      <div className="alert-cta-row">
                        <form action={alert.status === "OPEN" ? acknowledgeAlert : resolveAlert}>
                          <input type="hidden" name="alertId" value={alert.id} />
                          <button type="submit" className="mini-button">
                            {alert.status === "OPEN" ? "Acknowledge Alert" : "Resolve Alert"}
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Bottom Action Bar */}
          <div className="inspector-footer">
            <button
              type="button"
              className="footer-action-btn primary"
              onClick={() => handleJumpToReport(selectedLocation.id)}
            >
              <Activity size={15} />
              Report Case for this Zone
            </button>
            <a
              href="#what-if"
              className="footer-action-btn secondary"
              onClick={() => {
                const whatIf = document.querySelector(".control-panel");
                if (whatIf) whatIf.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Sparkles size={15} />
              Simulate in What-If
            </a>
          </div>
        </aside>
      )}
    </div>
  );
}
