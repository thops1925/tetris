"use client";
import React, { useState, useRef } from "react";

// --- Constants ---
const BOX_COLS = 8;
const BOX_ROWS = 8;
const BLOCK = 44;

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

export default function PuzzleBox() {
  // Initialize only on the client to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => setMounted(true), []);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [box, setBox] = useState<(string | null)[][]>(emptyBoard());
  const [drag, setDrag] = useState<{
    index: number;
    offsetX: number;
    offsetY: number;
    mouseX: number;
    mouseY: number;
    shape: number[][];
    color: string;
  } | null>(null);
  const boxRef = useRef<SVGSVGElement>(null);

  // On first client render, set random pieces
  React.useEffect(() => {
    if (!mounted) return;
    setPieces(Array.from({ length: 3 }, () => randomTetromino()));
    setBox(emptyBoard());
  }, [mounted]);

  // Mouse events for drag and drop
  React.useEffect(() => {
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
    function onMouseUp(e: MouseEvent) {
      if (!boxRef.current || !drag) {
        setDrag(null);
        return;
      }
      const rect = boxRef.current.getBoundingClientRect();
      const px = Math.round((drag.mouseX - rect.left - drag.offsetX) / BLOCK);
      const py = Math.round((drag.mouseY - rect.top - drag.offsetY) / BLOCK);
      if (canPlace(box, drag.shape, px, py)) {
        // Place piece
        const newBox = box.map((row) => row.slice());
        drag.shape.forEach((row, y) =>
          row.forEach((val, x) => {
            if (
              val &&
              py + y >= 0 &&
              py + y < BOX_ROWS &&
              px + x >= 0 &&
              px + x < BOX_COLS
            ) {
              newBox[py + y][px + x] = drag.color;
            }
          })
        );
        setBox(newBox);
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
  }, [drag, box]);

  function onPieceMouseDown(e: React.MouseEvent, i: number) {
    // Find offset (inside SVG piece) of click
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

  function resetGame() {
    setBox(emptyBoard());
    setPieces(Array.from({ length: 3 }, () => randomTetromino()));
  }

  if (!mounted) return null; // Prevent hydration mismatch

  // --- Render ---
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#3a415a 0%,#1a1a2f 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <h1
        style={{
          color: "#fff176",
          letterSpacing: 2,
          marginBottom: 8,
          fontWeight: 800,
        }}
      >
        PUZZLE BOX
      </h1>
      <p style={{ color: "#fff", marginBottom: 18, fontWeight: 300 }}>
        Drag & drop all 3 shapes into the box!
      </p>
      <div style={{ display: "flex", flexDirection: "row", gap: 48 }}>
        {/* Main Puzzle Box */}
        <svg
          ref={boxRef}
          width={BOX_COLS * BLOCK}
          height={BOX_ROWS * BLOCK}
          style={{
            background: "#1a223a",
            border: `6px solid #fff176`,
            borderRadius: 16,
            boxShadow: "0 4px 32px #000c",
            touchAction: "none",
          }}
        >
          {/* Box grid */}
          {box.map((row, y) =>
            row.map((cell, x) => (
              <rect
                key={x + "," + y}
                x={x * BLOCK}
                y={y * BLOCK}
                width={BLOCK}
                height={BLOCK}
                fill={cell || "#222b3b"}
                stroke="#fffec1"
                strokeWidth={cell ? 3 : 1}
                rx={10}
                ry={10}
              />
            ))
          )}
          {/* Drag preview */}
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
                            BLOCK
                        ) *
                          BLOCK +
                        xx * BLOCK
                      }
                      y={
                        Math.round(
                          (drag.mouseY -
                            boxRef.current.getBoundingClientRect().top -
                            drag.offsetY) /
                            BLOCK
                        ) *
                          BLOCK +
                        yy * BLOCK
                      }
                      width={BLOCK}
                      height={BLOCK}
                      fill={drag.color}
                      fillOpacity={
                        canPlace(
                          box,
                          drag.shape,
                          Math.round(
                            (drag.mouseX -
                              boxRef.current.getBoundingClientRect().left -
                              drag.offsetX) /
                              BLOCK
                          ),
                          Math.round(
                            (drag.mouseY -
                              boxRef.current.getBoundingClientRect().top -
                              drag.offsetY) /
                              BLOCK
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
        {/* Pieces to drag */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 32,
            alignItems: "center",
            userSelect: "none",
          }}
        >
          {pieces.map((p, i) => (
            <svg
              key={i}
              width={p.shape[0].length * BLOCK}
              height={p.shape.length * BLOCK}
              style={{
                background: "#222b3b",
                border: `3px solid #fff176`,
                borderRadius: 10,
                cursor: drag ? "grabbing" : "grab",
                opacity: drag && drag.index === i ? 0.18 : 1,
                transition: "opacity .2s",
              }}
              onMouseDown={(e) => onPieceMouseDown(e, i)}
              draggable={false}
            >
              {p.shape.map((row, y) =>
                row.map(
                  (val, x) =>
                    val && (
                      <rect
                        key={x + "," + y}
                        x={x * BLOCK}
                        y={y * BLOCK}
                        width={BLOCK}
                        height={BLOCK}
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
      </div>
      <div style={{ marginTop: 32 }}>
        {pieces.length === 0 ? (
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
        ) : null}
      </div>
      <div style={{ marginTop: 28, color: "#fff9", fontSize: 15 }}>
        <b>Tip:</b> No rotation. Drag and drop only!
      </div>
    </div>
  );
}
