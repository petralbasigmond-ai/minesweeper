import Board, { DIFFICULTIES } from "./board.js";
import { renderAll } from "./renderer.js";
import Timer from "./timer.js";
import audio from "./audio.js";
import Auth from "./auth.js";

/* ===========================================================
   Auth Check — redirect to landing if not logged in
   =========================================================== */
const currentUser = await Auth.refreshCurrentUser();

if (!currentUser) {
    window.location.href = "/";
    throw new Error("Not logged in");
}

if (!currentUser) {
    window.location.href = "/";
    throw new Error("Not logged in");
}

/* ===========================================================
   DOM References
   =========================================================== */
const boardEl = document.getElementById("board");
const bombCountEl = document.getElementById("bombCount");
const flagCountEl = document.getElementById("flagCount");
const heartsDisplayEl = document.getElementById("heartsDisplay");
const scoreDisplayEl = document.getElementById("scoreDisplay");
const highScoreDisplayEl = document.getElementById("highScoreDisplay");
const restartBtn = document.getElementById("restartButton");
const helpModal = document.getElementById("helpModal");
const helpBtns = [document.getElementById("helpBtn"), document.getElementById("helpBtn2")];
const closeModalBtn = document.getElementById("closeModal");
const statsToggle = document.getElementById("statsToggle");
const statsPanel = document.getElementById("statsPanel");
const difficultyBtns = document.querySelectorAll(".diff-btn");
const userNicknameEl = document.getElementById("userNickname");
const logoutBtn = document.getElementById("logoutBtn");
const flagToggleBtn = document.getElementById("flagToggleBtn");

// Stats elements (may be missing in cached HTML, so use optional chaining)
const statGamesEl = document.getElementById("statGames");
const statWinsEl = document.getElementById("statWins");
const statWinRateEl = document.getElementById("statWinRate");
const statStreakEl = document.getElementById("statStreak");

// Helper: safe textContent setter
function safeText(el, val) {
    if (el) el.textContent = val;
}

/* ===========================================================
   User Bar
   =========================================================== */
if (userNicknameEl) userNicknameEl.textContent = currentUser.nickname;
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        const confirmed = await showConfirmModal('Are you sure you want to logout? Your progress will be saved.');
        if (confirmed) {
            await Auth.logout();
            window.location.href = '/';
        }
    });
}

/* ===========================================================
   State
   =========================================================== */
let board = new Board('easy');
let gameStarted = false;
let gameOver = false;
let isExploding = false;
let score = 0;
let hearts = board.hearts;
let currentDifficulty = 'easy';
let flagMode = false; // F key toggle
let flagCharges = 0; // How many flag-reveals remain

const timer = new Timer();

/* ===========================================================
   Stats — use Auth user data
   =========================================================== */
let stats = { ...currentUser.stats };

function syncStatsToAuth() {
    Auth.saveProgress({ stats });
}

function updateStatsUI() {
    safeText(statGamesEl, stats.games);
    safeText(statWinsEl, stats.wins);
    const rate = stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0;
    safeText(statWinRateEl, `${rate}%`);
    safeText(statStreakEl, stats.streak);
}

updateStatsUI();

// Apply visual level locks on page load
applyLevelLocks();

// Initialize and draw the board immediately
board.initialize();
flagCharges = board.bombs;
updateFlagCount();
updateBombCount();
drawBoard();

// Ensure the correct difficulty button is highlighted (Easy by default)
difficultyBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === currentDifficulty);
});

/* ===========================================================
   High Score — use Auth user data
   =========================================================== */
function loadHighScore() {
    return currentUser.highScores[currentDifficulty] || 0;
}

let highScore = loadHighScore();
highScoreDisplayEl.textContent = highScore;

function saveHighScore() {
    const effectiveScore = Math.round(score * board.difficultyMultiplier);
    if (effectiveScore > highScore) {
        highScore = effectiveScore;
        const highScores = { ...currentUser.highScores, [currentDifficulty]: highScore };
        Auth.saveProgress({ highScores });
        // Sync local reference with stored data to prevent stale reads
        currentUser.highScores = highScores;
        highScoreDisplayEl.textContent = highScore;
        // Beat animation
        highScoreDisplayEl.classList.remove('highscore-beat');
        void highScoreDisplayEl.offsetWidth;
        highScoreDisplayEl.classList.add('highscore-beat');
    }
}

