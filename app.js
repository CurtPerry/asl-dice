const rollTypes = {
  MC: { label: "Morale Check", dice: 2 },
  IFT: { label: "Infantry Firetable Roll", dice: 2 },
  TC: { label: "Pin Check", dice: 2 },
  SW: { label: "Support Weapon Roll", dice: 1 },
  Smoke: { label: "Smoke Grenade Placement", dice: 1 },
  Amb: { label: "Ambush Roll", dice: 1 },
  CC: { label: "Close Combat Roll", dice: 2 },
  GEN: { label: "General Roll", dice: 2 },
};

const storageKey = "asl-dice-log";
const maxLogEntries = 100;

let selectedSide = "Axis";
let selectedMode = "MC";
let logEntries = loadLog();

const rollButton = document.querySelector("#roll-button");
const clearLogButton = document.querySelector("#clear-log");
const deleteLogEntryButton = document.querySelector("#delete-log-entry");
const rollLog = document.querySelector("#roll-log");
const logCount = document.querySelector("#log-count");

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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

function rollDice() {
  const rollType = rollTypes[selectedMode];
  const rolls = Array.from({ length: rollType.dice }, () => randomDie());
  const total = rolls.reduce((sum, roll) => sum + roll, 0);
  const entry = {
    side: selectedSide,
    label: rollType.label,
    rolls,
    total,
  };

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

  const total = document.createElement("span");
  total.className = "log-total";
  total.textContent = ` = ${entry.total}`;
  item.append(total);
}
