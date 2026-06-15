// Gera os ícones PNG do PWA sem dependências externas (usa apenas zlib nativo).
// Desenho: fundo teal (cor da marca) com um "capelo" branco estilizado.
// Rode com: node scripts/gerar-icones.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// Constrói um PNG RGBA a partir de uma função pixel(x,y) => [r,g,b,a].
function gerarPNG(tamanho, pixel) {
  const linhas = []
  for (let y = 0; y < tamanho; y++) {
    const linha = Buffer.alloc(1 + tamanho * 4)
    linha[0] = 0 // filtro None
    for (let x = 0; x < tamanho; x++) {
      const [r, g, b, a] = pixel(x, y)
      const o = 1 + x * 4
      linha[o] = r
      linha[o + 1] = g
      linha[o + 2] = b
      linha[o + 3] = a
    }
    linhas.push(linha)
  }
  const raw = Buffer.concat(linhas)
  const idat = deflateSync(raw)

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(tamanho, 0)
  ihdr.writeUInt32BE(tamanho, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const assinatura = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    assinatura,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Desenho do ícone.
const TEAL = [15, 118, 110]
const TEAL_CLARO = [94, 234, 212]
const BRANCO = [255, 255, 255]

function desenho(tamanho) {
  const cx = tamanho / 2
  return (x, y) => {
    const nx = x / tamanho
    const ny = y / tamanho
    // Capelo (losango) na parte superior.
    const dxr = Math.abs(x - cx) / tamanho
    const topo = ny > 0.22 && ny < 0.46 && dxr < 0.34 - Math.abs(ny - 0.34) * 0.9
    // Base do capelo (faixa curva).
    const base = ny > 0.5 && ny < 0.66 && dxr < 0.22
    // Borla (linha à direita).
    const borla = nx > 0.74 && nx < 0.78 && ny > 0.34 && ny < 0.62
    if (topo || base) return [...BRANCO, 255]
    if (borla) return [...TEAL_CLARO, 255]
    return [...TEAL, 255]
  }
}

mkdirSync('public', { recursive: true })
for (const tam of [192, 512]) {
  const png = gerarPNG(tam, desenho(tam))
  writeFileSync(`public/pwa-${tam}x${tam}.png`, png)
  console.log(`Gerado public/pwa-${tam}x${tam}.png (${png.length} bytes)`)
}
// Ícone "apple-touch" (mesma arte, 180px).
writeFileSync('public/apple-touch-icon.png', gerarPNG(180, desenho(180)))
console.log('Gerado public/apple-touch-icon.png')

// Ícone .ico (256) — usado no atalho da Área de Trabalho (Windows).
function gerarICO(png) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reservado
  header.writeUInt16LE(1, 2) // tipo: 1 = ícone
  header.writeUInt16LE(1, 4) // quantidade de imagens
  const entry = Buffer.alloc(16)
  entry[0] = 0 // largura 256 -> 0
  entry[1] = 0 // altura 256 -> 0
  entry[2] = 0 // nº de cores (0 = >256)
  entry[3] = 0 // reservado
  entry.writeUInt16LE(1, 4) // planos
  entry.writeUInt16LE(32, 6) // bits por pixel
  entry.writeUInt32LE(png.length, 8) // tamanho da imagem
  entry.writeUInt32LE(22, 12) // offset (6 + 16)
  return Buffer.concat([header, entry, png])
}
writeFileSync('public/favicon.ico', gerarICO(gerarPNG(256, desenho(256))))
console.log('Gerado public/favicon.ico')