/* ===========================================================
   Reset High Score
   =========================================================== */
const resetHighScoreBtn = document.getElementById('resetHighScoreBtn');
if (resetHighScoreBtn) {
    resetHighScoreBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const diffLabel = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
        const confirmed = await showConfirmModal(`Reset best score for ${diffLabel} difficulty?`);
        if (confirmed) {
            const highScores = { ...currentUser.highScores, [currentDifficulty]: 0 };
            Auth.saveProgress({ highScores });
            highScore = 0;
            highScoreDisplayEl.textContent = '0';
        }
    });
}

/* ===========================================================
   Level Locking — lock/unlock difficulty buttons
   =========================================================== */
function applyLevelLocks() {
    difficultyBtns.forEach(btn => {
        const diff = btn.dataset.diff;
        if (diff === 'easy') return; // Easy is always unlocked
        const unlocked = Auth.isLevelUnlocked(diff);
        btn.classList.toggle('locked', !unlocked);
        if (!unlocked) {
            btn.title = `🔒 Complete ${diff === 'medium' ? 'Easy' : 'Medium'} to unlock`;
        } else {
            btn.title = '';
        }
    });
}

/* ===========================================================
   Themed Confirm Modal (replaces browser confirm())
   =========================================================== */
function showConfirmModal(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay confirm-modal-overlay';
        overlay.style.display = 'flex';
        overlay.style.animation = 'fadeIn 0.15s ease-out';

        const modal = document.createElement('div');
        modal.className = 'modal confirm-modal';

        const icon = document.createElement('div');
        icon.className = 'confirm-icon';
        icon.textContent = '💎';

        const msgEl = document.createElement('p');
        msgEl.className = 'confirm-message';
        msgEl.textContent = message;

        const btnRow = document.createElement('div');
        btnRow.className = 'confirm-buttons';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-close confirm-cancel';
        cancelBtn.textContent = 'Cancel';

        const okBtn = document.createElement('button');
        okBtn.className = 'modal-close confirm-ok';
        okBtn.textContent = 'Yes';

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(okBtn);
        modal.appendChild(icon);
        modal.appendChild(msgEl);
        modal.appendChild(btnRow);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const cleanup = (result) => {
            overlay.remove();
            resolve(result);
        };

        cancelBtn.addEventListener('click', () => cleanup(false));
        okBtn.addEventListener('click', () => cleanup(true));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup(false);
        });

        // Keyboard: Escape to cancel, Enter to confirm
        const keyHandler = (e) => {
            if (e.key === 'Escape') { cleanup(false); document.removeEventListener('keydown', keyHandler); }
            if (e.key === 'Enter') { cleanup(true); document.removeEventListener('keydown', keyHandler); }
        };
        document.addEventListener('keydown', keyHandler);
        // Focus the OK button
        setTimeout(() => okBtn.focus(), 50);
    });
}

/* ===========================================================
   Dynamic Cell Sizing (Responsive)
   =========================================================== */
