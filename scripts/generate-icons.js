#!/usr/bin/env node
// Run once: node scripts/generate-icons.js
// Generates PNG app icons using only Node.js built-ins (no extra deps).

import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'

// ── CRC32 (required by PNG spec) ─────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.allocUnsafe(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([lenBuf, t, data, crcBuf])
}

function makePNG(size, getPixel) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Raw pixel rows: 1 filter byte (0=None) + RGBA per pixel
  const rowLen = 1 + size * 4
  const raw = Buffer.allocUnsafe(size * rowLen)
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = getPixel(x, y, size)
      const i = y * rowLen + 1 + x * 4
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a
    }
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Heart shape: algebraic heart curve ───────────────────────
// (x²+y²-1)³ ≤ x²·y³  in standard math coords (y up).
// With y-axis flipped for image coords, bumps appear at top, point at bottom.
function inHeart(nx, ny) {
  const f = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3)
  return f <= 0
}

// ── Rounded-rect mask ────────────────────────────────────────
function inRoundedRect(cx, cy, size, radius) {
  const r = size * radius
  if (cx >= r && cx <= size - r) return true
  if (cy >= r && cy <= size - r) return true
  // corners
  const dx = Math.min(cx, size - cx) < r ? (cx < r ? r - cx : cx - (size - r)) : 0
  const dy = Math.min(cy, size - cy) < r ? (cy < r ? r - cy : cy - (size - r)) : 0
  return dx * dx + dy * dy <= r * r
}

function iconPixel(x, y, size) {
  const cx = x + 0.5, cy = y + 0.5

  // iOS-style rounded corners (22% radius ≈ what iOS uses for app icons)
  if (!inRoundedRect(cx, cy, size, 0.22)) return [0, 0, 0, 0]

  // Cream background #faf8f5
  const bgR = 250, bgG = 248, bgB = 245
  // Blush heart #d9a49a
  const hR = 217, hG = 164, hB = 154

  // Map pixel to math coords. Heart fits roughly ±1.1 horizontally, -1 to +0.8 vertically.
  // scale=0.75, vertical center at 52% gives good padding all around.
  const scale = 0.75
  const nx = (cx / size - 0.5) * 2 / scale
  const ny = -(cy / size - 0.52) * 2 / scale  // flip y: image y-down → math y-up

  if (inHeart(nx, ny)) return [hR, hG, hB, 255]
  return [bgR, bgG, bgB, 255]
}

// ── Write files ───────────────────────────────────────────────
mkdirSync('public/icons', { recursive: true })

const icons = [
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['public/apple-touch-icon.png', 180],
]

for (const [path, size] of icons) {
  writeFileSync(path, makePNG(size, iconPixel))
  console.log(`✓  ${path} (${size}×${size})`)
}
