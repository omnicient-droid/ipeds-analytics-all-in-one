#!/usr/bin/env node
/**
 * Fetch school logos and (if available) mascot images from Wikipedia and save under public/.
 * Slow-and-steady, informative approach: use Wikimedia APIs, prefer official-looking marks.
 *
 * Output paths:
 *  - public/logos/{key}.{ext}
 *  - public/mascots/{key}.{ext} (if we detect a mascot-related image)
 *
 * Heuristics:
 *  - For each school name, use search API to find the main page.
 *  - Query page images and list of images.
 *  - Prefer files whose title contains 'logo'. Also look for 'mascot'. Fallback to pageimage.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT = path.resolve(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')
const LOGO_DIR = path.join(PUBLIC, 'logos')
const MASCOT_DIR = path.join(PUBLIC, 'mascots')

for (const p of [LOGO_DIR, MASCOT_DIR]) if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })

// Extract {key, name} pairs from lib/schools.ts with a simple regex.
const SCHOOLS_TS = path.join(ROOT, 'lib', 'schools.ts')
const ts = fs.readFileSync(SCHOOLS_TS, 'utf-8')
const schoolBlocks = ts.split(/\n\s{2,}[a-z]+:\s*\{/i).slice(1)
const schools = []
for (const block of schoolBlocks) {
  const keyMatch = block.match(/key:\s*'([^']+)'/)
  const unitMatch = block.match(/unitid:\s*(\d{5,6})/)
  const nameMatch = block.match(/name:\s*'([^']+)'/)
  if (keyMatch && nameMatch) {
    schools.push({ key: keyMatch[1], name: nameMatch[1], unitid: unitMatch ? +unitMatch[1] : null })
  }
}

const WIKI_API = 'https://en.wikipedia.org/w/api.php'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function wikiJson(params) {
  const url = WIKI_API + '?' + new URLSearchParams({ format: 'json', origin: '*', ...params })
  const res = await fetch(url, { headers: { 'User-Agent': 'IPEDS-AIO/0.1 (branding script)' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function findPageTitle(name) {
  const data = await wikiJson({ action: 'query', list: 'search', srsearch: name, srlimit: '1' })
  return data?.query?.search?.[0]?.title || null
}

async function getImagesForTitle(title) {
  const data = await wikiJson({
    action: 'query',
    prop: 'images|pageimages',
    piprop: 'original',
    titles: title,
  })
  const pages = data?.query?.pages || {}
  const page = Object.values(pages)[0]
  const images = (page?.images || []).map((im) => im?.title).filter(Boolean)
  const pageImage = page?.original?.source || null
  return { images, pageImage }
}

async function imageUrlFromFileTitle(fileTitle) {
  // Get imageinfo for the file
  const data = await wikiJson({
    action: 'query',
    titles: fileTitle,
    prop: 'imageinfo',
    iiprop: 'url',
  })
  const page = Object.values(data?.query?.pages || {})[0]
  const info = page?.imageinfo?.[0]
  return info?.url || null
}

function pickLogoAndMascot(files, pageImageUrl) {
  const lower = files.map((f) => String(f).toLowerCase())
  let logoFile = null
  let mascotFile = null
  for (let i = 0; i < lower.length; i++) {
    const f = lower[i]
    if (!logoFile && /logo/.test(f)) logoFile = files[i]
    if (!mascotFile && /mascot/.test(f)) mascotFile = files[i]
  }
  return { logoFile, mascotFile, pageImageUrl }
}

async function download(url, outPath) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download ${res.status}`)
  const ab = await res.arrayBuffer()
  fs.writeFileSync(outPath, Buffer.from(ab))
}

function extFromUrl(url) {
  const u = new URL(url)
  const m = u.pathname.match(/\.([a-zA-Z0-9]+)$/)
  return (m ? m[1] : 'png').toLowerCase()
}

async function processSchool({ key, name }) {
  try {
    const title = await findPageTitle(name)
    if (!title) return console.warn('No page for', name)
    const { images, pageImage } = await getImagesForTitle(title)
    const { logoFile, mascotFile } = pickLogoAndMascot(images, pageImage)

    let logoUrl = null
    if (logoFile) logoUrl = await imageUrlFromFileTitle(logoFile)
    if (!logoUrl && pageImage) logoUrl = pageImage

    if (logoUrl) {
      const logoExt = extFromUrl(logoUrl)
      const logoOut = path.join(LOGO_DIR, `${key}.${logoExt}`)
      if (!fs.existsSync(logoOut)) {
        console.log('Downloading logo for', name, '→', logoOut)
        await download(logoUrl, logoOut)
      } else {
        console.log('Logo exists for', name)
      }
    }

    if (mascotFile) {
      const mascotUrl = await imageUrlFromFileTitle(mascotFile)
      if (mascotUrl) {
        const masExt = extFromUrl(mascotUrl)
        const masOut = path.join(MASCOT_DIR, `${key}.${masExt}`)
        if (!fs.existsSync(masOut)) {
          console.log('Downloading mascot for', name, '→', masOut)
          await download(mascotUrl, masOut)
        } else {
          console.log('Mascot exists for', name)
        }
      }
    }

    await sleep(400) // politeness
  } catch (e) {
    console.warn('Branding fetch failed for', name, e?.message || e)
  }
}

async function main() {
  for (const s of schools) {
    await processSchool(s)
  }
  console.log('Branding fetch complete.')
}

main()