function recalcBoardSize() {
    // Get available width from the container or viewport
    const container = document.querySelector('.container');
    const containerWidth = container ? container.clientWidth : window.innerWidth;

    // Account for body padding
    const bodyPadLeft = parseFloat(getComputedStyle(document.body).paddingLeft) || 0;
    const bodyPadRight = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    const availableWidth = Math.min(containerWidth, 820) - bodyPadLeft - bodyPadRight;

    // Calculate gap based on available width
    const gap = Math.max(2, Math.min(4, availableWidth * 0.006));

    // Width-based cell size: fit all columns in available width
    const cellSizeFromWidth = (availableWidth - (board.cols - 1) * gap) / board.cols;

    // Height-based cell size: fit board + all UI elements in viewport without scrolling
    const vh = window.innerHeight;
    // Overhead estimate: topBar(80px) + HUD(100px) + board margin(16px)
    //   + restartBtn(66px) + helpSection(40px) + body padding(40px) + safety margin
    const overheadEstimate = 350;
    const availableHeight = Math.max(100, vh - overheadEstimate);
    const cellSizeFromHeight = (availableHeight - (board.rows - 1) * gap) / board.rows;

    // Take the more restrictive dimension so board fits both horizontally and vertically
    const cellSize = Math.max(20, Math.min(56, Math.min(cellSizeFromWidth, cellSizeFromHeight)));

    // Set CSS custom properties on board element (overrides :root values)
    boardEl.style.setProperty('--cell-size', `${cellSize}px`);
    boardEl.style.setProperty('--cell-gap', `${gap}px`);
    boardEl.style.gap = `${gap}px`;
    boardEl.style.gridTemplateColumns = `repeat(${board.cols}, var(--cell-size))`;

    // Also adjust cell font-size proportionally
    const cellFontSize = Math.max(10, Math.min(22, cellSize * 0.38));
    boardEl.style.setProperty('--cell-font-size', `${cellFontSize}px`);
}

/* ===========================================================
   Board Drawing
   =========================================================== */
function drawBoard() {
    boardEl.innerHTML = '';

    // Calculate responsive sizing before creating cells
    recalcBoardSize();

    for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
            const cell = board.getCell(r, c);
            const div = document.createElement('div');
            div.className = 'cell';
            div.dataset.row = r;
            div.dataset.col = c;
            cell.element = div;
            boardEl.appendChild(div);

            // Left click
            div.addEventListener('click', () => {
                if (flagMode) {
                    handleFlagReveal(r, c);
                } else {
                    handleLeftClick(r, c);
                }
            });

            // Right click — disabled (no flagging via right-click)
            div.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });

            // Touch: tap to reveal (flag mode or normal), no long-press flagging
        }
    }

    renderAll(board);
    updateFlagCount();
    updateBombCount();
}

/* ===========================================================
   Window Resize Handler (debounced)
   =========================================================== */
let resizeTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (boardEl && boardEl.children.length > 0) {
            recalcBoardSize();
            renderAll(board);
        }
    }, 150);
});

/* ===========================================================
   Click Handlers
   =========================================================== */
function handleLeftClick(row, col) {
    if (gameOver || isExploding) return;
    const cell = board.getCell(row, col);
    if (!cell) return;
    if (cell.isRevealed) {
        // Chording: click on revealed number
        if (cell.number > 0) {
            const revealed = board.chordCell(row, col);
            if (revealed.length > 0) {
                audio.chord();
                // Score bonus for chording
                const chordBonus = revealed.filter(c => {
                    const ch = board.getCell(c.row, c.col);
                    return ch && ch.isRevealed && !ch.isBomb;
                }).length * 5;
                score += chordBonus;
                updateScore();
                // Check for bombs revealed by chording
                let hitBomb = false;
                for (const rc of revealed) {
                    const ch = board.getCell(rc.row, rc.col);
                    if (ch && ch.isBomb) {
                        hitBomb = true;
                        board.gameOver = true;
                        break;
                    }
                }
                if (hitBomb) {
                    // Show the bomb that was hit via chording
                    for (const rc of revealed) {
                        const ch = board.getCell(rc.row, rc.col);
                        if (ch && ch.isBomb) {
                            renderAll(board, revealed, rc.row, rc.col);
                            loseLife(rc.row, rc.col);
                            return;
                        }
                    }
                    loseLife(-1, -1);
                    return;
                }
                renderAll(board, revealed);
                checkWinCondition();
            } else {
                audio.error();
            }
        }
        return;
    }
    if (cell.isFlagged || cell.isQuestion) return;

    // First click - start timer & place bombs
    if (!gameStarted) {
        gameStarted = true;
        timer.start();
    }

    if (board.firstClick) {
        board.placeBombs(row, col);
        board.calculateNumbers();
        board.firstClick = false;
    }

    const result = board.revealCell(row, col);
    if (result.revealed.length === 0) return;

    // Score for revealed cells
    let revealedScore = 0;
    for (const rc of result.revealed) {
        const c = board.getCell(rc.row, rc.col);
        if (c && !c.isBomb && c.number > 0) {
            revealedScore += c.number;
        }
    }
    score += revealedScore;
    updateScore();

    if (result.isBomb) {
        audio.explode();
        // Show the bomb and lose a life
        renderAll(board, result.revealed, row, col);
        loseLife(row, col);
        return;
    }

    audio.click();
    renderAll(board, result.revealed);
    checkWinCondition();
}

