import Jimp from 'jimp'
import { readFileSync, writeFileSync } from 'fs'

const src = readFileSync('public/icon-192.png')
const jimp = await Jimp.read(src)

await jimp.clone().resize(192, 192).writeAsync('public/icon-192.png')
await jimp.clone().resize(512, 512).writeAsync('public/icon-512.png')
await jimp.clone().resize(256, 256).writeAsync('public/icon.png')

console.log('Icons regenerated: icon-192.png (192x192), icon-512.png (512x512), icon.png (256x256)')

// Verify
const verify = (f) => {
  const b = readFileSync(f)
  const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
  console.log(`${f}: PNG=${isPng}, size=${b.length} bytes`)
}
verify('public/icon-192.png')
verify('public/icon-512.png')
verify('public/icon.png')

// Also generate ICO for Electron
const { default: pngToIco } = await import('png-to-ico')
const buf = await pngToIco('public/icon.png')
writeFileSync('public/icon.ico', buf)
console.log('icon.ico generated for Electron')
