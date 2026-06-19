const rollTypes = {
  MC: { label: "Morale Check", dice: 2 },
  IFT: { label: "Infantry Firetable Roll", dice: 2 },
  TC: { label: "Pin Check", dice: 2 },
  SW: { label: "Support Weapon Roll", dice: 1 },
  Smoke: { label: "Smoke Grenade Placement", dice: 1 },
  Amb: { label: "Ambush Roll", dice: 1 },
  CC: { label: "Close Combat Roll", dice: 2 },
  TH: { label: "To Hit", dice: 2 },
  GEN: { label: "General Roll", dice: 2 },
};

const storageKey = "asl-dice-log";
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
let logEntries = loadLog();

const rollButton = document.querySelector("#roll-button");
const clearLogButton = document.querySelector("#clear-log");
const deleteLogEntryButton = document.querySelector("#delete-log-entry");
const rollLog = document.querySelector("#roll-log");
const logCount = document.querySelector("#log-count");
const iftPanel = document.querySelector("#ift-panel");

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
    updateIftPanel();
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

rollButton.addEventListener("click", rollDice);

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
updateIftPanel();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

function rollDice() {
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

function updateIftPanel() {
  iftPanel.classList.toggle("hidden", selectedMode !== "IFT");
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

function saveLog() {
  localStorage.setItem(storageKey, JSON.stringify(logEntries));
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
  const prefix = document.createElement("span");
  prefix.className = "log-label";
  prefix.textContent = `${entry.side} ${entry.label}: `;
  item.append(prefix);

  entry.rolls.forEach((roll, index) => {
    if (index > 0) {
      const plus = document.createElement("span");
      plus.className = "log-operator";
      plus.textContent = "+";
      item.append(plus);
    }

    const die = document.createElement("span");
    die.className = `log-die ${index === 0 ? "log-white-die" : "log-red-die"}`;
    die.textContent = roll;
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
  total.textContent = ` = ${entry.total}`;
  item.append(total);

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