/* ===========================================================
   Small Explosion (single bomb hit, not game over)
   =========================================================== */
function triggerSmallExplosion(row, col) {
    const cell = board.getCell(row, col);
    if (!cell || !cell.element) return;
    const el = cell.element;
    // Flash red briefly
    el.style.boxShadow = '0 0 30px rgba(239, 68, 68, 0.8), inset 0 0 20px rgba(239, 68, 68, 0.3)';
    el.style.borderColor = '#ef4444';
    setTimeout(() => {
        el.style.boxShadow = '';
        el.style.borderColor = '';
    }, 400);
}

/* ===========================================================
   Game End
   =========================================================== */
function loseLife(hitRow, hitCol) {
    // Decrement hearts
    hearts--;
    if (heartsDisplayEl) heartsDisplayEl.textContent = hearts;
    // Flash hearts red briefly
    if (heartsDisplayEl) {
        heartsDisplayEl.style.color = '#ef4444';
        setTimeout(() => {
            heartsDisplayEl.style.color = '';
        }, 300);
    }

    // Decrement bomb counter (this bomb has been "defused" and removed)
    board.bombsRevealed++;
    updateBombCount();

    // Trigger small explosion on the hit cell
    if (hitRow >= 0 && hitCol >= 0) {
        triggerSmallExplosion(hitRow, hitCol);
    }

    if (hearts <= 0) {
        // Full game over with all bombs revealed
        handleGameOver(hitRow, hitCol);
    }
    // ELSE: No board reset! The player continues playing with the bomb revealed
    // and one less heart. The revealed bomb cell stays visible.
    // The timer keeps running. The game continues as normal.
}

function handleGameOver(hitRow, hitCol) {
    gameOver = true;
    timer.stop();

    board.revealAllBombs();
    renderAll(board, [], hitRow, hitCol);

    audio.explode();
    saveHighScore();
    triggerExplosion();

    // Update stats
    stats.games++;
    stats.streak = 0;
    syncStatsToAuth();
    updateStatsUI();
}

function checkWinCondition() {
    if (board.checkWin()) {
        gameOver = true;
        timer.stop();

updateScore();

        saveHighScore();

        // Stats
        stats.games++;
        stats.wins++;
        stats.streak++;
        if (stats.streak > stats.bestStreak) {
            stats.bestStreak = stats.streak;
        }
        syncStatsToAuth();

// Mark level as completed (unlocks next level)
        Auth.completeLevel(currentDifficulty);

        // Refresh user data for level locking
        const updatedUser = await Auth.getCurrentUser();
        if (updatedUser) {
            // Update highScores in case they changed
            if (updatedUser.highScores) {
                currentUser.highScores = { ...updatedUser.highScores };
            }
        }

        updateStatsUI();
        applyLevelLocks();

        audio.win();
        triggerWinCelebration();
    }
}

/* ===========================================================
   Flag Mode Toggle — for mobile / button users
   =========================================================== */
function toggleFlagMode() {
    // If toggling ON but no charges remain, deny
    if (!flagMode && flagCharges <= 0) {
        audio.error();
        flagCountEl.classList.remove('flag-limit-flash');
        void flagCountEl.offsetWidth;
        flagCountEl.classList.add('flag-limit-flash');
        setTimeout(() => flagCountEl.classList.remove('flag-limit-flash'), 500);
        return;
    }

    flagMode = !flagMode;
    // Update toggle button UI
    if (flagToggleBtn) {
        flagToggleBtn.classList.toggle('active', flagMode);
    }
    // Visual feedback
    document.body.style.cursor = flagMode ? 'copy' : '';
    flagCountEl.style.opacity = flagMode ? '0.6' : '1';
    setTimeout(() => {
        flagCountEl.style.opacity = '1';
    }, 200);
}

