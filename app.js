// VenueFlow — Main Application Logic

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

// ─── State ────────────────────────────────────────────────────────────────────
let state = {
  venueId: "wankhede",
  phase: "q1",
  zones: [],
  alerts: [],
  chatHistory: [],
  simulateInterval: null,
  tickerInterval: null,
  phaseLabel: "1st Innings",
  currentRouteType: "",
};

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadVenue("wankhede");
  initAlerts();
  initTabs();
  initPhaseButtons();
  initVenueSelector();
  initRouteSelector();
  initChatbot();
  initSimulate();
  startTicker();
  startGameClock();
});

// ─── Venue Loading ────────────────────────────────────────────────────────────
function loadVenue(venueId) {
  state.venueId = venueId;
  const venue = VENUES[venueId];
  state.zones = venue.zones.map(z => ({ ...z }));
  applyPhaseModifiers(state.phase);
  renderMap();
  renderQueues();
}

function initVenueSelector() {
  document.getElementById("venueSelect").addEventListener("change", (e) => {
    loadVenue(e.target.value);
  });
}

function initRouteSelector() {
  const routeSelect = document.getElementById("routeSelect");
  if(routeSelect) {
    routeSelect.addEventListener("change", (e) => {
      state.currentRouteType = e.target.value;
      renderMap();
    });
  }
}

// ─── Phase System ─────────────────────────────────────────────────────────────
const PHASE_NAMES = {
  pregame: "Pre-Game",
  q1: "1st Innings",
  q2: "Drinks Break",
  half: "Lunch Break",
  q3: "2nd Innings",
  q4: "Final Overs",
  postgame: "Post-Match",
};

function initPhaseButtons() {
  document.querySelectorAll(".phase-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".phase-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.phase = btn.dataset.phase;
      state.phaseLabel = PHASE_NAMES[state.phase];
      applyPhaseModifiers(state.phase);
      renderMap();
      renderQueues();
      addAlert(generatePhaseAlert(state.phase));
    });
  });
}

function applyPhaseModifiers(phase) {
  const mods = PHASE_MODIFIERS[phase];
  const venue = VENUES[state.venueId];
  state.zones = venue.zones.map(z => {
    const base = z.density;
    const mod = mods[z.type] || 0.5;
    const jitter = (Math.random() - 0.5) * 15;
    const d = Math.min(99, Math.max(2, Math.round(base * mod + jitter)));
    return { ...z, density: z.type === "field" ? 0 : d };
  });
}

function generatePhaseAlert(phase) {
  const alerts = {
    pregame: { type: "blue", icon: "🔵", text: "Gates now open — use side gates to avoid main entrance crowds" },
    q1: { type: "green", icon: "🟢", text: "Match started! Food courts relatively quiet — good time to order" },
    q2: { type: "yellow", icon: "🟡", text: "Drinks break — food courts filling fast, order via app to skip queues" },
    half: { type: "red", icon: "🔴", text: "Lunch break! All food courts at high capacity — expect 10–15 min waits" },
    q3: { type: "green", icon: "🟢", text: "2nd innings underway — restrooms and food courts clearing up" },
    q4: { type: "yellow", icon: "🟡", text: "Final overs! Plan your exit — Gate D has shortest path to Parking B" },
    postgame: { type: "red", icon: "🔴", text: "Match over! All exits congested — wait 20 mins before leaving for faster exit" },
  };
  return alerts[phase] || alerts.q1;
}

// ─── Stadium Map ──────────────────────────────────────────────────────────────
function getDensityColor(d) {
  if (d === 0) return null;
  if (d < 40) return "green";
  if (d < 70) return "yellow";
  return "red";
}

function getWaitTime(zone) {
  if (zone.type === "field" || zone.type === "vip") return "N/A";
  const base = Math.round(zone.density / 10);
  if (base === 0) return "No wait";
  return `~${base} min`;
}

function getSuggestion(zone) {
  if (zone.density < 40) return "✅ Great time to visit";
  if (zone.density < 70) return "⚠️ Moderate — visit soon";
  return "🚫 Busy — try an alternative";
}

