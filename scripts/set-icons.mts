// Set the square tile of each listed game as its shared icon (cards show the icon when a game has one).
//
//   node --env-file-if-exists=.env.local scripts/set-icons.mts [iconsDir] [--dry-run]
//
// The tiles are the 1000×1000 PNGs in scripts/icons/ (the default folder): original artwork drawn for this
// site, one per game that would otherwise share a brand logo or banner with other games.
//
// Each file is matched to a game by the exact name in TILES. Only `icon` is written: the game's image, its
// audience overrides and everything else stay as they are. The icon gets no alt text, since the tile is
// decorative beside the game's name. A game whose icon is already this file is left alone, so it is safe to re-run.
//
// Reported, and nothing is written if any of the first three is found: a file with no entry in TILES, an
// entry whose game does not exist, an entry whose file is missing. Games that had another icon are listed
// as replaced.
//
// Needs NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and (to write) SANITY_WRITE_TOKEN.

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@sanity/client'

/** File in the icons folder → the game's exact name in the CMS. */
const TILES: Record<string, string> = {
  // PBS KIDS
  'pienado.png': 'Pienado',
  'dominoes.png': 'Dominoes',
  'railway-hero.png': 'Railway Hero',
  'code-breaker.png': 'Code Breaker',
  'down-the-tubes.png': 'Down the Tubes',
  'puppy-quest.png': 'Puppy Quest',
  'fair-shares.png': 'Fair Shares',
  'marble-ous-run.png': 'Marble-ous Run',
  'loops-lunch.png': 'Loops Lunch',
  'patternpalooza-fair.png': 'Patternpalooza Fair',
  'elevator-antics.png': 'Elevator Antics',
  'reboot-rescue.png': 'Reboot Rescue',
  'tangram-game.png': 'Tangram Game',
  'echo-explorers.png': 'Echo Explorers',
  'stus-delivery-service.png': "Stu's Delivery Service",
  'awesome-obstacles.png': 'Awesome Obstacles',
  'odd-squad-cases.png': 'Odd Squad Cases',
  'key-quest.png': 'Key Quest',
  // PlayMath
  'clue-jr.png': 'Clue Jr.',
  'boo.png': 'Boo!',
  'tic-tac-toe-pro.png': 'Tic Tac Toe Pro',
  'snakebird-math.png': 'Snakebird Math',
  'sum-blocks.png': 'Sum Blocks',
  'blockbuster-billy.png': 'Blockbuster Billy',
  'stretch-sums.png': 'Stretch Sums',
  'logic-tail.png': 'Logic Tail',
  // Couch Games
  'make-a-scene.png': 'Make a Scene',
  'cappy-and-tappy.png': 'Cappy & Tappy',
  'tents-and-trees.png': 'Tents and Trees',
  'handshakes.png': 'Handshakes',
  // Beast Academy
  'all-ten.png': 'All Ten',
  'scurry.png': 'Scurry',
  'clueless.png': 'Clueless',
  'folds.png': 'Folds',
  'honeycombs.png': 'Honeycombs',
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const unknown = args.filter((a) => a.startsWith('--') && a !== '--dry-run')
if (unknown.length) fail(`Unknown flag ${unknown[0]}. Usage: scripts/set-icons.mts [iconsDir] [--dry-run]`)
const dir = args.find((a) => !a.startsWith('--')) || path.join('scripts', 'icons')
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) fail(`Icons folder not found: ${dir}`)

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN
if (!projectId) fail('NEXT_PUBLIC_SANITY_PROJECT_ID is not set (copy .env.example to .env.local)')
if (!dryRun && !token) fail('SANITY_WRITE_TOKEN is not set. Add it to .env.local, or pass --dry-run to only check.')

const client = createClient({ projectId, dataset, apiVersion: '2025-01-01', token, useCdn: false })

type Game = { _id: string; name: string; icon?: string | null }
const games = await client.fetch<Game[]>(`*[_type == "game"]{ _id, name, "icon": icon.asset._ref }`)
const published = new Map(games.filter((g) => !g._id.startsWith('drafts.')).map((g) => [g.name, g]))
const drafts = new Set(games.filter((g) => g._id.startsWith('drafts.')).map((g) => g._id.slice('drafts.'.length)))

const files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort()
const filesWithoutEntry = files.filter((f) => !TILES[f])
const filesWithoutGame = files.filter((f) => TILES[f] && !published.has(TILES[f]))
const gamesWithoutFile = Object.entries(TILES)
  .filter(([f]) => !files.includes(f))
  .map(([f, name]) => `${name} (${f})`)

type Plan = { file: string; game: Game; buffer: Buffer; sha1: string; action: 'set' | 'replace' | 'unchanged' }
const plan: Plan[] = files
  .filter((f) => TILES[f] && published.has(TILES[f]))
  .map((file) => {
    const game = published.get(TILES[file])!
    const buffer = fs.readFileSync(path.join(dir, file))
    // A Sanity image asset id is image-<sha1 of the file>-<w>x<h>-<ext>, so an icon that is already this file is recognisable.
    const sha1 = crypto.createHash('sha1').update(buffer).digest('hex')
    const action = !game.icon ? 'set' : game.icon.startsWith(`image-${sha1}-`) ? 'unchanged' : 'replace'
    return { file, game, buffer, sha1, action }
  })

console.table(plan.map((p) => ({ File: p.file, Game: p.game.name, Action: p.action, 'Icon before': p.game.icon || '' })))
const count = (a: Plan['action']) => plan.filter((p) => p.action === a).length
console.log(`${files.length} files, ${Object.keys(TILES).length} listed games: ${count('set')} to set, ${count('replace')} to replace, ${count('unchanged')} already set.`)
console.log(`Files with no entry in the list: ${filesWithoutEntry.join(', ') || 'none'}`)
console.log(`Files with no matching game: ${filesWithoutGame.map((f) => `${f} ("${TILES[f]}")`).join(', ') || 'none'}`)
console.log(`Listed games with no file: ${gamesWithoutFile.join(', ') || 'none'}`)
const replaced = plan.filter((p) => p.action === 'replace')
console.log(`Games whose icon is replaced: ${replaced.map((p) => p.game.name).join(', ') || 'none'}`)
const withDraft = plan.filter((p) => drafts.has(p.game._id))
if (withDraft.length) console.log(`Unpublished drafts exist for: ${withDraft.map((p) => p.game.name).join(', ')}. Only the published game is changed; publishing the draft would bring its own icon back.`)

if (filesWithoutEntry.length || filesWithoutGame.length || gamesWithoutFile.length) fail('\nFix the mismatches above first. Nothing was written.')
if (dryRun) {
  console.log('\nDry run: nothing written.')
  process.exit(0)
}

const todo = plan.filter((p) => p.action !== 'unchanged')
if (!todo.length) {
  console.log('\nNothing to do.')
  process.exit(0)
}
const tx = client.transaction()
for (const p of todo) {
  const asset = await client.assets.upload('image', p.buffer, { filename: p.file })
  tx.patch(p.game._id, (patch) => patch.set({ icon: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } } }))
}
const result = await tx.commit()
console.log(`\nDone. Transaction ${result.transactionId}: ${todo.length} icons written (${replaced.length} replaced).`)

function fail(msg: string): never {
  console.error(msg)
  process.exit(1)
}