/**
 * Flag reveal mode — each click consumes one flag charge to safely reveal a cell.
 * Bombs show as revealed but don't cost a life or affect bomb count.
 * Numbers appear but don't add to score.
 * Flagged cells are marked with 🚩 prefix to distinguish them.
 */
function handleFlagReveal(row, col) {
    if (gameOver || isExploding) return;
    const cell = board.getCell(row, col);
    if (!cell) return;
    if (cell.isRevealed || cell.isFlagged || cell.isQuestion) return;

    // Check if any flag charges remain
    if (flagCharges <= 0) {
        audio.error();
        // Auto-disable flag mode
        flagMode = false;
        if (flagToggleBtn) flagToggleBtn.classList.remove('active');
        document.body.style.cursor = '';
        return;
    }

    // Ensure timer started and board initialized
    if (!gameStarted) {
        gameStarted = true;
        timer.start();
    }
    if (board.firstClick) {
        board.placeBombs(row, col);
        board.calculateNumbers();
        board.firstClick = false;
    }

    // Consume one flag charge
    flagCharges--;
    updateFlagCount();

    // Reveal the cell via board logic
    const result = board.revealCell(row, col);
    if (result.revealed.length === 0) return;

    // Mark all revealed cells as flag-revealed
    for (const rc of result.revealed) {
        const c = board.getCell(rc.row, rc.col);
        if (c) c.isFlagRevealed = true;
    }

    // If it's a bomb — show it but don't lose life or decrement bomb count
    if (result.isBomb) {
        audio.explode();
        renderAll(board, result.revealed, row, col);
        // Do NOT call loseLife(), do NOT decrement hearts/bomb count
        // If charges depleted, auto-disable flag mode
        if (flagCharges <= 0) {
            flagMode = false;
            if (flagToggleBtn) flagToggleBtn.classList.remove('active');
            document.body.style.cursor = '';
        }
        return;
    }

    // Non-bomb: reveal normally but without scoring
    audio.click();
    renderAll(board, result.revealed);

    // If charges depleted, auto-disable flag mode
    if (flagCharges <= 0) {
        flagMode = false;
        if (flagToggleBtn) flagToggleBtn.classList.remove('active');
        document.body.style.cursor = '';
    }

    checkWinCondition();
}

/* ===========================================================
   Score & Flag UI
   =========================================================== */
function updateScore() {
    const displayScore = Math.round(score * board.difficultyMultiplier);
    scoreDisplayEl.textContent = displayScore;
    scoreDisplayEl.classList.remove('score-pop');
    void scoreDisplayEl.offsetWidth;
    scoreDisplayEl.classList.add('score-pop');
}

function updateFlagCount() {
    // Show remaining flag charges (how many flag-reveals remain)
    flagCountEl.textContent = Math.max(0, flagCharges);
}

function updateBombCount() {
    const remainingBombs = board.totalBombs - board.bombsRevealed;
    if (bombCountEl) bombCountEl.textContent = Math.max(0, remainingBombs);
}

/* ===========================================================
   Explosion Animation
   =========================================================== */
function triggerExplosion() {
    if (isExploding) return;
    isExploding = true;

    const overlay = document.createElement('div');
    overlay.className = 'explosion-overlay';

    const shockwave = document.createElement('div');
    shockwave.className = 'explosion-shockwave';
    overlay.appendChild(shockwave);

    const fireball = document.createElement('div');
    fireball.className = 'explosion-fireball';
    overlay.appendChild(fireball);

    const gameOverText = document.createElement('div');
    gameOverText.className = 'explosion-text';
    gameOverText.textContent = 'GAME OVER';
    overlay.appendChild(gameOverText);

    document.body.appendChild(overlay);
    document.body.classList.add('screen-shake');

    setTimeout(() => {
        document.body.classList.remove('screen-shake');
    }, 500);

    setTimeout(async () => {
        overlay.remove();
        isExploding = false;
        // Ask the user if they want to restart instead of automatically restarting
        const playAgain = await showConfirmModal('💥 Game Over! Would you like to play again?');
        if (playAgain) {
            resetGame();
        }
    }, 1800);
}