function renderMap() {
  const container = document.getElementById("stadiumMap");
  const venue = VENUES[state.venueId];
  container.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 110");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.overflow = "visible";

  // Background
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0"); bg.setAttribute("y", "0");
  bg.setAttribute("width", "100"); bg.setAttribute("height", "110");
  bg.setAttribute("fill", "transparent");
  svg.appendChild(bg);

  // Defs for filters & gradients
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0.5" stdDeviation="0.5" flood-color="#000" flood-opacity="0.4"/>
    </filter>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="0" stdDeviation="0.8" flood-color="#00aaff" flood-opacity="0.9"/>
    </filter>
    <linearGradient id="grad-green" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00ff88" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#00ff88" stop-opacity="0.1"/>
    </linearGradient>
    <linearGradient id="grad-yellow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffc800" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ffc800" stop-opacity="0.1"/>
    </linearGradient>
    <linearGradient id="grad-red" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff3c3c" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#ff3c3c" stop-opacity="0.15"/>
    </linearGradient>
    <radialGradient id="grad-field" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" stop-color="#195a28" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#0b2e13" stop-opacity="0.8"/>
    </radialGradient>
  `;
  svg.appendChild(defs);

  // Architectural background rings to look like a stadium blueprint
  [ {rx: 48, ry: 53, sw: 0.3, o: 0.08}, 
    {rx: 45, ry: 50, sw: 0.5, o: 0.12},
    {rx: 34, ry: 39, sw: 0.2, o: 0.05} 
  ].forEach(ring => {
    const ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    ellipse.setAttribute("cx", "50"); ellipse.setAttribute("cy", "50");
    ellipse.setAttribute("rx", ring.rx); ellipse.setAttribute("ry", ring.ry);
    ellipse.setAttribute("fill", "none");
    ellipse.setAttribute("stroke", `rgba(0,170,255,${ring.o})`);
    ellipse.setAttribute("stroke-width", ring.sw);
    ellipse.setAttribute("stroke-dasharray", "4, 2");
    svg.appendChild(ellipse);
  });

  // Render zones
  state.zones.forEach(zone => {
    if (zone.type === "parking") return; // skip parking in SVG
    const color = getDensityColor(zone.density);
    const colorMap = {
      green:  { fill: "url(#grad-green)", stroke: "#00ff88" },
      yellow: { fill: "url(#grad-yellow)",  stroke: "#ffc800" },
      red:    { fill: "url(#grad-red)",   stroke: "#ff3c3c" },
      null:   { fill: "url(#grad-green)",   stroke: "#00b84a" },
    };
    const theme = color ? colorMap[color] : colorMap.null;

    if (zone.type === "field") {
      // Draw oval for field
      const ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
      ellipse.setAttribute("cx", zone.x + zone.w / 2);
      ellipse.setAttribute("cy", zone.y + zone.h / 2);
      ellipse.setAttribute("rx", zone.w / 2);
      ellipse.setAttribute("ry", zone.h / 2);
      ellipse.setAttribute("fill", "url(#grad-field)");
      ellipse.setAttribute("stroke", "rgba(0,255,136,0.3)");
      ellipse.setAttribute("stroke-width", "0.6");
      ellipse.setAttribute("filter", "url(#shadow)");
      svg.appendChild(ellipse);

      // Pitch markings
      const pitchRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      pitchRect.setAttribute("x", zone.x + zone.w/2 - 2);
      pitchRect.setAttribute("y", zone.y + zone.h/2 - 7);
      pitchRect.setAttribute("width", "3.5");
      pitchRect.setAttribute("height", "11");
      pitchRect.setAttribute("fill", "rgba(255,255,255,0.8)");
      pitchRect.setAttribute("rx", "0.5");
      svg.appendChild(pitchRect);

      // Field label
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", zone.x + zone.w / 2);
      text.setAttribute("y", zone.y + zone.h / 2 + 1);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "rgba(255,255,255,0.6)");
      text.setAttribute("font-size", "3.5");
      text.setAttribute("font-weight", "600");
      text.setAttribute("font-family", "DM Sans");
      text.setAttribute("letter-spacing", "2");
      text.textContent = "FIELD";
      svg.appendChild(text);
      return;
    }

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", zone.x);
    rect.setAttribute("y", zone.y);
    rect.setAttribute("width", zone.w);
    rect.setAttribute("height", zone.h);
    rect.setAttribute("fill", theme.fill);
    rect.setAttribute("stroke", theme.stroke);
    rect.setAttribute("stroke-width", "0.5");
    rect.setAttribute("rx", "2.5");
    rect.setAttribute("filter", "url(#shadow)");
    rect.style.cursor = "pointer";
    rect.style.transition = "all 0.5s ease";

    // Pulse animation for high density
    if (zone.density >= 70) {
      rect.classList.add("pulse-zone");
    }

    rect.addEventListener("click", () => showTooltip(zone));
    svg.appendChild(rect);

    // Zone label
    if (zone.h > 5) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", zone.x + zone.w / 2);
      text.setAttribute("y", zone.y + zone.h / 2 + 1.2);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#ffffff");
      text.setAttribute("font-size", "2.4");
      text.setAttribute("font-weight", "600");
      text.setAttribute("font-family", "DM Sans");
      text.style.pointerEvents = "none";
      const shortLabel = zone.label.length > 14 ? zone.label.slice(0, 13) + "…" : zone.label;
      text.textContent = shortLabel;
      svg.appendChild(text);

      if (zone.density > 0) {
        const densText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        densText.setAttribute("x", zone.x + zone.w / 2);
        densText.setAttribute("y", zone.y + zone.h / 2 + 3.8);
        densText.setAttribute("text-anchor", "middle");
        densText.setAttribute("fill", theme.stroke);
        densText.setAttribute("font-size", "2.0");
        densText.setAttribute("font-family", "JetBrains Mono");
        densText.setAttribute("font-weight", "700");
        densText.style.pointerEvents = "none";
        densText.textContent = `${zone.density}%`;
        svg.appendChild(densText);
      }
    }

    // Type icon (small)
    const icons = { gate: "⛩", food: "🍽", restroom: "🚻", merch: "🛍", medical: "🏥", stand: "", vip: "⭐" };
    if (icons[zone.type] && zone.h > 6) {
      // Glow background for icon
      const iconBg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      iconBg.setAttribute("cx", zone.x + zone.w / 2);
      iconBg.setAttribute("cy", zone.y + 2.5);
      iconBg.setAttribute("r", "2.2");
      iconBg.setAttribute("fill", "rgba(0,0,0,0.5)");
      iconBg.style.pointerEvents = "none";
      svg.appendChild(iconBg);

      const iconText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      iconText.setAttribute("x", zone.x + zone.w / 2);
      iconText.setAttribute("y", zone.y + 3.3);
      iconText.setAttribute("text-anchor", "middle");
      iconText.setAttribute("font-size", "2.5");
      iconText.style.pointerEvents = "none";
      iconText.textContent = icons[zone.type];
      svg.appendChild(iconText);
    }
  });

  // Your seat marker
  const seat = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  seat.setAttribute("cx", "24");
  seat.setAttribute("cy", "36");
  seat.setAttribute("r", "2.5");
  seat.setAttribute("fill", "#00aaff");
  seat.setAttribute("filter", "url(#glow)");
  seat.setAttribute("stroke", "#fff");
  seat.setAttribute("stroke-width", "0.5");
  svg.appendChild(seat);

  const seatPulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  seatPulse.setAttribute("cx", "24");
  seatPulse.setAttribute("cy", "36");
  seatPulse.setAttribute("r", "2");
  seatPulse.setAttribute("fill", "none");
  seatPulse.setAttribute("stroke", "#00aaff");
  seatPulse.setAttribute("stroke-width", "0.5");
  seatPulse.setAttribute("class", "seat-pulse");
  svg.appendChild(seatPulse);

  if (state.currentRouteType) {
    drawRoute(svg);
  }

  container.appendChild(svg);
}

function drawRoute(svg) {
  // Find the best zone of currentRouteType
  let targetZone = null;
  const candidates = state.zones.filter(z => z.type === state.currentRouteType);
  if (!candidates.length) return;

  if (state.currentRouteType === "food" || state.currentRouteType === "restroom" || state.currentRouteType === "gate") {
    // Find the one with lowest density
    targetZone = candidates.reduce((prev, curr) => (prev.density < curr.density) ? prev : curr);
  } else {
    targetZone = candidates[0];
  }

  const startX = 24;
  const startY = 36;
  const endX = targetZone.x + targetZone.w / 2;
  const endY = targetZone.y + targetZone.h / 2;

  // Smart orthoganal routing to avoid crossing the playing field
  let d = "";
  if ((startX < 40 && endX > 60) || (startX > 60 && endX < 40)) {
    // Crosses the center: route via the top (y=19) or bottom (y=80) corridors
    const passY = endY < 50 ? 19 : 80;
    d = `M ${startX} ${startY} L ${startX} ${passY} L ${endX} ${passY} L ${endX} ${endY}`;
  } else {
    // On the same side: normal orthoganal L-shape
    const midX = startX;
    const midY = endY;
    d = `M ${startX} ${startY} L ${midX} ${midY} L ${endX} ${endY}`;
  }
  
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#00aaff");
  path.setAttribute("stroke-width", "0.8");
  path.setAttribute("stroke-dasharray", "2, 1.5");
  path.classList.add("route-line");
  svg.appendChild(path);

  // Add target marker
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  marker.setAttribute("cx", endX);
  marker.setAttribute("cy", endY);
  marker.setAttribute("r", "1.5");
  marker.setAttribute("fill", "#00ff88");
  marker.setAttribute("stroke", "#fff");
  marker.setAttribute("stroke-width", "0.4");
  svg.appendChild(marker);
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function showTooltip(zone) {
  const tooltip = document.getElementById("zoneTooltip");
  document.getElementById("tooltipZone").textContent = zone.label;
  document.getElementById("tooltipDensity").textContent = zone.density === 0 ? "Field — N/A" : `${zone.density}%`;
  document.getElementById("tooltipDensity").className = "tooltip-value density-" + (getDensityColor(zone.density) || "green");
  document.getElementById("tooltipWait").textContent = getWaitTime(zone);
  document.getElementById("tooltipSuggestion").textContent = getSuggestion(zone);
  tooltip.classList.remove("hidden");
}

document.getElementById("tooltipClose").addEventListener("click", () => {
  document.getElementById("zoneTooltip").classList.add("hidden");
});

// ─── Queue Rendering ──────────────────────────────────────────────────────────
const QUEUE_TYPES = ["gate", "food", "restroom", "merch", "parking"];
const QUEUE_LABELS = { gate: "Entry Gates", food: "Food Courts", restroom: "Restrooms", merch: "Merchandise", parking: "Parking" };
const QUEUE_ICONS  = { gate: "⛩️", food: "🍽️", restroom: "🚻", merch: "🛍️", parking: "🅿️" };

function renderQueues() {
  const grid = document.getElementById("queueGrid");
  grid.innerHTML = "";

  const parkingZones = [
    { label: "Parking Zone A", density: 60, type: "parking" },
    { label: "Parking Zone B", density: 45, type: "parking" },
    { label: "Parking Zone C", density: 72, type: "parking" },
  ];

  const allZones = [...state.zones, ...parkingZones];

  QUEUE_TYPES.forEach(type => {
    const zones = allZones.filter(z => z.type === type);
    if (!zones.length) return;

    const section = document.createElement("div");
    section.className = "queue-section";
    section.innerHTML = `<div class="queue-section-title">${QUEUE_ICONS[type]} ${QUEUE_LABELS[type]}</div>`;

    zones.forEach(zone => {
      const wait = Math.round(zone.density / 10);
      const level = zone.density < 40 ? "low" : zone.density < 70 ? "medium" : "high";
      const trend = Math.random() > 0.5 ? "↑" : Math.random() > 0.5 ? "↓" : "→";
      const trendClass = trend === "↑" ? "up" : trend === "↓" ? "down" : "stable";

      const card = document.createElement("div");
      card.className = `queue-card queue-${level}`;
      card.innerHTML = `
        <div class="queue-card-top">
          <div class="queue-name">${zone.label}</div>
          <span class="queue-level-badge badge-${level}">${level.toUpperCase()}</span>
        </div>
        <div class="queue-card-mid">
          <div class="queue-wait">
            <span class="wait-num">${wait === 0 ? "0" : wait}</span>
            <span class="wait-unit">min wait</span>
          </div>
          <span class="queue-trend trend-${trendClass}">${trend}</span>
        </div>
        <div class="queue-bar-wrap">
          <div class="queue-bar" style="width:${zone.density}%"></div>
        </div>
        <button class="btn-best-time" data-zone="${zone.label}" data-density="${zone.density}" data-wait="${wait}">
          💡 Best time to go
        </button>
      `;
      section.appendChild(card);
    });

    grid.appendChild(section);
  });

  // Summary
  const highCount = state.zones.filter(z => z.density >= 70).length;
  const lowCount = state.zones.filter(z => z.density < 40 && z.density > 0).length;
  document.getElementById("queueSummary").innerHTML =
    `<span class="sum-red">🔴 ${highCount} high</span> · <span class="sum-green">🟢 ${lowCount} clear</span>`;

  // Best time buttons
  document.querySelectorAll(".btn-best-time").forEach(btn => {
    btn.addEventListener("click", async () => {
      const zoneName = btn.dataset.zone;
      const density = btn.dataset.density;
      const wait = btn.dataset.wait;
      btn.textContent = "⏳ Thinking…";
      btn.disabled = true;
      const tip = await askClaudeForTip(zoneName, density, wait, state.phaseLabel);
      btn.textContent = tip;
      btn.style.fontSize = "11px";
      btn.style.color = "#00ff88";
    });
  });
}

async function askClaudeForTip(zone, density, wait, phase) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `You are VenueFlow AI at a large cricket stadium. Current match phase: ${phase}. Zone: "${zone}" has ${density}% crowd density and ~${wait} min wait time. Give ONE ultra-short, actionable tip (max 12 words) about the best time to visit this zone. Be specific and practical. No emojis in the text itself.`
        }]
      })
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || "Try visiting after the current game action settles.";
  } catch {
    const isHigh = density > 65;
    return isHigh ? `Wait ~${Math.max(5, wait - 5)} mins until action restarts.` : `Go now! Queue is currently stable at ~${wait}m.`;
  }
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
function initAlerts() {
  ALERTS_SEED.slice(0, 6).forEach(a => addAlert(a));
  document.getElementById("genAlertBtn").addEventListener("click", generateAIAlert);
}

function addAlert(alert) {
  state.alerts.unshift({ ...alert, id: Date.now() + Math.random(), ts: new Date() });
  renderAlerts();
  updateAlertBadge();
  updateTicker();
}

function renderAlerts() {
  const list = document.getElementById("alertsList");
  list.innerHTML = "";
  state.alerts.slice(0, 12).forEach(alert => {
    const item = document.createElement("div");
    item.className = `alert-item alert-${alert.type}`;
    const timeAgo = getTimeAgo(alert.ts);
    item.innerHTML = `
      <div class="alert-icon">${alert.icon}</div>
      <div class="alert-body">
        <div class="alert-text">${alert.text}</div>
        <div class="alert-time">${timeAgo}</div>
      </div>
      <div class="alert-dismiss" onclick="dismissAlert(${alert.id})">✕</div>
    `;
    list.appendChild(item);
  });
}

function dismissAlert(id) {
  state.alerts = state.alerts.filter(a => a.id !== id);
  renderAlerts();
  updateAlertBadge();
}

function updateAlertBadge() {
  const badge = document.getElementById("alertBadge");
  const count = state.alerts.filter(a => a.type === "red" || a.type === "yellow").length;
  badge.textContent = count > 0 ? count : "";
}

function getTimeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff/60)}m ago`;
}

