const rollTypes = {
  MC: { label: "Morale Check", dice: 2 },
  IFT: { label: "Infantry Firetable Roll", dice: 2 },
  TC: { label: "Pin Check", dice: 2 },
  SW: { label: "Support Weapon Roll", dice: 1 },
  HIP: { label: "HIP Reveal", dice: 0 },
  Smoke: { label: "Smoke Grenade Placement", dice: 1 },
  Amb: { label: "Ambush Roll", dice: 1 },
  CC: { label: "Close Combat Roll", dice: 2 },
  TH: { label: "To Hit", dice: 2 },
  RS: { label: "RND SEL", dice: 0 },
  GEN: { label: "General Roll", dice: 2 },
};

const storageKey = "asl-dice-log";
const hipStorageKey = "asl-dice-hip-state";
const maxLogEntries = 100;
const iftFirepowers = [1, 2, 4, 6, 8, 12, 16, 20, 24, 30, 36];
const iftResults = {
  0: ["1KIA", "2KIA", "2KIA", "3KIA", "3KIA", "3KIA", "4KIA", "4KIA", "5KIA", "6KIA", "7KIA"],
  1: ["K/1", "1KIA", "1KIA", "2KIA", "2KIA", "2KIA", "3KIA", "3KIA", "4KIA", "5KIA", "6KIA"],
  2: ["1MC", "K/1", "K/2", "1KIA", "1KIA", "1KIA", "2KIA", "2KIA", "3KIA", "4KIA", "5KIA"],
  3: ["1MC", "1MC", "2MC", "K/2", "K/2", "K/3", "1KIA", "1KIA", "2KIA", "3KIA", "4KIA"],
  4: ["NMC", "1MC", "1MC", "2MC", "2MC", "3MC", "K/3", "K/4", "1KIA", "2KIA", "3KIA"],
  5: ["PTC", "NMC", "1MC", "1MC", "2MC", "2MC", "3MC", "4MC", "K/4", "1KIA", "2KIA"],
  6: ["-", "PTC", "NMC", "1MC", "1MC", "2MC", "2MC", "3MC", "4MC", "K/4", "1KIA"],
  7: ["-", "-", "PTC", "NMC", "1MC", "1MC", "2MC", "2MC", "3MC", "4MC", "K/4"],
  8: ["-", "-", "-", "PTC", "NMC", "1MC", "1MC", "2MC", "2MC", "3MC", "4MC"],
  9: ["-", "-", "-", "-", "PTC", "NMC", "1MC", "1MC", "2MC", "2MC", "3MC"],
  10: ["-", "-", "-", "-", "-", "PTC", "NMC", "1MC", "1MC", "2MC", "2MC"],
  11: ["-", "-", "-", "-", "-", "-", "PTC", "NMC", "1MC", "1MC", "2MC"],
  12: ["-", "-", "-", "-", "-", "-", "-", "PTC", "NMC", "1MC", "1MC"],
  13: ["-", "-", "-", "-", "-", "-", "-", "-", "PTC", "NMC", "1MC"],
  14: ["-", "-", "-", "-", "-", "-", "-", "-", "-", "PTC", "NMC"],
  15: ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "PTC"],
};

let selectedSide = "Axis";
let selectedMode = "MC";
let selectedFirepower = 8;
let selectedModifier = 0;
let selectedRandomDice = 2;
let logEntries = loadLog();
let hipState = loadHipState();

const openSetupButton = document.querySelector("#open-setup");
const rollButton = document.querySelector("#roll-button");
const clearLogButton = document.querySelector("#clear-log");
const deleteLogEntryButton = document.querySelector("#delete-log-entry");
const rollLog = document.querySelector("#roll-log");
const logCount = document.querySelector("#log-count");
const iftPanel = document.querySelector("#ift-panel");
const hipPanel = document.querySelector("#hip-panel");
const hipStatus = document.querySelector("#hip-status");
const hipLocationGrid = document.querySelector("#hip-location-grid");
const randomSelectionPanel = document.querySelector("#random-selection-panel");
const setupOverlay = document.querySelector("#setup-overlay");
const closeSetupButton = document.querySelector("#close-setup");
const createHipSetupButton = document.querySelector("#create-hip-setup");
const hipLocationsInput = document.querySelector("#hip-locations-input");
const hipGunCountInput = document.querySelector("#hip-gun-count");
const setupMessage = document.querySelector("#setup-message");

document.querySelectorAll("[data-side]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedSide = button.dataset.side;
    setActive("[data-side]", button);
  });
});

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedMode = button.dataset.mode;
    setActive("[data-mode]", button);
    updateModePanels();
  });
});

document.querySelectorAll("[data-firepower]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedFirepower = Number(button.dataset.firepower);
    setActive("[data-firepower]", button);
  });
});

document.querySelectorAll("[data-modifier]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedModifier = Number(button.dataset.modifier);
    setActive("[data-modifier]", button);
  });
});

document.querySelectorAll("[data-random-dice]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedRandomDice = Number(button.dataset.randomDice);
    setActive("[data-random-dice]", button);
  });
});