/* ===========================================================
   Win Celebration
   =========================================================== */
function triggerWinCelebration() {
    // Banner
    const banner = document.createElement('div');
    banner.className = 'win-banner';
    banner.innerHTML = `<h2>🎉 YOU WIN!</h2><p>Score: ${Math.round(score * board.difficultyMultiplier)}</p>`;
    document.body.appendChild(banner);

    // Confetti
    const container = document.createElement('div');
    container.className = 'win-container';
    document.body.appendChild(container);

    const confettiColors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#a78bfa', '#f472b6', '#34d399'];
    for (let i = 0; i < 80; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.top = `-10px`;
        piece.style.width = `${Math.random() * 8 + 4}px`;
        piece.style.height = `${Math.random() * 8 + 4}px`;
        piece.style.background = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.setProperty('--fall-duration', `${2 + Math.random() * 3}s`);
        piece.style.animationDelay = `${Math.random() * 1.5}s`;
        container.appendChild(piece);
    }

    // Gold coins
    for (let i = 0; i < 20; i++) {
        const coin = document.createElement('div');
        coin.className = 'coin-piece';
        coin.textContent = '🪙';
        coin.style.left = `${Math.random() * 100}%`;
        coin.style.top = `-20px`;
        coin.style.fontSize = `${14 + Math.random() * 14}px`;
        coin.style.setProperty('--fall-duration', `${3 + Math.random() * 3}s`);
        coin.style.animationDelay = `${Math.random() * 2}s`;
        container.appendChild(coin);
    }

    // Show next level prompt after a short delay
    const nextDiff = board.getNextDifficulty();
    const winModalDelay = setTimeout(() => {
        // Create a simple overlay for next level
        const nextOverlay = document.createElement('div');
        nextOverlay.className = 'modal-overlay';
        nextOverlay.style.display = 'flex';
        nextOverlay.style.zIndex = '10003';
        nextOverlay.id = 'winNextModal';

        const winContent = document.createElement('div');
        winContent.className = 'modal';
        winContent.style.textAlign = 'center';
        winContent.style.maxWidth = '400px';

        winContent.innerHTML = `
            <h2>🎉 You Win!</h2>
            <p style="font-size: 1.2em; margin: 16px 0; color: var(--text-secondary);">
                Score: ${Math.round(score * board.difficultyMultiplier)}
            </p>
            ${nextDiff ? `
                <p style="margin-bottom: 16px; color: var(--text-secondary);">
                    Ready for the next challenge?
                </p>
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <button class="modal-close" id="nextLevelBtn" style="background: linear-gradient(135deg, #10b981, #059669);">
                        ⬆️ Next Level (${nextDiff.charAt(0).toUpperCase() + nextDiff.slice(1)})
                    </button>
                    <button class="modal-close" id="replayLevelBtn" style="background: linear-gradient(135deg, var(--accent-blue), #2563eb);">
                        🔄 Replay ${currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}
                    </button>
                </div>
            ` : `
                <p style="margin-bottom: 16px; color: var(--accent-gold); font-weight: 700;">
                    🏆 You've conquered all levels! You're a Minesweeper Master!
                </p>
                <button class="modal-close" id="replayLevelBtn" style="background: linear-gradient(135deg, var(--accent-blue), #2563eb);">
                    🔄 Play Again
                </button>
            `}
        `;

        nextOverlay.appendChild(winContent);
        document.body.appendChild(nextOverlay);

        // Next level button
        const nextBtn = document.getElementById('nextLevelBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                nextOverlay.remove();
                banner.remove();
                container.remove();
                setDifficulty(nextDiff);
            });
        }

        // Replay button
        const replayBtn = document.getElementById('replayLevelBtn');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => {
                nextOverlay.remove();
                banner.remove();
                container.remove();
                resetGame();
            });
        }
    }, 1500);

    // Remove after animation if modal not interacted with
    setTimeout(() => {
        banner.remove();
        container.remove();
    }, 5000);
}

/* ===========================================================
   Reset
   =========================================================== */
