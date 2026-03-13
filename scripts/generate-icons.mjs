#!/usr/bin/env node
/**
 * generate-icons.mjs
 *
 * Generates public/icon.icns, public/icon.ico, public/icon.png
 * from the Conductr conductor-wave logo design.
 *
 * Pure Node.js — no external dependencies.
 * Matches the visual design in public/logo.svg.
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 *   # or
 *   npm run generate-icons
 */

import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, '..', 'public')

// ─── CRC-32 (PNG standard polynomial) ────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// ─── PNG encoder ─────────────────────────────────────────────────────────────

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  const crcBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function encodePng(rgba, w, h) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13, 0)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // colour type: RGBA

  const raw = Buffer.alloc(h * (1 + w * 4))
  let pos = 0
  for (let y = 0; y < h; y++) {
    raw[pos++] = 0  // filter byte: None
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4
      raw[pos++] = rgba[p]      // R
      raw[pos++] = rgba[p + 1]  // G
      raw[pos++] = rgba[p + 2]  // B
      raw[pos++] = rgba[p + 3]  // A
    }
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ─── Box-filter downsampler ───────────────────────────────────────────────────
// High-quality downsampling: each destination pixel samples from a weighted
// average of all source pixels that overlap its footprint (area sampling).

function downsample(src, srcW, srcH, dstW, dstH) {
  const dst = new Uint8Array(dstW * dstH * 4)
  const sx = srcW / dstW
  const sy = srcH / dstH

  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const x0 = dx * sx, x1 = x0 + sx
      const y0 = dy * sy, y1 = y0 + sy
      let R = 0, G = 0, B = 0, A = 0, totalW = 0

      for (let qy = Math.floor(y0); qy < Math.ceil(y1); qy++) {
        for (let qx = Math.floor(x0); qx < Math.ceil(x1); qx++) {
          if (qx >= srcW || qy >= srcH) continue
          const wt =
            (Math.min(qx + 1, x1) - Math.max(qx, x0)) *
            (Math.min(qy + 1, y1) - Math.max(qy, y0))
          const p = (qy * srcW + qx) * 4
          R += src[p]     * wt
          G += src[p + 1] * wt
          B += src[p + 2] * wt
          A += src[p + 3] * wt
          totalW += wt
        }
      }

      const di = (dy * dstW + dx) * 4
      if (totalW > 0) {
        dst[di]     = (R / totalW) | 0
        dst[di + 1] = (G / totalW) | 0
        dst[di + 2] = (B / totalW) | 0
        dst[di + 3] = (A / totalW) | 0
      }
    }
  }
  return dst
}

// ─── Icon renderer ────────────────────────────────────────────────────────────
// Renders the Conductr conductor-wave logo at any target resolution.
// All coordinates are normalised from the 512×512 SVG reference design.

const REF = 512

/**
 * Returns the shortest distance from point (px, py) to the upper semicircular
 * arc centred at (cx, cy) with radius r, with round linecaps at the endpoints.
 */
function distToUpperArc(px, py, cx, cy, r) {
  const dx = px - cx
  const dy = py - cy
  const d = Math.sqrt(dx * dx + dy * dy)

  if (d < 0.001) return r  // degenerate: point is exactly at centre

  // Closest point on the full circle to (px, py)
  const closestY = cy + r * (dy / d)

  if (closestY <= cy) {
    // Closest point is on the upper arc — return distance to arc line
    return Math.abs(d - r)
  } else {
    // Closest point is on the lower arc — use distance to the nearer endpoint
    const dLeft  = Math.sqrt((px - (cx - r)) ** 2 + (py - cy) ** 2)
    const dRight = Math.sqrt((px - (cx + r)) ** 2 + (py - cy) ** 2)
    return Math.min(dLeft, dRight)
  }
}

function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v }

