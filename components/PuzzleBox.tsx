"use client";
import React, { useState, useRef, useEffect } from "react";

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
};

const COLORS = {
  I: "url(#cI)",
  L: "url(#cL)",
  O: "url(#cO)",
  T: "url(#cT)",
  S: "url(#cS)",
  Z: "url(#cZ)",
  J: "url(#cJ)",
};

const FLAT_COLORS = {
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

function uniqueRandomTetrominos(n = 3): Piece[] {
  const keys = Object.keys(TETROMINOS) as TetrominoKey[];
  const shuffled = keys.sort(() => Math.random() - 0.5).slice(0, n);
  return shuffled.map((name) => ({
    shape: TETROMINOS[name].map((row) => [...row]),
    name,
    color: COLORS[name],
  }));
}

function emptyBoard(): (string | null)[][] {
  return Array.from({ length: BOX_ROWS }, () => Array(BOX_COLS).fill(null));
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function placeRandomTetrises(
  board: (string | null)[][],
  count: number
): (string | null)[][] {
  let newBoard = board.map((row) => [...row]);
  let placements = 0;
  let safety = 0;

  // Make game easy: fewer obstacles, never block the first row or column
  while (placements < count && safety < 200) {
    const piece = uniqueRandomTetrominos(1)[0];
    const shape = piece.shape;
    const positions: { x: number; y: number }[] = [];
    for (
      let y = 1;
      y <= BOX_ROWS - shape.length;
      y++ // start at y=1 for more open space
    )
      for (
        let x = 1;
        x <= BOX_COLS - shape[0].length;
        x++ // start at x=1
      )
        positions.push({ x, y });
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

const TOP_SCORE_KEY = "easy-tetris-top-score-v2";

export default function PuzzleBox() {
  const [block, setBlock] = useState(BLOCK_DESKTOP);
  const [hydrated, setHydrated] = useState(false);
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

  // HOVER PREVIEW LOGIC
  const [hover, setHover] = useState<{
    mouseX: number;
    mouseY: number;
    offsetX: number;
    offsetY: number;
    shape: number[][];
    color: string;
  } | null>(null);

  const boxRef = useRef<SVGSVGElement>(null);

  // Hydration: Only render after client is ready
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Responsive block size
  useEffect(() => {
    if (!hydrated) return;
    function handleResize() {
      setBlock(window.innerWidth < 600 ? BLOCK_MOBILE : BLOCK_DESKTOP);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [hydrated]);

  // Load top score from device storage
  useEffect(() => {
    if (!hydrated) return;
    let top = 0;
    try {
      const saved = localStorage.getItem(TOP_SCORE_KEY);
      if (saved && !isNaN(+saved)) top = +saved;
    } catch {}
    setTopScore(top);
  }, [hydrated]);

  // Randomize board ONLY on client after mount (hydrated)
  useEffect(() => {
    if (!hydrated) return;
    let initialBoard = emptyBoard();
    initialBoard = placeRandomTetrises(initialBoard, 2); // Only 2 obstacles for easy mode
    setBox(initialBoard);
    setPieces(uniqueRandomTetrominos(3));
    setScore(0);
    setGameOver(false);
  }, [hydrated]);

  // Save top score if game over and you beat it
  useEffect(() => {
    if (!hydrated) return;
    if (gameOver && score > topScore) {
      try {
        localStorage.setItem(TOP_SCORE_KEY, score.toString());
      } catch {}
      setTopScore(score);
    }
  }, [gameOver, score, topScore, hydrated]);

  // Piece refill and game over detection
  useEffect(() => {
    if (!hydrated || gameOver) return;
    if (pieces.length === 0) {
      const newPieces = uniqueRandomTetrominos(3);
      if (!anyPieceFits(box, newPieces)) {
        setGameOver(true);
      } else {
        setPieces(newPieces);
      }
    } else {
      if (!anyPieceFits(box, pieces)) setGameOver(true);
    }
  }, [pieces, box, hydrated, gameOver]);

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
      // Calculate drop
      const rect = boxRef.current.getBoundingClientRect();
      const pieceWidth = drag.shape[0].length;
      const pieceHeight = drag.shape.length;
      const px = Math.round(
        (drag.mouseX - rect.left - drag.offsetX) / block - pieceWidth / 2
      );
      const py = Math.round(
        (drag.mouseY - rect.top - drag.offsetY) / block - pieceHeight + 1
      );
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
      const pieceWidth = touchDrag.shape[0].length;
      const pieceHeight = touchDrag.shape.length;
      const rect = boxRef.current.getBoundingClientRect();
      const px = Math.round(
        (touchDrag.touchX - rect.left - touchDrag.offsetX) / block -
          pieceWidth / 2
      );
      const py = Math.round(
        (touchDrag.touchY - rect.top - touchDrag.offsetY) / block -
          pieceHeight +
          1
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
    setHover(null);
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
    setHover(null);
    e.preventDefault();
  }

  function resetGame() {
    let initialBoard = emptyBoard();
    initialBoard = placeRandomTetrises(initialBoard, 2);
    setBox(initialBoard);
    setPieces(uniqueRandomTetrominos(3));
    setScore(0);
    setGameOver(false);
  }

  // Hint logic: show faint previews at all valid drop locations for current piece
  function renderHints(piece: Piece) {
    const hints = [];
    for (let py = 0; py <= BOX_ROWS - piece.shape.length; ++py) {
      for (let px = 0; px <= BOX_COLS - piece.shape[0].length; ++px) {
        if (canPlace(box, piece.shape, px, py)) {
          for (let yy = 0; yy < piece.shape.length; ++yy) {
            for (let xx = 0; xx < piece.shape[0].length; ++xx) {
              if (piece.shape[yy][xx]) {
                hints.push(
                  <rect
                    key={`hint-${piece.name}-${px}-${py}-${xx}-${yy}`}
                    x={(px + xx) * block}
                    y={(py + yy) * block}
                    width={block}
                    height={block}
                    fill={piece.color}
                    fillOpacity={0.11}
                    stroke="none"
                    rx={10}
                    ry={10}
                    pointerEvents="none"
                  />
                );
              }
            }
          }
        }
      }
    }
    return hints;
  }

  if (!hydrated) return null;
  const isMobile =
    typeof window !== "undefined" ? window.innerWidth < 600 : false;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#313e5a 0%,#1a1a2f 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: isMobile ? 4 : 16,
      }}
    >
      <div
        style={{
          background: "rgba(19,27,46,0.96)",
          borderRadius: 28,
          padding: isMobile ? 8 : "38px 38px 32px 38px",
          boxShadow:
            "0 8px 32px #000b,0 0 0 4px #fff176,0 0 0 16px #222b3b,0 0 64px 0 #fff17670",
          border: "4px solid #fff176",
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
            textShadow: "0 2px 18px #fff17680, 0 2px 10px #000a",
            fontSize: 32,
          }}
        >
          CHRISTELLE BOX PRO
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
              fontWeight: 400,
              fontSize: 22,
              textAlign: "center",
              filter: "drop-shadow(0 2px 8px #fff17677)",
            }}
          >
            <b>Score:</b>{" "}
            <span style={{ color: "#fff176", fontWeight: 700 }}>{score}</span>
          </div>
          <div
            style={{
              color: "#fff",
              fontWeight: 400,
              fontSize: 22,
              textAlign: "center",
              filter: "drop-shadow(0 2px 8px #fff17677)",
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
            marginBottom: 14,
            fontWeight: 300,
            fontSize: 18,
            textAlign: "center",
            textShadow: "0 1px 12px #000a",
          }}
        >
          Easy game: 3 unique tetris blocks. Drag or tap to play! <br />
          <span style={{ color: "#fff176", fontWeight: 500 }}>
            All valid drop spots are hinted.
          </span>
        </p>
        <div
          style={{
            background: "#232b46",
            border: "4px solid #fff176",
            borderRadius: 24,
            padding: 4,
            boxShadow: "0 4px 32px #000b",
            margin: "0 auto",
            width: BOX_COLS * block + 16,
            maxWidth: "100vw",
            touchAction: "none",
            position: "relative",
          }}
        >
          <svg
            ref={boxRef}
            width={BOX_COLS * block}
            height={BOX_ROWS * block}
            style={{
              background: "linear-gradient(160deg,#1a223a 70%,#222b3b 100%)",
              borderRadius: 18,
              boxShadow: "0 2px 24px #000c,0 0 12px #fff17660",
              touchAction: "none",
              display: "block",
              width: "100%",
              maxWidth: "100vw",
            }}
            onMouseMove={(e) => {
              if (drag || touchDrag || gameOver || pieces.length === 0) {
                setHover(null);
                return;
              }
              if (!boxRef.current) return;
              const rect = boxRef.current.getBoundingClientRect();
              const mouseX = e.clientX;
              const mouseY = e.clientY;
              setHover({
                mouseX,
                mouseY,
                offsetX: 0,
                offsetY: 0,
                shape: pieces[0].shape,
                color: pieces[0].color,
              });
            }}
            onMouseLeave={() => setHover(null)}
          >
            {/* SVG gradients for pro look */}
            <defs>
              <linearGradient id="cI" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#00bcd4" />
                <stop offset="100%" stopColor="#1de9b6" />
              </linearGradient>
              <linearGradient id="cL" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#ff9800" />
                <stop offset="100%" stopColor="#ffeb3b" />
              </linearGradient>
              <linearGradient id="cO" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#fff176" />
                <stop offset="100%" stopColor="#ffe082" />
              </linearGradient>
              <linearGradient id="cT" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#ba68c8" />
                <stop offset="100%" stopColor="#e040fb" />
              </linearGradient>
              <linearGradient id="cS" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#66bb6a" />
                <stop offset="100%" stopColor="#b2ff59" />
              </linearGradient>
              <linearGradient id="cZ" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#ef5350" />
                <stop offset="100%" stopColor="#ff1744" />
              </linearGradient>
              <linearGradient id="cJ" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#1976d2" />
                <stop offset="100%" stopColor="#00b0ff" />
              </linearGradient>
            </defs>

            {/* Board cells */}
            {box.map((row, y) =>
              row.map((cell, x) => (
                <rect
                  key={x + "," + y}
                  x={x * block}
                  y={y * block}
                  width={block}
                  height={block}
                  fill={cell || "#232b46"}
                  stroke="#fffec1"
                  strokeWidth={cell ? 2.2 : 1}
                  rx={10}
                  ry={10}
                  style={{
                    filter: cell ? "drop-shadow(0 0 6px #fff17699)" : undefined,
                    transition: "fill .18s",
                  }}
                />
              ))
            )}

            {/* Hints for all valid positions for current piece */}
            {!drag && !touchDrag && !gameOver && pieces.length > 0
              ? renderHints(pieces[0])
              : null}

            {/* Drag/touch/hover preview, always above cursor/finger, bottom center */}
            {(drag || touchDrag || hover) &&
              boxRef.current &&
              (() => {
                const preview = drag || touchDrag || hover;
                const rect = boxRef.current.getBoundingClientRect();
                if (!rect) return null;
                const pieceWidth = preview.shape[0].length;
                const pieceHeight = preview.shape.length;
                const mouseX =
                  drag?.mouseX || touchDrag?.touchX || hover?.mouseX;
                const mouseY =
                  drag?.mouseY || touchDrag?.touchY || hover?.mouseY;
                const offsetX =
                  drag?.offsetX || touchDrag?.offsetX || hover?.offsetX || 0;
                const offsetY =
                  drag?.offsetY || touchDrag?.offsetY || hover?.offsetY || 0;

                // Bottom center: X is cursor - half tetromino width, Y is cursor - piece height + 1
                const px = Math.round(
                  (mouseX - rect.left - offsetX) / block - pieceWidth / 2
                );
                const py = Math.round(
                  (mouseY - rect.top - offsetY) / block - pieceHeight + 1
                );

                return preview.shape.map((row, yy) =>
                  row.map((val, xx) =>
                    val ? (
                      <rect
                        key={`preview-${xx},${yy}`}
                        x={(px + xx) * block}
                        y={(py + yy) * block}
                        width={block}
                        height={block}
                        fill={preview.color}
                        fillOpacity={
                          canPlace(box, preview.shape, px, py)
                            ? drag
                              ? 0.72
                              : touchDrag
                                ? 0.72
                                : 0.48
                            : drag
                              ? 0.28
                              : touchDrag
                                ? 0.28
                                : 0.12
                        }
                        stroke="#fff"
                        strokeDasharray={drag || touchDrag ? "4 3" : "2 2"}
                        strokeWidth={drag || touchDrag ? 2 : 1.2}
                        rx={10}
                        ry={10}
                        pointerEvents="none"
                        style={{
                          filter:
                            drag || touchDrag
                              ? "drop-shadow(0 0 10px #fff176cc)"
                              : "drop-shadow(0 0 6px #fff17699)",
                          transition: "fill-opacity .18s",
                        }}
                      />
                    ) : null
                  )
                );
              })()}
          </svg>
        </div>
        {/* PIECES at bottom for phone */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: isMobile ? 10 : 32,
            alignItems: "center",
            userSelect: "none",
            background: "#181c30",
            borderRadius: 18,
            border: "2.5px solid #fffbe9",
            padding: isMobile ? "10px 5px" : "18px 10px",
            boxShadow: "0 2px 14px #0009,0 0 10px #fff17644",
            margin: "18px auto 0 auto",
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
                border: `3.5px solid #fff176`,
                borderRadius: 16,
                cursor: gameOver ? "not-allowed" : drag ? "grabbing" : "grab",
                opacity:
                  (drag && drag.index === i) ||
                  (touchDrag && touchDrag.dragIndex === i)
                    ? 0.18
                    : 1,
                transition: "opacity .2s",
                boxShadow: "0 1px 12px #000a,0 0 10px #fff17677",
                touchAction: "none",
                maxWidth: "80vw",
                filter:
                  drag && drag.index === i
                    ? "blur(2px)"
                    : "drop-shadow(0 0 8px #fff17677)",
              }}
              onMouseDown={(e) => onPieceMouseDown(e, i)}
              onTouchStart={(e) => onPieceTouchStart(e, i)}
            >
              {/* Use gradients for pro look */}
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
                        fill={COLORS[p.name]}
                        stroke="#fff"
                        strokeWidth={2.2}
                        rx={10}
                        ry={10}
                        style={{
                          filter: "drop-shadow(0 0 6px #fff17699)",
                          transition: "fill .18s",
                        }}
                      />
                    )
                )
              )}
            </svg>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 30 }}>
          {gameOver ? (
            <div>
              <div
                style={{
                  color: "#ef5350",
                  fontWeight: 700,
                  fontSize: 32,
                  marginBottom: 18,
                  textShadow: "0 2px 18px #ff174480,0 2px 12px #000a",
                  letterSpacing: 2,
                }}
              >
                Game Over!
              </div>
              <button
                style={{
                  fontSize: 26,
                  background: "linear-gradient(80deg,#fff176 60%,#ffe082 100%)",
                  color: "#222",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 38px",
                  boxShadow: "0 2px 14px #000a,0 0 16px #fff176a0",
                  letterSpacing: 1,
                  transition: "background .18s",
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
            marginTop: 22,
            color: "#fff9",
            fontSize: 17,
            textAlign: "center",
            textShadow: "0 1px 10px #0008",
            filter: "drop-shadow(0 1px 8px #fff17644)",
          }}
        >
          <b>Tip:</b> 3 unique tetris blocks at the start. Top score saved
          offline.
          <br />
          <span style={{ color: "#fff176" }}>
            Drag, tap, or use hints for easy play!
          </span>
        </div>
      </div>
    </div>
  );
}