async function generateAIAlert() {
  const btn = document.getElementById("genAlertBtn");
  const txt = document.getElementById("genAlertText");
  btn.disabled = true;
  txt.textContent = "⏳ Generating…";

  const snapshot = state.zones.slice(0, 8).map(z => `${z.label}: ${z.density}%`).join(", ");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `You are VenueFlow, the AI alert system for a large stadium during a cricket match (phase: ${state.phaseLabel}). Current crowd data: ${snapshot}. Generate ONE realistic, urgent, and helpful stadium alert for attendees. Format: just the alert text, 15-25 words, actionable, no quotes. Examples: "Gate A congested — redirect to Gate D (2 min walk)" or "Food Court SE queue rising — try Food Court NW instead"`
        }]
      })
    });
    const data = await res.json();
    const alertText = data.content?.[0]?.text?.trim() || "Stay alert for crowd updates.";
    const types = ["red", "yellow", "green", "blue"];
    const icons = { red: "🔴", yellow: "🟡", green: "🟢", blue: "🔵" };
    const type = alertText.toLowerCase().includes("congested") || alertText.toLowerCase().includes("full") ? "red"
      : alertText.toLowerCase().includes("rising") || alertText.toLowerCase().includes("soon") ? "yellow"
      : alertText.toLowerCase().includes("clear") || alertText.toLowerCase().includes("no wait") ? "green"
      : "blue";
    addAlert({ type, icon: icons[type], text: alertText });

    // Switch to alerts tab
    switchTab("alerts");
  } catch (e) {
    // Robust Mock Alert Generator
    const highZones = state.zones.filter(z => z.density > 75);
    const lowZones = state.zones.filter(z => z.type === 'food' && z.density < 30);
    
    let mockAlert = { type: "blue", icon: "🔵", text: "Match momentum building! Check the map for crowd patterns." };
    if (highZones.length > 0) {
      const hz = highZones[0];
      mockAlert = { type: "red", icon: "🔴", text: `${hz.label} is severely congested (${hz.density}%). Please use alternative routes.` };
    } else if (lowZones.length > 0) {
      mockAlert = { type: "green", icon: "🟢", text: `Zero queues at ${lowZones[0].label}! Great time to grab snacks.` };
    }
    addAlert(mockAlert);
    switchTab("alerts");
  } finally {
    btn.disabled = false;
    txt.textContent = "✨ Generate AI Alert";
  }
}