function renderIcon(size) {
  const s = size / REF  // scale factor

  // ── Reference coordinates (512px space) scaled to target size
  const ARC_CX = 256 * s
  const ARC_CY = 368 * s  // anchor / focal point

  // 4 concentric arcs: outermost → innermost, matching logo.svg
  const ARCS = [
    { r: 170 * s, sw: 9  * s, R: 0x5b, G: 0x21, B: 0xb6, A: 0.22 },  // indigo, faintest
    { r: 132 * s, sw: 11 * s, R: 0x7c, G: 0x3a, B: 0xed, A: 0.40 },  // violet
    { r:  92 * s, sw: 13 * s, R: 0xc4, G: 0xb5, B: 0xfd, A: 0.65 },  // lavender
    { r:  52 * s, sw: 15 * s, R: 0xff, G: 0xff, B: 0xff, A: 0.90 },  // white, brightest
  ]

  const DOT_CX  = 256 * s
  const DOT_CY  = 368 * s
  const DOT_R   = 16  * s

  const GLOW_CX = 256 * s  // ambient glow centre
  const GLOW_CY = 295 * s
  const GLOW_R  = 195 * s

  const rgba = new Uint8Array(size * size * 4)

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4

      // ── 1. Background linear gradient: #1c1040 → #06050d (top → bottom)
      const t = py / (size - 1)
      let r = (0x1c + t * (0x06 - 0x1c)) | 0
      let g = (0x10 + t * (0x05 - 0x10)) | 0
      let b = (0x40 + t * (0x0d - 0x40)) | 0

      // ── 2. Ambient violet glow (radial, cx=256 cy=295, r=195 in 512-space)
      const gdx = px - GLOW_CX, gdy = py - GLOW_CY
      const gDist = Math.sqrt(gdx * gdx + gdy * gdy) / GLOW_R
      if (gDist < 1) {
        const ga = (1 - gDist) * 0.45  // #6d28d9 at up to 45% opacity
        r = clamp(r * (1 - ga) + 0x6d * ga)
        g = clamp(g * (1 - ga) + 0x28 * ga)
        b = clamp(b * (1 - ga) + 0xd9 * ga)
      }

      // ── 3. Specular sheen (radial highlight, top-left, cx=205 cy=155 r=170 in 512)
      const shCX = 205 * s, shCY = 155 * s, shR = 170 * s
      const sdx = px - shCX, sdy = py - shCY
      const sDist = Math.sqrt(sdx * sdx + sdy * sdy) / shR
      if (sDist < 1) {
        const sa = (1 - sDist) * 0.09  // white at up to 9% opacity
        r = clamp(r * (1 - sa) + 0xff * sa)
        g = clamp(g * (1 - sa) + 0xff * sa)
        b = clamp(b * (1 - sa) + 0xff * sa)
      }

      // ── 4. Conductor arcs (upper semicircles)
      for (const arc of ARCS) {
        const dist = distToUpperArc(px, py, ARC_CX, ARC_CY, arc.r)
        const hw = arc.sw / 2
        if (dist < hw + 1.5) {
          const a = dist < hw
            ? arc.A
            : arc.A * (hw + 1.5 - dist) / 1.5
          r = clamp(r * (1 - a) + arc.R * a)
          g = clamp(g * (1 - a) + arc.G * a)
          b = clamp(b * (1 - a) + arc.B * a)
        }
      }

      // ── 5. Focal point rings
      const dotDx = px - DOT_CX, dotDy = py - DOT_CY
      const dotDist = Math.sqrt(dotDx * dotDx + dotDy * dotDy)

      // Outer glow ring (r=32*s, stroke=3*s, rgba(196,181,253,0.18))
      const outerRingDist = Math.abs(dotDist - 32 * s)
      if (outerRingDist < 1.5 * s + 1) {
        const a = (1 - Math.min(1, outerRingDist / (1.5 * s + 1))) * 0.18
        r = clamp(r * (1 - a) + 0xc4 * a)
        g = clamp(g * (1 - a) + 0xb5 * a)
        b = clamp(b * (1 - a) + 0xfd * a)
      }

      // Inner ring (r=24*s, stroke=3*s, rgba(255,255,255,0.28))
      const innerRingDist = Math.abs(dotDist - 24 * s)
      if (innerRingDist < 1.5 * s + 1) {
        const a = (1 - Math.min(1, innerRingDist / (1.5 * s + 1))) * 0.28
        r = clamp(r * (1 - a) + 0xff * a)
        g = clamp(g * (1 - a) + 0xff * a)
        b = clamp(b * (1 - a) + 0xff * a)
      }

      // ── 6. Solid dot with radial gradient (white → a78bfa violet → transparent)
      if (dotDist < DOT_R + 1.5) {
        const tDot = Math.min(1, dotDist / DOT_R)
        // Gradient stops: 0%=white, 60%=lavender e0d7ff, 100%=violet a78bfa 40%
        let dR, dG, dB, dA
        if (tDot < 0.6) {
          const u = tDot / 0.6
          dR = 0xff + u * (0xe0 - 0xff)
          dG = 0xff + u * (0xd7 - 0xff)
          dB = 0xff + u * (0xff - 0xff)
          dA = 1.0
        } else {
          const u = (tDot - 0.6) / 0.4
          dR = 0xe0 + u * (0xa7 - 0xe0)
          dG = 0xd7 + u * (0x8b - 0xd7)
          dB = 0xff + u * (0xfa - 0xff)
          dA = 1.0 - u * 0.6  // fade to 0.4 at edge
        }
        const edgeA = dotDist < DOT_R ? dA : dA * (DOT_R + 1.5 - dotDist) / 1.5
        r = clamp(r * (1 - edgeA) + dR * edgeA)
        g = clamp(g * (1 - edgeA) + dG * edgeA)
        b = clamp(b * (1 - edgeA) + dB * edgeA)
      }

      rgba[idx]     = r
      rgba[idx + 1] = g
      rgba[idx + 2] = b
      rgba[idx + 3] = 255  // fully opaque (OS masks to app icon shape)
    }
  }

  return rgba
}

