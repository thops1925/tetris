"use client";
import React, { useState, useRef, useEffect } from "react";

// 8x8 grid, classic Tetris blocks only, easy mode, persistent top score!
const BOX_COLS = 8;
const BOX_ROWS = 8;
const BLOCK_MOBILE = 40;
const BLOCK_DESKTOP = 52;

const TETROMINOS = {
  I: [[1, 1, 1, 1]],
  L: [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [0, 1],
    [0, 1],
    [1, 1],
  ],
} as const;

const COLORS = {
  I: "#00bcd4",
  L: "#ff9800",
  O: "#fff176",
  T: "#ba68c8",
  S: "#66bb6a",
  Z: "#ef5350",
  J: "#1976d2",
};

type TetrominoKey = keyof typeof TETROMINOS;
type Piece = {
  shape: number[][];
  name: TetrominoKey;
  color: string;
};

function randomTetromino(): Piece {
  const keys = Object.keys(TETROMINOS) as TetrominoKey[];
  const name = keys[Math.floor(Math.random() * keys.length)];
  return { shape: TETROMINOS[name], name, color: COLORS[name] };
}

function emptyBoard(): (string | null)[][] {
  return Array.from({ length: BOX_ROWS }, () => Array(BOX_COLS).fill(null));
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Only call this in useEffect/client
function placeRandomTetrises(
  board: (string | null)[][],
  count: number
): (string | null)[][] {
  let newBoard = board.map((row) => [...row]);
  let placements = 0;
  let safety = 0;
  while (placements < count && safety < 200) {
    const piece = randomTetromino();
    const shape = piece.shape;
    const positions: { x: number; y: number }[] = [];
    for (let y = 0; y <= BOX_ROWS - shape.length; y++)
      for (let x = 0; x <= BOX_COLS - shape[0].length; x++)
        positions.push({ x, y });
    // Shuffle positions for randomness
    for (let i = positions.length - 1; i > 0; i--) {
      const j = getRandomInt(0, i);
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    let placed = false;
    for (const pos of positions) {
      let canPlace = true;
      for (let yy = 0; yy < shape.length; ++yy)
        for (let xx = 0; xx < shape[0].length; ++xx)
          if (shape[yy][xx] && newBoard[pos.y + yy][pos.x + xx])
            canPlace = false;
      if (canPlace) {
        for (let yy = 0; yy < shape.length; ++yy)
          for (let xx = 0; xx < shape[0].length; ++xx)
            if (shape[yy][xx]) newBoard[pos.y + yy][pos.x + xx] = piece.color;
        placements++;
        placed = true;
        break;
      }
    }
    safety++;
    if (!placed) break;
  }
  return newBoard;
}

function canPlace(
  board: (string | null)[][],
  shape: number[][],
  px: number,
  py: number
) {
  for (let y = 0; y < shape.length; ++y)
    for (let x = 0; x < shape[0].length; ++x)
      if (shape[y][x]) {
        if (
          py + y < 0 ||
          py + y >= BOX_ROWS ||
          px + x < 0 ||
          px + x >= BOX_COLS
        )
          return false;
        if (board[py + y][px + x]) return false;
      }
  return true;
}

function getFilledRows(board: (string | null)[][]): number[] {
  let lines: number[] = [];
  for (let y = 0; y < BOX_ROWS; ++y) {
    if (board[y].every((cell) => !!cell)) lines.push(y);
  }
  return lines;
}
function getFilledCols(board: (string | null)[][]): number[] {
  let cols: number[] = [];
  for (let x = 0; x < BOX_COLS; ++x) {
    let filled = true;
    for (let y = 0; y < BOX_ROWS; ++y) {
      if (!board[y][x]) {
        filled = false;
        break;
      }
    }
    if (filled) cols.push(x);
  }
  return cols;
}

function clearLinesAndCols(board: (string | null)[][]): {
  newBoard: (string | null)[][];
  cleared: number;
} {
  const filledRows = getFilledRows(board);
  const filledCols = getFilledCols(board);

  if (filledRows.length === 0 && filledCols.length === 0)
    return { newBoard: board, cleared: 0 };

  let newBoard = board.map((row) => [...row]);
  for (const y of filledRows) {
    for (let x = 0; x < BOX_COLS; ++x) {
      newBoard[y][x] = null;
    }
  }
  for (const x of filledCols) {
    for (let y = 0; y < BOX_ROWS; ++y) {
      newBoard[y][x] = null;
    }
  }
  return { newBoard, cleared: filledRows.length + filledCols.length };
}

function tetrisScore(lines: number): number {
  if (lines <= 0) return 0;
  if (lines === 1) return 10;
  if (lines === 2) return 30;
  if (lines === 3) return 80;
  if (lines === 4) return 200;
  return 200 + (lines - 4) * 200;
}

function anyPieceFits(board: (string | null)[][], pieces: Piece[]): boolean {
  for (const piece of pieces) {
    for (let y = 0; y <= BOX_ROWS - piece.shape.length; ++y) {
      for (let x = 0; x <= BOX_COLS - piece.shape[0].length; ++x) {
        if (canPlace(board, piece.shape, x, y)) return true;
      }
    }
  }
  return false;
}

// Touch helpers
type TouchState = {
  dragging: boolean;
  dragIndex: number;
  offsetX: number;
  offsetY: number;
  touchX: number;
  touchY: number;
  shape: number[][];
  color: string;
} | null;

const TOP_SCORE_KEY = "easy-tetris-top-score-v1";

export default function PuzzleBox() {
  // Only read window size on client
  const [block, setBlock] = useState(BLOCK_DESKTOP);
  useEffect(() => {
    function handleResize() {
      setBlock(window.innerWidth < 600 ? BLOCK_MOBILE : BLOCK_DESKTOP);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [mounted, setMounted] = useState(false);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [box, setBox] = useState<(string | null)[][]>(emptyBoard());
  const [score, setScore] = useState(0);
  const [topScore, setTopScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const [drag, setDrag] = useState<{
    index: number;
    offsetX: number;
    offsetY: number;
    mouseX: number;
    mouseY: number;
    shape: number[][];
    color: string;
  } | null>(null);

  const [touchDrag, setTouchDrag] = useState<TouchState>(null);
  const boxRef = useRef<SVGSVGElement>(null);

  // Load top score from device storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      let top = 0;
      try {
        const saved = localStorage.getItem(TOP_SCORE_KEY);
        if (saved && !isNaN(+saved)) top = +saved;
      } catch {}
      setTopScore(top);
    }
  }, []);

  // Hydration-SAFE: randomize board ONLY on client after mount!
  useEffect(() => {
    if (mounted) {
      let initialBoard = emptyBoard();
      initialBoard = placeRandomTetrises(initialBoard, 3); // 3 random tetris blocks at start
      setBox(initialBoard);
      setPieces(Array.from({ length: 3 }, () => randomTetromino()));
      setScore(0);
      setGameOver(false);
    }
    // eslint-disable-next-line
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Save top score if game over and you beat it
  useEffect(() => {
    if (gameOver && score > topScore && typeof window !== "undefined") {
      try {
        localStorage.setItem(TOP_SCORE_KEY, score.toString());
      } catch {}
      setTopScore(score);
    }
  }, [gameOver, score, topScore]);

  useEffect(() => {
    if (!mounted || gameOver) return;
    if (pieces.length === 0) {
      const newPieces = Array.from({ length: 3 }, () => randomTetromino());
      if (!anyPieceFits(box, newPieces)) {
        setGameOver(true);
      } else {
        setPieces(newPieces);
      }
    } else {
      if (!anyPieceFits(box, pieces)) setGameOver(true);
    }
  }, [pieces, box, mounted, gameOver]);

  // Mouse drag logic
  useEffect(() => {
    if (!drag) return;
    function onMouseMove(e: MouseEvent) {
      setDrag(
        (prev) =>
          prev && {
            ...prev,
            mouseX: e.clientX,
            mouseY: e.clientY,
          }
      );
    }
    function onMouseUp() {
      if (!boxRef.current || !drag) {
        setDrag(null);
        return;
      }
      const rect = boxRef.current.getBoundingClientRect();
      const px = Math.round((drag.mouseX - rect.left - drag.offsetX) / block);
      const py = Math.round((drag.mouseY - rect.top - drag.offsetY) / block);
      if (canPlace(box, drag.shape, px, py)) {
        const placedBox = box.map((row) => row.slice());
        drag.shape.forEach((row, y) =>
          row.forEach((val, x) => {
            if (
              val &&
              py + y >= 0 &&
              py + y < BOX_ROWS &&
              px + x >= 0 &&
              px + x < BOX_COLS
            ) {
              placedBox[py + y][px + x] = drag.color;
            }
          })
        );
        const { newBoard, cleared } = clearLinesAndCols(placedBox);
        setBox(newBoard);
        setScore((s) => s + tetrisScore(cleared));
        setPieces((ps) => ps.filter((_, i) => i !== drag.index));
      }
      setDrag(null);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [drag, box, block]);

  // Touch drag logic
  useEffect(() => {
    if (!touchDrag) return;
    function onTouchMove(e: TouchEvent) {
      if (!e.touches[0]) return;
      setTouchDrag(
        (prev) =>
          prev && {
            ...prev,
            touchX: e.touches[0].clientX,
            touchY: e.touches[0].clientY,
          }
      );
    }
    function onTouchEnd() {
      if (!boxRef.current || !touchDrag) {
        setTouchDrag(null);
        return;
      }
      const rect = boxRef.current.getBoundingClientRect();
      const px = Math.round(
        (touchDrag.touchX - rect.left - touchDrag.offsetX) / block
      );
      const py = Math.round(
        (touchDrag.touchY - rect.top - touchDrag.offsetY) / block
      );
      if (canPlace(box, touchDrag.shape, px, py)) {
        const placedBox = box.map((row) => row.slice());
        touchDrag.shape.forEach((row, y) =>
          row.forEach((val, x) => {
            if (
              val &&
              py + y >= 0 &&
              py + y < BOX_ROWS &&
              px + x >= 0 &&
              px + x < BOX_COLS
            ) {
              placedBox[py + y][px + x] = touchDrag.color;
            }
          })
        );
        const { newBoard, cleared } = clearLinesAndCols(placedBox);
        setBox(newBoard);
        setScore((s) => s + tetrisScore(cleared));
        setPieces((ps) => ps.filter((_, i) => i !== touchDrag.dragIndex));
      }
      setTouchDrag(null);
    }
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [touchDrag, box, block]);

  function onPieceMouseDown(e: React.MouseEvent, i: number) {
    if (gameOver) return;
    const rect = (e.target as SVGElement)
      .closest("svg")!
      .getBoundingClientRect();
    setDrag({
      index: i,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      mouseX: e.clientX,
      mouseY: e.clientY,
      shape: pieces[i].shape,
      color: pieces[i].color,
    });
    e.preventDefault();
  }

  function onPieceTouchStart(e: React.TouchEvent, i: number) {
    if (gameOver) return;
    const touch = e.touches[0];
    const rect = (e.target as SVGElement)
      .closest("svg")!
      .getBoundingClientRect();
    setTouchDrag({
      dragging: true,
      dragIndex: i,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
      touchX: touch.clientX,
      touchY: touch.clientY,
      shape: pieces[i].shape,
      color: pieces[i].color,
    });
    e.preventDefault();
  }

  function resetGame() {
    let initialBoard = emptyBoard();
    initialBoard = placeRandomTetrises(initialBoard, 3);
    setBox(initialBoard);
    setPieces(Array.from({ length: 3 }, () => randomTetromino()));
    setScore(0);
    setGameOver(false);
  }

  if (!mounted) return null;
  const isMobile =
    typeof window !== "undefined" ? window.innerWidth < 600 : false;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#3a415a 0%,#1a1a2f 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: isMobile ? 4 : 16,
      }}
    >
      <div
        style={{
          background: "#131b2e",
          borderRadius: 20,
          padding: isMobile ? 8 : "36px 36px 30px 36px",
          boxShadow: "0 8px 32px #000b, 0 0 0 3px #fff176, 0 0 0 10px #222b3b",
          border: "3px solid #fff176",
          minWidth: isMobile ? 0 : 300,
          maxWidth: "99vw",
        }}
      >
        <h1
          style={{
            color: "#fff176",
            letterSpacing: 2,
            marginBottom: 8,
            fontWeight: 800,
            textAlign: "center",
            textShadow: "0 2px 10px #000a",
          }}
        >
          PUZZLE BOX
        </h1>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 18,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              color: "#fff",
              fontWeight: 300,
              fontSize: 20,
              textAlign: "center",
            }}
          >
            <b>Score:</b>{" "}
            <span style={{ color: "#fff176", fontWeight: 700 }}>{score}</span>
          </div>
          <div
            style={{
              color: "#fff",
              fontWeight: 300,
              fontSize: 20,
              textAlign: "center",
            }}
          >
            <b>Top:</b>{" "}
            <span style={{ color: "#fff176", fontWeight: 700 }}>
              {topScore}
            </span>
          </div>
        </div>
        <p
          style={{
            color: "#fff",
            marginBottom: 18,
            fontWeight: 300,
            fontSize: 18,
            textAlign: "center",
          }}
        >
          Easy game: 3 random tetris blocks at the start. Tap and drag to play!
        </p>
        <div
          style={{
            background: "#202b43",
            border: "4px solid #fff176",
            borderRadius: 16,
            padding: 4,
            boxShadow: "0 4px 20px #0006",
            margin: "0 auto",
            width: BOX_COLS * block + 12,
            maxWidth: "100vw",
            touchAction: "none",
          }}
        >
          <svg
            ref={boxRef}
            width={BOX_COLS * block}
            height={BOX_ROWS * block}
            style={{
              background: "#1a223a",
              borderRadius: 12,
              boxShadow: "0 2px 16px #000a",
              touchAction: "none",
              display: "block",
              width: "100%",
              maxWidth: "100vw",
            }}
          >
            {box.map((row, y) =>
              row.map((cell, x) => (
                <rect
                  key={x + "," + y}
                  x={x * block}
                  y={y * block}
                  width={block}
                  height={block}
                  fill={cell || "#222b3b"}
                  stroke="#fffec1"
                  strokeWidth={cell ? 2.2 : 1}
                  rx={10}
                  ry={10}
                />
              ))
            )}
            {/* Mouse Drag preview */}
            {drag &&
              boxRef.current &&
              drag.shape.map((row, yy) =>
                row.map(
                  (val, xx) =>
                    val && (
                      <rect
                        key={"drag-" + xx + "," + yy}
                        x={
                          Math.round(
                            (drag.mouseX -
                              boxRef.current.getBoundingClientRect().left -
                              drag.offsetX) /
                              block
                          ) *
                            block +
                          xx * block
                        }
                        y={
                          Math.round(
                            (drag.mouseY -
                              boxRef.current.getBoundingClientRect().top -
                              drag.offsetY) /
                              block
                          ) *
                            block +
                          yy * block
                        }
                        width={block}
                        height={block}
                        fill={drag.color}
                        fillOpacity={
                          canPlace(
                            box,
                            drag.shape,
                            Math.round(
                              (drag.mouseX -
                                boxRef.current.getBoundingClientRect().left -
                                drag.offsetX) /
                                block
                            ),
                            Math.round(
                              (drag.mouseY -
                                boxRef.current.getBoundingClientRect().top -
                                drag.offsetY) /
                                block
                            )
                          )
                            ? 0.7
                            : 0.28
                        }
                        stroke="#fff"
                        strokeDasharray="4 3"
                        strokeWidth={2}
                        rx={10}
                        ry={10}
                        pointerEvents="none"
                      />
                    )
                )
              )}
            {/* Touch Drag preview */}
            {touchDrag &&
              boxRef.current &&
              touchDrag.shape.map((row, yy) =>
                row.map(
                  (val, xx) =>
                    val && (
                      <rect
                        key={"tdrag-" + xx + "," + yy}
                        x={
                          Math.round(
                            (touchDrag.touchX -
                              boxRef.current.getBoundingClientRect().left -
                              touchDrag.offsetX) /
                              block
                          ) *
                            block +
                          xx * block
                        }
                        y={
                          Math.round(
                            (touchDrag.touchY -
                              boxRef.current.getBoundingClientRect().top -
                              touchDrag.offsetY) /
                              block
                          ) *
                            block +
                          yy * block
                        }
                        width={block}
                        height={block}
                        fill={touchDrag.color}
                        fillOpacity={
                          canPlace(
                            box,
                            touchDrag.shape,
                            Math.round(
                              (touchDrag.touchX -
                                boxRef.current.getBoundingClientRect().left -
                                touchDrag.offsetX) /
                                block
                            ),
                            Math.round(
                              (touchDrag.touchY -
                                boxRef.current.getBoundingClientRect().top -
                                touchDrag.offsetY) /
                                block
                            )
                          )
                            ? 0.7
                            : 0.28
                        }
                        stroke="#fff"
                        strokeDasharray="4 3"
                        strokeWidth={2}
                        rx={10}
                        ry={10}
                        pointerEvents="none"
                      />
                    )
                )
              )}
          </svg>
        </div>
        {/* PIECES at bottom for phone */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: isMobile ? 6 : 28,
            alignItems: "center",
            userSelect: "none",
            background: "#181c30",
            borderRadius: 12,
            border: "2px solid #fffbe9",
            padding: isMobile ? "8px 3px" : "16px 8px",
            boxShadow: "0 2px 12px #0007",
            margin: "14px auto 0 auto",
            justifyContent: "center",
            width: "100%",
            maxWidth: "100vw",
          }}
        >
          {pieces.map((p, i) => (
            <svg
              key={i}
              width={p.shape[0].length * block}
              height={p.shape.length * block}
              style={{
                background: "#222b3b",
                border: `3px solid #fff176`,
                borderRadius: 10,
                cursor: gameOver ? "not-allowed" : drag ? "grabbing" : "grab",
                opacity:
                  (drag && drag.index === i) ||
                  (touchDrag && touchDrag.dragIndex === i)
                    ? 0.18
                    : 1,
                transition: "opacity .2s",
                boxShadow: "0 1px 8px #0008",
                touchAction: "none",
                maxWidth: "80vw",
              }}
              onMouseDown={(e) => onPieceMouseDown(e, i)}
              onTouchStart={(e) => onPieceTouchStart(e, i)}
              draggable={false}
            >
              {p.shape.map((row, y) =>
                row.map(
                  (val, x) =>
                    val && (
                      <rect
                        key={x + "," + y}
                        x={x * block}
                        y={y * block}
                        width={block}
                        height={block}
                        fill={p.color}
                        stroke="#fff"
                        strokeWidth={2}
                        rx={10}
                        ry={10}
                      />
                    )
                )
              )}
            </svg>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          {gameOver ? (
            <div>
              <div
                style={{
                  color: "#ef5350",
                  fontWeight: 700,
                  fontSize: 28,
                  marginBottom: 16,
                  textShadow: "0 2px 12px #000a",
                }}
              >
                Game Over!
              </div>
              <button
                style={{
                  fontSize: 24,
                  background: "#fff176",
                  color: "#222",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 34px",
                  boxShadow: "0 2px 14px #000a",
                }}
                onClick={resetGame}
              >
                Play Again
              </button>
            </div>
          ) : null}
        </div>
        <div
          style={{
            marginTop: 18,
            color: "#fff9",
            fontSize: 15,
            textAlign: "center",
          }}
        >
          <b>Tip:</b> 3 random tetris blocks at the start. Top score saved
          offline.
        </div>
      </div>
    </div>
  );
}