function resetGame() {
    board = new Board(currentDifficulty);
    board.initialize();
    gameStarted = false;
    gameOver = false;
    hearts = board.hearts;
    if (heartsDisplayEl) heartsDisplayEl.textContent = hearts;
    score = 0;
    scoreDisplayEl.textContent = '0';
    // Set flag charges based on difficulty (e.g., equal to number of mines)
    flagCharges = board.bombs;
    if (flagMode) {
        flagMode = false;
        if (flagToggleBtn) flagToggleBtn.classList.remove('active');
        document.body.style.cursor = '';
    }
    timer.reset();
    drawBoard();
}

/* ===========================================================
   Difficulty
   =========================================================== */
function setDifficulty(diff) {
    if (isExploding) return;
    if (diff === currentDifficulty && board.grid.length > 0) return;

    currentDifficulty = diff;
    difficultyBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.diff === diff);
    });

    // Save current score as high score for previous difficulty
    saveHighScore();

    // Reload high score for new difficulty
    highScore = loadHighScore();
    highScoreDisplayEl.textContent = highScore;

    score = 0;
    scoreDisplayEl.textContent = '0';

    board = new Board(diff);
    board.initialize();
    hearts = board.hearts;
    if (heartsDisplayEl) heartsDisplayEl.textContent = hearts;
    // Set flag charges based on difficulty
    flagCharges = board.bombs;
    if (flagMode) {
        flagMode = false;
        if (flagToggleBtn) flagToggleBtn.classList.remove('active');
        document.body.style.cursor = '';
    }
    gameStarted = false;
    gameOver = false;
    timer.reset();
    drawBoard();
}

/* ===========================================================
   Keyboard Shortcuts
   =========================================================== */
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (key === 'r') {
        e.preventDefault();
        if (!isExploding) {
            saveHighScore();
            resetGame();
        }
    }

    if (key === 'f') {
        e.preventDefault();
        toggleFlagMode();
    }

    if (key === '1') setDifficulty('easy');
    if (key === '2' && Auth.isLevelUnlocked('medium')) setDifficulty('medium');
    if (key === '3' && Auth.isLevelUnlocked('hard')) setDifficulty('hard');

    if (key === '?') {
        e.preventDefault();
        toggleHelpModal();
    }

    if (key === 'escape') {
        helpModal.classList.remove('open');
    }
});

/* ===========================================================
   Help Modal
   =========================================================== */
function toggleHelpModal() {
    helpModal.classList.toggle('open');
}

helpBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', toggleHelpModal);
});
if (closeModalBtn) closeModalBtn.addEventListener('click', toggleHelpModal);
helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) toggleHelpModal();
});

/* ===========================================================
   Stats Toggle
   =========================================================== */
let statsOpen = false;
if (statsToggle) {
    statsToggle.addEventListener('click', () => {
        statsOpen = !statsOpen;
        statsPanel.classList.toggle('open', statsOpen);
        const arrow = statsToggle.querySelector('.number');
        if (arrow) arrow.textContent = statsOpen ? '▼' : '▶';
        updateStatsUI();
    });
}

/* ===========================================================
   Locked Level Info Modal
   =========================================================== */
function showLockedLevelModal(level) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '10004';
    overlay.style.animation = 'fadeIn 0.15s ease-out';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.textAlign = 'center';
    modal.style.maxWidth = '380px';

    const icon = document.createElement('div');
    icon.style.fontSize = '48px';
    icon.style.marginBottom = '12px';
    icon.textContent = '🔒';

    const title = document.createElement('h2');
    title.textContent = 'Level Locked';
    title.style.marginBottom = '12px';

    const msg = document.createElement('p');
    msg.style.color = 'var(--text-secondary)';
    msg.style.marginBottom = '20px';
    msg.style.fontSize = '1.1em';
    msg.style.lineHeight = '1.5';

    const previousLevel = level === 'medium' ? 'Easy' : 'Medium';
    msg.textContent = `You need to complete the ${previousLevel} level first before unlocking ${level.charAt(0).toUpperCase() + level.slice(1)}!`;

    const okBtn = document.createElement('button');
    okBtn.className = 'modal-close';
    okBtn.textContent = 'Got it! 💪';

    modal.appendChild(icon);
    modal.appendChild(title);
    modal.appendChild(msg);
    modal.appendChild(okBtn);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    okBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { close(); }
    }, { once: true });
    setTimeout(() => okBtn.focus(), 50);
}