// ─── ICO packer (Windows) ─────────────────────────────────────────────────────
// Modern ICO files embed PNG data directly. Width/height 0 in the directory
// entry signifies 256 (the maximum encodable inline value).

function packIco(entries) {
  const count = entries.length
  // Header: 6 bytes. Directory: count × 16 bytes.
  let imageOffset = 6 + count * 16

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)      // reserved
  header.writeUInt16LE(1, 2)      // type: ICO
  header.writeUInt16LE(count, 4)

  const dirs = entries.map(({ size, png }) => {
    const dir = Buffer.alloc(16)
    dir[0] = size >= 256 ? 0 : size  // width  (0 = 256)
    dir[1] = size >= 256 ? 0 : size  // height (0 = 256)
    dir[2] = 0                        // colorCount (0 = not palette-based)
    dir[3] = 0                        // reserved
    dir.writeUInt16LE(1, 4)           // planes
    dir.writeUInt16LE(32, 6)          // bits per pixel
    dir.writeUInt32LE(png.length, 8)
    dir.writeUInt32LE(imageOffset, 12)
    imageOffset += png.length
    return dir
  })

  return Buffer.concat([header, ...dirs, ...entries.map((e) => e.png)])
}

// ─── ICNS packer (macOS) ─────────────────────────────────────────────────────
// Each size has a 4-char OSType code. The file starts with 'icns' + total size.

const ICNS_TYPES = {
  16:   'icp4',
  32:   'icp5',
  64:   'icp6',
  128:  'ic07',
  256:  'ic08',
  512:  'ic09',
  1024: 'ic10',
}

function packIcns(entries) {
  const chunks = entries.map(({ size, png }) => {
    const code = ICNS_TYPES[size]
    if (!code) throw new Error(`No ICNS code for size ${size}`)
    const typeBuf = Buffer.from(code, 'ascii')
    const lenBuf  = Buffer.alloc(4)
    lenBuf.writeUInt32BE(8 + png.length, 0)  // includes the 8-byte header
    return Buffer.concat([typeBuf, lenBuf, png])
  })

  const body    = Buffer.concat(chunks)
  const fileHdr = Buffer.alloc(8)
  fileHdr.write('icns', 0, 'ascii')
  fileHdr.writeUInt32BE(8 + body.length, 4)  // total file size
  return Buffer.concat([fileHdr, body])
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('🎨 Generating Conductr app icons...\n')

// Render the master at 1024×1024; downsample all other sizes from it
const MASTER = 1024
console.log(`  Rendering ${MASTER}×${MASTER} master icon...`)
const t0 = Date.now()
const masterPixels = renderIcon(MASTER)
console.log(`  Done in ${Date.now() - t0}ms`)

// All needed sizes across both platforms
const ALL_SIZES = [512, 256, 128, 64, 48, 32, 16]
const pngMap = { [MASTER]: encodePng(masterPixels, MASTER, MASTER) }

for (const sz of ALL_SIZES) {
  process.stdout.write(`  Downsampling → ${sz}×${sz}...`)
  const pixels = downsample(masterPixels, MASTER, MASTER, sz, sz)
  pngMap[sz] = encodePng(pixels, sz, sz)
  console.log(' ✓')
}

// ── icon.png (512×512 — useful as a quick preview / Linux icon)
writeFileSync(`${PUBLIC}/icon.png`, pngMap[512])
console.log('\n  ✓ public/icon.png  (512×512)')

// ── icon.ico (Windows) — 16, 32, 48, 256
const icoEntries = [256, 48, 32, 16].map((sz) => ({ size: sz, png: pngMap[sz] }))
writeFileSync(`${PUBLIC}/icon.ico`, packIco(icoEntries))
const icoKb = (pngMap[256].length + pngMap[48].length + pngMap[32].length + pngMap[16].length) / 1024
console.log(`  ✓ public/icon.ico  (16, 32, 48, 256  ~${icoKb.toFixed(0)} KB image data)`)

// ── icon.icns (macOS) — 16, 32, 64, 128, 256, 512, 1024
const icnsEntries = [16, 32, 64, 128, 256, 512, 1024].map((sz) => ({ size: sz, png: pngMap[sz] }))
writeFileSync(`${PUBLIC}/icon.icns`, packIcns(icnsEntries))
console.log(`  ✓ public/icon.icns (16, 32, 64, 128, 256, 512, 1024)`)

console.log('\n✅ All icon files generated successfully!')