rollButton.addEventListener("click", rollDice);

openSetupButton.addEventListener("click", openSetup);

closeSetupButton.addEventListener("click", closeSetup);

setupOverlay.addEventListener("click", (event) => {
  if (event.target === setupOverlay) {
    closeSetup();
  }
});

createHipSetupButton.addEventListener("click", createHipSetup);

clearLogButton.addEventListener("click", () => {
  logEntries = [];
  saveLog();
  renderLog();
});

deleteLogEntryButton.addEventListener("click", () => {
  logEntries.shift();
  saveLog();
  renderLog();
});

renderLog();
updateModePanels();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

function rollDice() {
  if (selectedMode === "HIP") {
    return;
  }

  if (selectedMode === "RS") {
    rollRandomSelection();
    return;
  }

  const rollType = rollTypes[selectedMode];
  const rolls = Array.from({ length: rollType.dice }, () => randomDie());
  const rawTotal = rolls.reduce((sum, roll) => sum + roll, 0);
  const modifier = selectedMode === "IFT" ? selectedModifier : 0;
  const total = rawTotal + modifier;
  const entry = {
    side: selectedSide,
    label: selectedMode === "IFT" ? `IFT ${selectedFirepower}FP` : rollType.label,
    rolls,
    modifier,
    total,
  };

  if (selectedMode === "IFT") {
    entry.result = getIftResult(selectedFirepower, total);
    if (rolls[0] === rolls[1]) {
      entry.cowerResult = getIftCowerResult(selectedFirepower, total);
    }
  }

  logEntries.unshift(entry);
  logEntries = logEntries.slice(0, maxLogEntries);
  saveLog();
  renderLog();
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function setActive(selector, activeButton) {
  document.querySelectorAll(selector).forEach((button) => {
    button.classList.toggle("active", button === activeButton);
  });
}

function updateModePanels() {
  iftPanel.classList.toggle("hidden", selectedMode !== "IFT");
  hipPanel.classList.toggle("hidden", selectedMode !== "HIP");
  randomSelectionPanel.classList.toggle("hidden", selectedMode !== "RS");
  rollButton.classList.toggle("hidden", selectedMode === "HIP");
  renderHipPanel();
}

function rollRandomSelection() {
  const rolls = Array.from({ length: selectedRandomDice }, () => randomDie());

  addLogEntry({
    label: "RND SEL",
    rolls,
    randomSelection: true,
    total: "",
  });
}

function getIftResult(firepower, total) {
  const row = Math.min(Math.max(total, 0), 15);
  const column = iftFirepowers.indexOf(firepower);
  return iftResults[row][column];
}

function getIftCowerResult(firepower, total) {
  const row = Math.min(Math.max(total, 0), 15);
  const column = Math.max(iftFirepowers.indexOf(firepower) - 1, 0);
  return iftResults[row][column];
}

function loadLog() {
  try {
    const savedLog = JSON.parse(localStorage.getItem(storageKey)) || [];
    return savedLog.map(normalizeLogEntry);
  } catch {
    return [];
  }
}

function loadHipState() {
  try {
    return JSON.parse(localStorage.getItem(hipStorageKey)) || emptyHipState();
  } catch {
    return emptyHipState();
  }
}

function saveHipState() {
  localStorage.setItem(hipStorageKey, JSON.stringify(hipState));
}

function emptyHipState() {
  return {
    locations: [],
    gunCount: 0,
  };
}

function saveLog() {
  localStorage.setItem(storageKey, JSON.stringify(logEntries));
}

function addLogEntry(entry) {
  logEntries.unshift(entry);
  logEntries = logEntries.slice(0, maxLogEntries);
  saveLog();
  renderLog();
}

function renderLog() {
  rollLog.innerHTML = "";
  logCount.textContent = `${logEntries.length} ${logEntries.length === 1 ? "roll" : "rolls"}`;

  if (logEntries.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-log";
    emptyItem.textContent = "No rolls yet";
    rollLog.append(emptyItem);
    return;
  }

  logEntries.forEach((entry) => {
    const item = document.createElement("li");
    renderLogEntry(item, entry);
    rollLog.append(item);
  });
}

function normalizeLogEntry(entry) {
  if (typeof entry !== "string") {
    return entry;
  }

  const match = entry.match(/^(Axis|Allied) (.+): \[(\d)\](?: \+ \[(\d)\])? = (\d+)$/);
  if (!match) {
    return {
      side: "Axis",
      label: entry,
      rolls: [],
      total: "",
    };
  }

  const rolls = [Number(match[3])];
  if (match[4]) {
    rolls.push(Number(match[4]));
  }

  return {
    side: match[1],
    label: match[2],
    rolls,
    modifier: 0,
    total: Number(match[5]),
  };
}

function renderLogEntry(item, entry) {
  if (entry.kind === "message") {
    item.textContent = entry.text;
    return;
  }

  const prefix = document.createElement("span");
  prefix.className = "log-label";
  prefix.textContent = entry.side ? `${entry.side} ${entry.label}: ` : `${entry.label}: `;
  item.append(prefix);

  entry.rolls.forEach((roll, index) => {
    if (index > 0 && !entry.randomSelection) {
      const plus = document.createElement("span");
      plus.className = "log-operator";
      plus.textContent = "+";
      item.append(plus);
    }

    if (index > 0 && entry.randomSelection) {
      item.append(document.createTextNode(" "));
    }

    const die = document.createElement("span");
    die.className = getLogDieClass(entry, index);
    die.textContent = roll;
    applyRandomSelectionDieStyle(die, entry, index);
    item.append(die);
  });

  if (entry.modifier) {
    const modifier = document.createElement("span");
    modifier.className = "log-operator";
    modifier.textContent = entry.modifier > 0 ? ` + ${entry.modifier}` : ` - ${Math.abs(entry.modifier)}`;
    item.append(modifier);
  }

  const total = document.createElement("span");
  total.className = "log-total";
  if (entry.total !== "") {
    total.textContent = ` = ${entry.total}`;
    item.append(total);
  }

  if (entry.result) {
    const result = document.createElement("span");
    result.className = "log-result";
    result.textContent = ` (${entry.result})`;
    item.append(result);
  }

  if (entry.cowerResult) {
    const cowerResult = document.createElement("span");
    cowerResult.className = "log-result log-cower-result";
    cowerResult.textContent = ` (Cower: ${entry.cowerResult})`;
    item.append(cowerResult);
  }
}

function getLogDieClass(entry, index) {
  if (entry.randomSelection) {
    return "log-die log-random-die";
  }

  return `log-die ${index === 0 ? "log-white-die" : "log-red-die"}`;
}

function applyRandomSelectionDieStyle(die, entry, index) {
  if (!entry.randomSelection) {
    return;
  }

  const lastIndex = Math.max(entry.rolls.length - 1, 1);
  const shade = Math.round((index / lastIndex) * 255);
  die.style.background = `rgb(${shade}, ${shade}, ${shade})`;
  die.style.color = shade < 128 ? "#fffaf0" : "#17211c";
}

function openSetup() {
  setupMessage.textContent = "";
  hipLocationsInput.value = hipState.locations.map((location) => location.name).join(" ");
  hipGunCountInput.value = hipState.gunCount || 1;
  setupOverlay.classList.remove("hidden");
  hipLocationsInput.focus();
}

function closeSetup() {
  setupOverlay.classList.add("hidden");
}

function createHipSetup() {
  const locations = parseHipLocations(hipLocationsInput.value);
  const gunCount = Number(hipGunCountInput.value);

  if (locations.length === 0) {
    setupMessage.textContent = "Enter at least one HIP location.";
    return;
  }

  if (!Number.isInteger(gunCount) || gunCount < 0 || gunCount > locations.length) {
    setupMessage.textContent = `Guns must be 0-${locations.length}.`;
    return;
  }

  const occupiedIndexes = chooseRandomIndexes(locations.length, gunCount);
  hipState = {
    gunCount,
    locations: locations.map((name, index) => ({
      name,
      occupied: occupiedIndexes.includes(index),
      revealed: false,
    })),
  };

  saveHipState();
  addLogEntry({
    kind: "message",
    text: `HIP setup: ${gunCount} guns hidden among ${locations.length} locations`,
  });
  renderHipPanel();
  closeSetup();
}

function parseHipLocations(value) {
  const seen = new Set();
  return value
    .split(/[\s,]+/)
    .map((location) => location.trim().toUpperCase())
    .filter(Boolean)
    .filter((location) => {
      if (seen.has(location)) {
        return false;
      }
      seen.add(location);
      return true;
    });
}

function chooseRandomIndexes(total, count) {
  const indexes = Array.from({ length: total }, (_, index) => index);

  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
  }

  return indexes.slice(0, count);
}

function renderHipPanel() {
  if (!hipPanel || selectedMode !== "HIP") {
    return;
  }

  hipLocationGrid.innerHTML = "";
  const unrevealed = hipState.locations.filter((location) => !location.revealed);

  if (hipState.locations.length === 0) {
    hipStatus.textContent = "No HIP setup";
    return;
  }

  hipStatus.textContent = `${unrevealed.length} unrevealed of ${hipState.locations.length}`;

  if (unrevealed.length === 0) {
    hipStatus.textContent = "All HIP locations revealed";
    return;
  }

  unrevealed.forEach((location) => {
    const button = document.createElement("button");
    button.className = "hip-location-button";
    button.type = "button";
    button.textContent = location.name;
    button.addEventListener("click", () => revealHipLocation(location.name));
    hipLocationGrid.append(button);
  });
}

function revealHipLocation(locationName) {
  const location = hipState.locations.find((candidate) => candidate.name === locationName);
  if (!location || location.revealed) {
    return;
  }

  location.revealed = true;
  saveHipState();
  addLogEntry({
    kind: "message",
    text: `HIP ${location.name}: ${location.occupied ? "Gun revealed!" : "Nothing there."}`,
  });
  renderHipPanel();
}