/* ===========================================================
   Difficulty Buttons
   =========================================================== */
difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const diff = btn.dataset.diff;
        if (diff && diff === 'easy') {
            setDifficulty(diff);
        } else if (diff && Auth.isLevelUnlocked(diff)) {
            setDifficulty(diff);
        } else if (diff) {
            showLockedLevelModal(diff);
        }
    });
});

/* ===========================================================
   Restart Button
   =========================================================== */
restartBtn.addEventListener('click', () => {
    if (isExploding) return;
    saveHighScore();
    resetGame();
});

/* ===========================================================
   Flag Toggle Button
   =========================================================== */
if (flagToggleBtn) {
    flagToggleBtn.addEventListener('click', toggleFlagMode);
}

/* ===========================================================
   Particle Background
   =========================================================== */
function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;
    const particles = [];
    const PARTICLE_COUNT = 60;

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.size = Math.random() * 2.5 + 1;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3 - 0.1;
            this.opacity = Math.random() * 0.5 + 0.1;
            this.hue = Math.random() > 0.5 ? 45 : 210; // Gold or Blue
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 80%, 60%, ${this.opacity})`;
            ctx.fill();
            // Glow
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 80%, 60%, ${this.opacity * 0.15})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, w, h);
        for (const p of particles) {
            p.update();
            p.draw();
        }
        requestAnimationFrame(animate);
    }
animate();
}

/* ===========================================================
   Background Animated Symbols — floating game emojis
   =========================================================== */
function initBackgroundSymbols() {
    const symbols = [
        { emoji: '💣', cls: 'bomb', weight: 4 },
        { emoji: '❤️', cls: 'heart', weight: 3 },
        { emoji: '💎', cls: 'diamond', weight: 5 },
        { emoji: '👁️', cls: 'eye', weight: 3 },
        { emoji: '🏆', cls: 'trophy', weight: 2 },
        { emoji: '⛏️', cls: 'pickaxe', weight: 3 },
        { emoji: '🪙', cls: 'coin', weight: 4 },
    ];

    // Build weighted pool for random selection
    const pool = [];
    for (const sym of symbols) {
        for (let i = 0; i < sym.weight; i++) pool.push(sym);
    }

    function spawnSymbol() {
        const sym = pool[Math.floor(Math.random() * pool.length)];
        const el = document.createElement('div');
        el.className = 'bg-symbol ' + sym.cls;
        el.textContent = sym.emoji;

        // Random position across the full height of the viewport (bottom to mid-upper)
        const left = Math.random() * 95 + 2; // 2%–97%
        el.style.left = left + '%';
        el.style.bottom = (Math.random() * 60 + 10) + '%'; // 10%–70% up from bottom

        // Random size: medium to large (bigger symbols)
        const size = 24 + Math.random() * 36; // 24px–60px
        el.style.fontSize = size + 'px';

        // Random duration (slower for larger symbols)
        const baseDuration = 6 + Math.random() * 5; // 6s–11s
        const duration = baseDuration + (size - 24) * 0.06;
        el.style.setProperty('--sym-duration', duration + 's');

        // Random animation delay (stagger)
        el.style.animationDelay = (Math.random() * 2) + 's';

        document.body.appendChild(el);

        // Auto-remove after animation completes + buffer
        const removeMs = (duration + 2) * 1000;
        setTimeout(() => {
            if (el.parentNode) el.remove();
        }, removeMs);
    }

    // Spawn immediately and then on interval
    for (let i = 0; i < 3; i++) setTimeout(spawnSymbol, i * 400);
    setInterval(spawnSymbol, 500 + Math.random() * 400);
}

// Initialize visual effects
initParticles();
initBackgroundSymbols();

console.log('🚀 Minesweeper Ultimate — Ready!');
console.log('🎮 Shortcuts: R=Restart, F=FlagMode, 1/2/3=Difficulty, ?=Help');
