import pngToIco from 'png-to-ico'
import { writeFileSync } from 'fs'
const buf = await pngToIco('public/icon.png')
writeFileSync('public/icon.ico', buf)
console.log('ICO generated')
