/**
 * Jogo da Memória v2
 * — Nome do jogador obrigatório antes de jogar
 * — Cronômetro por partida
 * — Ranking por dificuldade salvo em localStorage
 * — Estatísticas: tempo, jogadas, melhor tempo, total de partidas
 */

(() => {
  "use strict";

  // ---------- constantes ----------

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

  const STORAGE_KEYS = {
    player:  "memory_player",
    ranking: "memory_ranking", // { easy: [], medium: [], hard: [] }
  };

  const MAX_RANKING = 10; // entradas por dificuldade

  // ---------- DOM ----------

  const boardEl          = document.getElementById("board");
  const timerEl          = document.getElementById("timer");
  const movesEl          = document.getElementById("moves");
  const statusEl         = document.getElementById("status-line");
  const resetBtn         = document.getElementById("reset-btn");
  const playerNameEl     = document.getElementById("player-name");
  const changePlayerBtn  = document.getElementById("change-player-btn");

  // overlay jogador
  const playerOverlayEl  = document.getElementById("player-overlay");
  const playerInputEl    = document.getElementById("player-input");
  const playerErrorEl    = document.getElementById("player-input-error");
  const playerConfirmBtn = document.getElementById("player-confirm-btn");

  // overlay vitória
  const winOverlayEl     = document.getElementById("win-overlay");
  const winMessageEl     = document.getElementById("win-message");
  const winDetailEl      = document.getElementById("win-detail");
  const winRecordEl      = document.getElementById("win-record");
  const playAgainBtn     = document.getElementById("play-again-btn");

  // dificuldade
  const diffBtns         = document.querySelectorAll(".difficulty__btn");

  // estatísticas
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

  // ---------- localStorage ----------

  function loadPlayer() {
    return localStorage.getItem(STORAGE_KEYS.player) || "";
  }

  function savePlayer(name) {
    localStorage.setItem(STORAGE_KEYS.player, name);
  }

  function loadRanking() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ranking);
      if (!raw) return { easy: [], medium: [], hard: [] };
      return JSON.parse(raw);
    } catch {
      return { easy: [], medium: [], hard: [] };
    }
  }

  function saveRanking(ranking) {
    localStorage.setItem(STORAGE_KEYS.ranking, JSON.stringify(ranking));
  }

  /**
   * Adiciona entrada no ranking.
   * Ordena por tempo (crescente), depois por jogadas (crescente) como desempate.
   * Retorna { position, isRecord } onde isRecord = entrou no top 1 de tempo.
   */
  function addToRanking(lvl, entry) {
    const ranking = loadRanking();
    const list    = ranking[lvl] || [];

    const prevBest = list.length > 0 ? list[0].seconds : Infinity;
    list.push(entry);

    list.sort((a, b) =>
      a.seconds !== b.seconds ? a.seconds - b.seconds : a.moves - b.moves
    );

    const trimmed  = list.slice(0, MAX_RANKING);
    const position = trimmed.findIndex(
      e => e.player === entry.player &&
           e.seconds === entry.seconds &&
           e.moves === entry.moves &&
           e.date === entry.date
    ) + 1;

    const isRecord = entry.seconds < prevBest;

    ranking[lvl] = trimmed;
    saveRanking(ranking);

    return { position, isRecord };
  }

  function clearRanking() {
    saveRanking({ easy: [], medium: [], hard: [] });
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
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  // ---------- modal de jogador ----------

  function showPlayerModal() {
    playerInputEl.value = currentPlayer || "";
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

  // ---------- inicialização do jogo ----------

  function initGame(selectedLevel = level) {
    level      = selectedLevel;
    matched    = 0;
    moves      = 0;
    flipped    = [];
    locked     = false;
    gameRunning = false;
    totalPairs = LEVELS[level].pairs;

    resetTimerDisplay();
    movesEl.textContent  = "000";
    statusEl.textContent = "encontre todos os pares";
    winOverlayEl.classList.remove("is-visible");

    buildDeck(totalPairs, LEVELS[level].cols);
  }

  // ---------- baralho ----------

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

  // ---------- lógica de jogo ----------

  function handleFlip(idx) {
    if (locked) return;
    const card = cards[idx];
    if (!card) return;
    if (card.el.classList.contains("is-flipped")) return;
    if (card.el.classList.contains("is-matched")) return;
    if (flipped.length === 2) return;

    // inicia timer na primeira carta virada
    if (!gameRunning) {
      gameRunning = true;
      startTimer();
    }

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

  function finishGame() {
    stopTimer();
    gameRunning = false;

    const entry = {
      player:  currentPlayer,
      seconds: secondsElapsed,
      moves,
      date: new Date().toLocaleDateString("pt-BR"),
    };

    const { position, isRecord } = addToRanking(level, entry);

    // atualiza o painel de stats se estiver aberto
    if (!statsPanel.hidden) { renderStats(); }

    showWinOverlay(entry, position, isRecord);
  }

  // ---------- overlay de vitória ----------

  function showWinOverlay(entry, position, isRecord) {
    winMessageEl.textContent = "PARABÉNS";
    winDetailEl.textContent  = `${currentPlayer}, você completou em ${formatTime(entry.seconds)}!`;

    winRecordEl.innerHTML = `
      <p><span>tempo</span>     <span>${formatTime(entry.seconds)}</span></p>
      <p><span>jogadas</span>   <span>${entry.moves}</span></p>
      <p><span>dificuldade</span><span>${LEVELS[level].label}</span></p>
      <p><span>posição</span>   <span class="${position <= 3 ? "is-record" : ""}">${position}º no ranking</span></p>
      ${isRecord ? `<p><span></span><span class="is-record">✦ novo recorde!</span></p>` : ""}
    `;

    winOverlayEl.classList.add("is-visible");
  }

  // ---------- estatísticas / ranking ----------

  function toggleStats() {
    const hidden = statsPanel.hidden;
    statsPanel.hidden = !hidden;
    statsToggleBtn.textContent = hidden ? "▾ ranking" : "▸ ranking";
    if (!statsPanel.hidden) { renderStats(); }
  }

  function renderStats() {
    const ranking = loadRanking();
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

  // jogador
  playerConfirmBtn.addEventListener("click", confirmPlayer);
  playerInputEl.addEventListener("keydown", e => { if (e.key === "Enter") confirmPlayer(); });
  changePlayerBtn.addEventListener("click", showPlayerModal);

  // jogo
  resetBtn.addEventListener("click", () => initGame());
  playAgainBtn.addEventListener("click", () => initGame());

  diffBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      diffBtns.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      initGame(btn.dataset.level);
    });
  });

  // stats
  statsToggleBtn.addEventListener("click", toggleStats);

  statsTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      statsTabs.forEach(t => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      statsTab = tab.dataset.level;
      renderStats();
    });
  });

  statsClearBtn.addEventListener("click", () => {
    if (confirm("Limpar todo o ranking? Esta ação não pode ser desfeita.")) {
      clearRanking();
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
    // sem jogador salvo: mostra modal antes de qualquer coisa
    // monta o tabuleiro no fundo (desabilitado) para não ficar em branco
    initGame();
    showPlayerModal();
  }

})();
