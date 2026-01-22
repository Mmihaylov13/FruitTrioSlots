// ========================
// Fruit Trio Classic - script.js (UPDATED)
// - First spin: forced win (Row 1 + Row 2 = Banana across all reels)
// - Reels start simultaneously, stop staggered
// - Motion blur while spinning
// - Yellow border highlight on winning Banana symbols (guaranteed)
// - Delay overlay slightly so highlight is visible
// - Full-frame win.mp4 overlay at assets/ui/win/win.mp4
// ========================

const SYMBOLS = [
  "Apple", "Banana", "Cherry", "Lemon",
  "Orange", "Plum", "Strawberry", "Watermelon"
];

const WEIGHTS = {
  Apple: 18, Banana: 18, Cherry: 16, Lemon: 16,
  Orange: 14, Plum: 12, Strawberry: 10, Watermelon: 8
};

// HUD values
let balance = 1000;
let bet = 1.00;

// first spin wins only
let winUsed = false;
let spinning = false;

// DOM
const reels = [...document.querySelectorAll(".reel")];
const spinBtn = document.getElementById("spin");
const resetBtn = document.getElementById("reset");
const betPlus = document.getElementById("betPlus");
const betMinus = document.getElementById("betMinus");

const balanceEl = document.getElementById("balanceValue");
const betEl = document.getElementById("betValue");

const winOverlay = document.getElementById("winOverlay");
const winVideo = document.getElementById("winVideo");
const closeWinBtn = document.getElementById("closeWin");

// ------------------------
// small util
// ------------------------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ------------------------
// HUD
// ------------------------
function updateHUD() {
  if (balanceEl) balanceEl.textContent = balance;
  if (betEl) betEl.textContent = bet.toFixed(2);
}

