const { Jimp } = require('jimp')
const { readFileSync, writeFileSync } = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', 'public')

async function main() {
  const src = readFileSync(path.join(root, 'icon-192.png'))
  const img = await Jimp.read(src)

  const out192 = img.clone().resize({ w: 192, h: 192 })
  await out192.write(path.join(root, 'icon-192.png'))
  const out512 = img.clone().resize({ w: 512, h: 512 })
  await out512.write(path.join(root, 'icon-512.png'))
  const out256 = img.clone().resize({ w: 256, h: 256 })
  await out256.write(path.join(root, 'icon.png'))

  for (const f of ['icon-192.png', 'icon-512.png', 'icon.png']) {
    const buf = readFileSync(path.join(root, f))
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    console.log(`${f}: PNG=${isPng}, ${buf.length} bytes`)
  }

  // Generate ICO for Electron
  const { default: pngToIco } = await import('png-to-ico')
  const icoBuf = await pngToIco(path.join(root, 'icon.png'))
  writeFileSync(path.join(root, 'icon.ico'), icoBuf)
  console.log('icon.ico generated')
}

main().catch(e => { console.error(e); process.exit(1) })
