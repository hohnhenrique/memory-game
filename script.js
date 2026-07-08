/**
 * Jogo da Memória v3
 * — Nome do jogador obrigatório antes de jogar
 * — Cronômetro por partida
 * — Sistema de pontuação com bônus de velocidade e penalidade por erro
 * — Ranking top 10 compartilhado via JSONBin.io
 * — Fallback para localStorage se JSONBin estiver indisponível
 */

(() => {
  "use strict";

  // ---------- configurações ----------

  const LEVELS = {
    easy:   { pairs: 8,  cols: 4,  label: "fácil"  },
    medium: { pairs: 18, cols: 6,  label: "médio"  },
    hard:   { pairs: 30, cols: 10, label: "difícil" },
  };

  const SYMBOLS = [
    "⬡","⬢","◈","⬟","⬠",
    "✿","❀","⚘","✾","❁",
    "◆","◇","▲","△","◉",
    "★","☆","⚡","⚙","✦",
    "⌬","⎔","⏣","⌘","⍟",
    "⬖","⬗","⬘","⬙","⊛",
  ];

  const MAX_RANKING     = 10;
  const PLAYER_KEY      = "memory_player";
  const FALLBACK_KEY    = "memory_ranking_fallback";
  const DIFFICULTY_MULT = { easy: 1, medium: 2, hard: 3 };

  // ─── JSONBin ────────────────────────────────────────────────────────────
  const JSONBIN = {
    BIN_ID:     "6a4ed01af5f4af5e29747381",
    ACCESS_KEY: "$2a$10$fvHqidvfnUG1xDfPs0hciOxkzypjaByzNrHwGJ53s0q4vPvu2innK",
    get URL()  { return `https://api.jsonbin.io/v3/b/${this.BIN_ID}`; },
  };
  // ────────────────────────────────────────────────────────────────────────

  // ---------- pontuação ----------

  /**
   * base       = pares × 100 × multiplicador
   * bônus      = max(0, 300 − segundos) × multiplicador  (velocidade)
   * penalidade = erros × 15 × multiplicador
   * erros      = jogadas além do mínimo ideal (1 jogada por par)
   */
  function calcScore(lvl, pairs, seconds, moves) {
    const mult    = DIFFICULTY_MULT[lvl] || 1;
    const base    = pairs * 100 * mult;
    const bonus   = Math.max(0, 300 - seconds) * mult;
    const errors  = Math.max(0, moves - pairs);
    const penalty = errors * 15 * mult;
    return Math.max(0, base + bonus - penalty);
  }

  // ---------- DOM ----------

  const boardEl          = document.getElementById("board");
  const timerEl          = document.getElementById("timer");
  const movesEl          = document.getElementById("moves");
  const statusEl         = document.getElementById("status-line");
  const resetBtn         = document.getElementById("reset-btn");
  const playerNameEl     = document.getElementById("player-name");
  const changePlayerBtn  = document.getElementById("change-player-btn");

  const playerOverlayEl  = document.getElementById("player-overlay");
  const playerInputEl    = document.getElementById("player-input");
  const playerErrorEl    = document.getElementById("player-input-error");
  const playerConfirmBtn = document.getElementById("player-confirm-btn");

  const winOverlayEl     = document.getElementById("win-overlay");
  const winMessageEl     = document.getElementById("win-message");
  const winDetailEl      = document.getElementById("win-detail");
  const winRecordEl      = document.getElementById("win-record");
  const playAgainBtn     = document.getElementById("play-again-btn");

  const diffBtns         = document.querySelectorAll(".difficulty__btn");
  const statsToggleBtn   = document.getElementById("stats-toggle-btn");
  const statsPanel       = document.getElementById("stats-panel");
  const statsTabs        = document.querySelectorAll(".stats-tab");
  const statsContent     = document.getElementById("stats-content");
  const statsClearBtn    = document.getElementById("stats-clear-btn");

  // ---------- estado ----------

  let currentPlayer  = "";
  let level          = "easy";
  let cards          = [];
  let flipped        = [];
  let matched        = 0;
  let moves          = 0;
  let totalPairs     = 0;
  let locked         = false;
  let timerInterval  = null;
  let secondsElapsed = 0;
  let gameRunning    = false;
  let statsTab       = "easy";

  // ---------- jogador ----------

  function loadPlayer() { return localStorage.getItem(PLAYER_KEY) || ""; }
  function savePlayer(name) { localStorage.setItem(PLAYER_KEY, name); }

  // ---------- ranking — JSONBin com fallback localStorage ----------

  const EMPTY_RANKING = () => ({ easy: [], medium: [], hard: [] });

  async function loadRanking() {
    try {
      const res = await fetch(JSONBIN.URL, {
        headers: { "X-Access-Key": JSONBIN.ACCESS_KEY },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.record || EMPTY_RANKING();
    } catch (err) {
      console.warn("[ranking] JSONBin indisponível, usando fallback local.", err.message);
      try {
        const raw = localStorage.getItem(FALLBACK_KEY);
        return raw ? JSON.parse(raw) : EMPTY_RANKING();
      } catch {
        return EMPTY_RANKING();
      }
    }
  }

  async function saveRanking(ranking) {
    try {
      const res = await fetch(JSONBIN.URL, {
        method:  "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Access-Key": JSONBIN.ACCESS_KEY,
        },
        body: JSON.stringify(ranking),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.warn("[ranking] Falha ao salvar no JSONBin, salvando localmente.", err.message);
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(ranking));
    }
  }

  /**
   * Insere entrada, ordena por pontuação (desc), desempate por tempo (asc),
   * mantém top 10. Retorna { position, isRecord }.
   */
  async function addToRanking(lvl, entry) {
    const ranking  = await loadRanking();
    const list     = ranking[lvl] || [];
    const prevBest = list.length > 0 ? list[0].score : -Infinity;

    list.push(entry);
    list.sort((a, b) =>
      b.score !== a.score ? b.score - a.score : a.seconds - b.seconds
    );

    const trimmed  = list.slice(0, MAX_RANKING);
    const position = trimmed.findIndex(
      e => e.player  === entry.player  &&
           e.score   === entry.score   &&
           e.seconds === entry.seconds &&
           e.date    === entry.date
    ) + 1;

    const isRecord = entry.score > prevBest;
    ranking[lvl]   = trimmed;
    await saveRanking(ranking);

    return { position, isRecord };
  }

  async function clearRanking() {
    await saveRanking(EMPTY_RANKING());
  }

  // ---------- cronômetro ----------

  function startTimer() {
    secondsElapsed = 0;
    timerEl.textContent = "00:00";
    timerInterval = setInterval(() => {
      secondsElapsed++;
      timerEl.textContent = formatTime(secondsElapsed);
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function resetTimerDisplay() {
    stopTimer();
    secondsElapsed = 0;
    timerEl.textContent = "00:00";
  }

  function formatTime(s) {
    const m   = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  // ---------- modal de jogador ----------

  function showPlayerModal() {
    playerInputEl.value    = currentPlayer || "";
    playerErrorEl.textContent = "";
    playerOverlayEl.classList.add("is-visible");
    setTimeout(() => playerInputEl.focus(), 100);
  }

  function hidePlayerModal() {
    playerOverlayEl.classList.remove("is-visible");
  }

  function confirmPlayer() {
    const name = playerInputEl.value.trim();
    if (!name) {
      playerErrorEl.textContent = "nome obrigatório";
      playerInputEl.focus();
      return;
    }
    if (name.length < 2) {
      playerErrorEl.textContent = "mínimo 2 caracteres";
      playerInputEl.focus();
      return;
    }
    currentPlayer = name;
    savePlayer(name);
    playerNameEl.textContent = name;
    hidePlayerModal();
    initGame();
  }

  // ---------- jogo ----------

  function initGame(selectedLevel = level) {
    level       = selectedLevel;
    matched     = 0;
    moves       = 0;
    flipped     = [];
    locked      = false;
    gameRunning = false;
    totalPairs  = LEVELS[level].pairs;

    resetTimerDisplay();
    movesEl.textContent  = "000";
    statusEl.textContent = "encontre todos os pares";
    winOverlayEl.classList.remove("is-visible");

    buildDeck(totalPairs, LEVELS[level].cols);
  }

  function buildDeck(pairs, cols) {
    const pool = shuffle([...SYMBOLS]).slice(0, pairs);
    const deck = shuffle(
      pool.flatMap((symbol, i) => [
        { symbol, colorIndex: (i % 10) + 1 },
        { symbol, colorIndex: (i % 10) + 1 },
      ])
    );

    cards = [];
    boardEl.innerHTML = "";
    boardEl.dataset.level = level;
    boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    deck.forEach((item, idx) => {
      const cardEl = createCardEl(item.symbol, item.colorIndex, idx);
      cards.push({ id: idx, symbol: item.symbol, colorIndex: item.colorIndex, el: cardEl });
      boardEl.appendChild(cardEl);
    });
  }

  function createCardEl(symbol, colorIndex, idx) {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `carta ${idx + 1}, virada para baixo`);
    card.dataset.color = colorIndex;
    card.innerHTML = `
      <div class="card__inner">
        <div class="card__face card__back"></div>
        <div class="card__face card__front">${symbol}</div>
      </div>`;
    card.addEventListener("click",   () => handleFlip(idx));
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleFlip(idx); }
    });
    return card;
  }

  function handleFlip(idx) {
    if (locked) return;
    const card = cards[idx];
    if (!card) return;
    if (card.el.classList.contains("is-flipped")) return;
    if (card.el.classList.contains("is-matched")) return;
    if (flipped.length === 2) return;

    if (!gameRunning) { gameRunning = true; startTimer(); }

    card.el.classList.add("is-flipped");
    card.el.setAttribute("aria-label", `carta ${idx + 1}: ${card.symbol}`);
    flipped.push(card);

    if (flipped.length === 2) {
      moves++;
      movesEl.textContent = String(moves).padStart(3, "0");
      checkMatch();
    }
  }

  function checkMatch() {
    const [a, b] = flipped;

    if (a.symbol === b.symbol) {
      matched++;
      setTimeout(() => {
        a.el.classList.add("is-matched");
        b.el.classList.add("is-matched");
        a.el.setAttribute("aria-label", `par encontrado: ${a.symbol}`);
        b.el.setAttribute("aria-label", `par encontrado: ${b.symbol}`);
        flipped = [];

        statusEl.textContent = matched === totalPairs
          ? "todos os pares encontrados!"
          : `${matched} de ${totalPairs} pares encontrados`;

        if (matched === totalPairs) { setTimeout(finishGame, 400); }
      }, 400);

    } else {
      locked = true;
      statusEl.textContent = "não é par, tente novamente";
      setTimeout(() => {
        a.el.classList.remove("is-flipped");
        b.el.classList.remove("is-flipped");
        a.el.setAttribute("aria-label", `carta ${a.id + 1}, virada para baixo`);
        b.el.setAttribute("aria-label", `carta ${b.id + 1}, virada para baixo`);
        flipped = [];
        locked  = false;
        statusEl.textContent = "encontre todos os pares";
      }, 900);
    }
  }

  async function finishGame() {
    stopTimer();
    gameRunning = false;

    const score = calcScore(level, totalPairs, secondsElapsed, moves);
    const entry = {
      player:  currentPlayer,
      score,
      seconds: secondsElapsed,
      moves,
      date: new Date().toLocaleDateString("pt-BR"),
    };

    // mostra overlay imediatamente com os dados locais,
    // depois salva no JSONBin em segundo plano
    showWinOverlay(entry, null, false);

    const { position, isRecord } = await addToRanking(level, entry);

    // atualiza overlay com posição real após salvar
    showWinOverlay(entry, position, isRecord);

    if (!statsPanel.hidden) { renderStats(); }
  }

  // ---------- overlay de vitória ----------

  function showWinOverlay(entry, position, isRecord) {
    winMessageEl.textContent = "PARABÉNS";
    winDetailEl.textContent  = `${currentPlayer}, você completou em ${formatTime(entry.seconds)}!`;

    const posText = position === null
      ? `<span style="color:var(--phosphor-dim)">salvando...</span>`
      : `<span class="${position <= 3 ? "is-record" : ""}">${position}º no ranking</span>`;

    winRecordEl.innerHTML = `
      <p><span>pontuação</span>   <span class="is-record">${entry.score.toLocaleString("pt-BR")} pts</span></p>
      <p><span>tempo</span>       <span>${formatTime(entry.seconds)}</span></p>
      <p><span>jogadas</span>     <span>${entry.moves}</span></p>
      <p><span>dificuldade</span> <span>${LEVELS[level].label}</span></p>
      <p><span>posição</span>     ${posText}</p>
      ${isRecord ? `<p><span></span><span class="is-record">✦ novo recorde!</span></p>` : ""}
    `;

    winOverlayEl.classList.add("is-visible");
  }

  // ---------- ranking ----------

  function toggleStats() {
    const hidden = statsPanel.hidden;
    statsPanel.hidden = !hidden;
    statsToggleBtn.textContent = hidden ? "▾ ranking" : "▸ ranking";
    if (!statsPanel.hidden) { renderStats(); }
  }

  async function renderStats() {
    statsContent.innerHTML = `<p class="stats-empty">carregando...</p>`;
    const ranking = await loadRanking();
    const list    = ranking[statsTab] || [];

    if (list.length === 0) {
      statsContent.innerHTML = `<p class="stats-empty">nenhuma partida registrada</p>`;
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];

    const rows = list.map((e, i) => {
      const isCurrent = e.player === currentPlayer;
      const pos = medals[i] || `${i + 1}`;
      return `
        <tr class="${isCurrent ? "is-current" : ""}">
          <td>${pos}</td>
          <td>${escapeHtml(e.player)}</td>
          <td>${(e.score || 0).toLocaleString("pt-BR")}</td>
          <td>${formatTime(e.seconds)}</td>
          <td>${e.moves}</td>
          <td>${e.date}</td>
        </tr>`;
    }).join("");

    statsContent.innerHTML = `
      <table class="ranking-table">
        <thead>
          <tr>
            <th>#</th>
            <th>jogador</th>
            <th>pontos</th>
            <th>tempo</th>
            <th>jogadas</th>
            <th>data</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---------- utilitários ----------

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------- eventos ----------

  playerConfirmBtn.addEventListener("click", confirmPlayer);
  playerInputEl.addEventListener("keydown", e => { if (e.key === "Enter") confirmPlayer(); });
  changePlayerBtn.addEventListener("click", showPlayerModal);

  resetBtn.addEventListener("click", () => initGame());
  playAgainBtn.addEventListener("click", () => initGame());

  diffBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      diffBtns.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      initGame(btn.dataset.level);
    });
  });

  statsToggleBtn.addEventListener("click", toggleStats);

  statsTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      statsTabs.forEach(t => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      statsTab = tab.dataset.level;
      renderStats();
    });
  });

  statsClearBtn.addEventListener("click", async () => {
    if (confirm("Limpar todo o ranking? Esta ação não pode ser desfeita.")) {
      await clearRanking();
      renderStats();
    }
  });

  // ---------- boot ----------

  const savedPlayer = loadPlayer();
  if (savedPlayer) {
    currentPlayer = savedPlayer;
    playerNameEl.textContent = savedPlayer;
    initGame();
  } else {
    initGame();
    showPlayerModal();
  }

})();