// ------------------------
// RNG helpers
// ------------------------
function weightedRandom() {
  const pool = [];
  for (const s of SYMBOLS) {
    const n = WEIGHTS[s] ?? 10;
    for (let i = 0; i < n; i++) pool.push(s);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// ------------------------
// Render helpers
// IMPORTANT: we set data-symbol on each cell
// ------------------------
function cellHTML(name) {
  return `
    <div class="cell" data-symbol="${name}">
      <img class="symbol" src="assets/symbols/${name}.png" alt="${name}">
    </div>
  `;
}

function syncCellHeights() {
  reels.forEach((reel) => {
    const h = reel.getBoundingClientRect().height;
    reel.style.setProperty("--cell-h", `${h / 3}px`);
  });
}

function buildStripHTML(final3, extra) {
  let html = "";
  for (let i = 0; i < extra; i++) html += cellHTML(weightedRandom());
  html += final3.map(cellHTML).join("");
  return html;
}

// ------------------------
// Win highlight
// ------------------------
function clearWinHighlights() {
  document.querySelectorAll(".cell.win").forEach((c) => c.classList.remove("win"));
}

function highlightWinningBananasTopMid() {
  // highlight top (row 0) + middle (row 1) when Banana
  reels.forEach((reel) => {
    const cells = reel.querySelectorAll(".cell");
    if (cells.length < 3) return;

    const top = cells[0];
    const mid = cells[1];

    if (top?.dataset.symbol === "Banana") top.classList.add("win");
    if (mid?.dataset.symbol === "Banana") mid.classList.add("win");
  });
}

// ------------------------
// Forced win result
// ------------------------
function makeBananaDoubleRowWin() {
  // [top, mid, bot] for each reel
  return [
    ["Banana", "Banana", weightedRandom()],
    ["Banana", "Banana", weightedRandom()],
    ["Banana", "Banana", weightedRandom()]
  ];
}

// ------------------------
// Win overlay (mp4)
// ------------------------
function openWinOverlay() {
  winOverlay.classList.add("is-open");
  winOverlay.setAttribute("aria-hidden", "false");

  winVideo.currentTime = 0;
  const p = winVideo.play();
  if (p && typeof p.catch === "function") {
    p.catch((err) => console.error("winVideo.play() failed:", err));
  }
}

function closeWinOverlay() {
  winOverlay.classList.remove("is-open");
  winOverlay.setAttribute("aria-hidden", "true");
  winVideo.pause();
}

closeWinBtn.addEventListener("click", closeWinOverlay);
winVideo.addEventListener("ended", closeWinOverlay);

// ------------------------
// Reel animation (with motion blur classes)
// ------------------------
function spinReel(reel, final3, duration, extra) {
  const strip = reel.querySelector(".strip");

  const h = reel.getBoundingClientRect().height;
  const cellH = h / 3;
  reel.style.setProperty("--cell-h", `${cellH}px`);

  strip.innerHTML = buildStripHTML(final3, extra);

  const totalCells = extra + 3;
  const endY = -((totalCells - 3) * cellH);

  // start blur
  reel.classList.add("spinning");
  reel.classList.remove("stopping");

  strip.style.transition = "none";
  strip.style.transform = "translateY(0)";
  strip.offsetHeight; // reflow

  strip.style.transition = `transform ${duration}ms cubic-bezier(.15,.85,.25,1)`;
  strip.style.transform = `translateY(${endY}px)`;

  return new Promise((resolve) => {
    strip.addEventListener(
      "transitionend",
      () => {
        // ease blur out
        reel.classList.remove("spinning");
        reel.classList.add("stopping");

        strip.style.transition = "none";
        strip.innerHTML = final3.map(cellHTML).join("");
        strip.style.transform = "translateY(0)";

        setTimeout(() => {
          reel.classList.remove("stopping");
          resolve();
        }, 180);
      },
      { once: true }
    );
  });
}

// ------------------------
// Init
// ------------------------
syncCellHeights();
updateHUD();

reels.forEach((reel) => {
  const strip = reel.querySelector(".strip");
  const init3 = [weightedRandom(), weightedRandom(), weightedRandom()];
  strip.innerHTML = init3.map(cellHTML).join("");
});

window.addEventListener("resize", syncCellHeights);

// Controls
resetBtn.addEventListener("click", () => location.reload());

betPlus.addEventListener("click", () => {
  if (spinning) return;
  bet = Math.min(50, bet + 1);
  updateHUD();
});

betMinus.addEventListener("click", () => {
  if (spinning) return;
  bet = Math.max(1, bet - 1);
  updateHUD();
});

// ------------------------
// Main spin
// ------------------------
async function spin() {
  if (spinning) return;
  if (balance < bet) return;

  spinning = true;

  // Clear previous win highlight
  clearWinHighlights();

  // Deduct bet
  balance = Math.max(0, balance - bet);
  updateHUD();

  // Decide results
  const isFirstWin = !winUsed;
  let results;

  if (isFirstWin) {
    results = makeBananaDoubleRowWin();
    winUsed = true;
  } else {
    results = [
      [weightedRandom(), weightedRandom(), weightedRandom()],
      [weightedRandom(), weightedRandom(), weightedRandom()],
      [weightedRandom(), weightedRandom(), weightedRandom()]
    ];
  }

  // Start all reels together, stop later by using longer durations
  const p1 = spinReel(reels[0], results[0], 900, 12);
  const p2 = spinReel(reels[1], results[1], 1100, 14);
  const p3 = spinReel(reels[2], results[2], 1300, 16);

  await Promise.all([p1, p2, p3]);

  // First-spin win showcase
  if (isFirstWin) {
    // Add payout (optional showcase)
    const winAmount = 50;
    balance += winAmount;
    updateHUD();

    // Highlight winning bananas (top + mid rows)
    highlightWinningBananasTopMid();

    // IMPORTANT: wait a moment so the glow is visible before overlay covers it
    await sleep(500);

    // Open win animation overlay
    openWinOverlay();
  }

  spinning = false;
}

spinBtn.addEventListener("click", spin);