// ─── Ticker ───────────────────────────────────────────────────────────────────
function startTicker() {
  updateTicker();
}

function updateTicker() {
  const ticker = document.getElementById("tickerContent");
  const texts = state.alerts.slice(0, 5).map(a => `${a.icon} ${a.text}`).join("   ·   ");
  ticker.textContent = texts;
}

// ─── Game Clock ───────────────────────────────────────────────────────────────
function startGameClock() {
  let seconds = 18 * 60 + 34;
  setInterval(() => {
    seconds = (seconds + 1) % (50 * 60);
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    document.getElementById("gamePhase").textContent = `${state.phaseLabel.split(" ")[0]} · ${m}:${s}`;
  }, 1000);
}

// ─── Simulate Live ────────────────────────────────────────────────────────────
function initSimulate() {
  const btn = document.getElementById("simulateBtn");
  btn.addEventListener("click", () => {
    if (state.simulateInterval) {
      clearInterval(state.simulateInterval);
      state.simulateInterval = null;
      btn.textContent = "⟳ Simulate Live";
      btn.classList.remove("btn-active");
    } else {
      btn.textContent = "⏹ Stop";
      btn.classList.add("btn-active");
      state.simulateInterval = setInterval(() => {
        state.zones = state.zones.map(z => {
          if (z.density === 0) return z;
          const drift = Math.floor((Math.random() - 0.45) * 12);
          return { ...z, density: Math.min(99, Math.max(2, z.density + drift)) };
        });
        renderMap();
        renderQueues();
      }, 4000);
    }
  });
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`)?.classList.add("active");
  document.getElementById(`tab-${tabId}`)?.classList.add("active");
  if (tabId === "alerts") document.getElementById("alertBadge").textContent = "";
}

// ─── Chatbot ──────────────────────────────────────────────────────────────────
function initChatbot() {
  const input = document.getElementById("chatInput");
  const send = document.getElementById("chatSend");

  send.addEventListener("click", sendChat);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });

  document.getElementById("quickReplies").addEventListener("click", (e) => {
    if (e.target.classList.contains("quick-btn")) {
      input.value = e.target.textContent;
      sendChat();
    }
  });
}

function sendChat() {
  const input = document.getElementById("chatInput");
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";
  appendMessage("user", msg);
  state.chatHistory.push({ role: "user", content: msg });
  showTyping();
  callClaudeChat();
}

function appendMessage(role, text) {
  const wrap = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.className = `message ${role}-message`;
  div.innerHTML = `<div class="message-bubble">${text}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function showTyping() {
  const wrap = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.className = "message bot-message typing-indicator-wrap";
  div.id = "typingIndicator";
  div.innerHTML = `<div class="message-bubble typing-indicator"><span></span><span></span><span></span></div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function removeTyping() {
  document.getElementById("typingIndicator")?.remove();
}

async function callClaudeChat() {
  const venue = VENUES[state.venueId];
  const crowdSnap = state.zones
    .filter(z => z.density > 0)
    .map(z => `${z.label}: ${z.density}% density, wait ~${Math.round(z.density/10)}min`)
    .join("; ");

  const systemPrompt = `You are VenueFlow, a smart AI stadium assistant at ${venue.name}, ${venue.city}. You have real-time knowledge of all zones, crowd density, and wait times.

Current match phase: ${state.phaseLabel}
Venue capacity: ${venue.capacity.toLocaleString()}

Live zone data: ${crowdSnap}

Instructions: Be concise (2-4 sentences max), helpful, and specific. Always give actionable advice. Use specific zone names. If someone asks what's best, compare 2-3 options. Be friendly but brief — people are at a match!`;

  try {
    const messages = state.chatHistory.slice(-6);
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1000, system: systemPrompt, messages })
    });
    const data = await res.json();
    const reply = data.content?.[0]?.text?.trim() || "I'm having trouble fetching live data. Please check the map tab.";
    state.chatHistory.push({ role: "assistant", content: reply });
    removeTyping();
    appendMessage("bot", reply);
  } catch {
    removeTyping();
    // Intelligent Mock Response
    const term = state.chatHistory[state.chatHistory.length - 1].content.toLowerCase();
    let reply = "I couldn't quite catch that. Try asking about the 'best restroom' or 'food queue'.";
    
    if (term.includes("restroom") || term.includes("washroom")) {
      const best = state.zones.filter(z => z.type === 'restroom').sort((a,b) => a.density - b.density)[0];
      if (best) reply = `The ${best.label} currently only has a ~${Math.round(best.density/10)} minute wait. I recommend heading there!`;
    } else if (term.includes("food") || term.includes("eat") || term.includes("hungry")) {
      const best = state.zones.filter(z => z.type === 'food').sort((a,b) => a.density - b.density)[0];
      if (best) reply = `If you're hungry, ${best.label} is your best bet (only ${best.density}% density). The others are quite busy right now.`;
    } else if (term.includes("leave") || term.includes("exit") || term.includes("when")) {
      const exits = state.zones.filter(z => z.type === 'gate');
      const busy = exits.some(z => z.density > 60);
      if (state.phase === 'q4') {
        reply = "It's the final over! You should leave right now to beat the massive post-match rush at the gates.";
      } else if (state.phase === 'postgame') {
        reply = "The match is over and all gates are highly congested. I recommend waiting 15-20 minutes in your seat for the crowds to clear.";
      } else {
        reply = busy ? "The gates are starting to fill up. You might want to wait a bit." : `Gates are currently clear (${state.phaseLabel}). You can exit smoothly if you leave now.`;
      }
    } else if (term.includes("rush") || term.includes("halftime") || term.includes("lunch")) {
      reply = "To beat the rush, I'd suggest ordering food 10 minutes before the scheduled break. Alternatively, wait until 5 minutes after play resumes.";
    }

    state.chatHistory.push({ role: "assistant", content: reply });
    appendMessage("bot", reply);
  }
}

