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
  const [hydrated, setHydrated] = useState(false);
  const [block, setBlock] = useState(BLOCK_DESKTOP);
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
    initialBoard = placeRandomTetrises(initialBoard, 3); // 3 random tetris blocks at start
    setBox(initialBoard);
    setPieces(Array.from({ length: 3 }, () => randomTetromino()));
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

  useEffect(() => {
    if (!hydrated || gameOver) return;
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

  if (!hydrated) return <div />;

  const isMobile =
    typeof window !== "undefined" ? window.innerWidth < 600 : false;

  // ...the rest of your rendering code is unchanged, as in previous examples...

  // (For brevity, you can copy the rest of the render from the previous message)

  // --- [ paste the render code here as above ] ---
  // (the return JSX is unchanged; omitted for brevity)
  // -----------------------------------------------

  // For this answer, please refer to the previous long code block for the full return JSX.
}
