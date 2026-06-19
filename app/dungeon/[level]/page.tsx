'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { CharacterInstance, EnemyInstance, Buff, StageType, Attribute } from '@/types/game'
import { getCharacterMaster } from '@/data/characters'
import { getEquipment } from '@/data/equipment'
import { getDungeonMaterials } from '@/data/materials'
import { DUNGEON_ITEMS, getRecipe } from '@/data/recipes'
import { useGameStore } from '@/store/gameStore'
import { useCharacterStore } from '@/store/characterStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useDungeonStore } from '@/store/dungeonStore'
import type { StoredBattle } from '@/store/dungeonStore'

type BattleState = StoredBattle

// ─── Constants ─────────────────────────────────────────────────────────────
const ATTR_ADVANTAGE: Record<string, string> = {
  fire: 'wind', wind: 'earth', earth: 'water', water: 'fire',
}
const ATTR_LABEL: Record<string, string>  = { fire: '火', wind: '風', earth: '地', water: '水' }
const ATTR_COLOR: Record<string, string>  = {
  fire: 'text-red-400', wind: 'text-green-400', earth: 'text-yellow-600', water: 'text-blue-400',
}
const DUNGEON_ATTR: Attribute[] = ['fire', 'wind', 'earth', 'water']

type EnemyTypeKey = 'standard' | 'attack' | 'magic' | 'defense' | 'elite' | 'boss'
const ENEMY_STATS: Record<EnemyTypeKey, (d: number) => EnemyInstance['stats']> = {
  standard: (d) => ({ hp: 125*d, atk: 75*d,  def: 40*d, mag: 75*d,  mdef: 40*d, spd: 8*d  }),
  attack:   (d) => ({ hp: 125*d, atk: 90*d,  def: 50*d, mag: 30*d,  mdef: 25*d, spd: 10*d }),
  magic:    (d) => ({ hp: 125*d, atk: 30*d,  def: 25*d, mag: 90*d,  mdef: 50*d, spd: 10*d }),
  defense:  (d) => ({ hp: 150*d, atk: 40*d,  def: 65*d, mag: 40*d,  mdef: 65*d, spd: 5*d  }),
  elite:    (d) => ({ hp: 270*d, atk: 95*d,  def: 40*d, mag: 95*d,  mdef: 40*d, spd: 9*d  }),
  boss:     (d) => ({ hp: 600*d, atk: 110*d, def: 40*d, mag: 110*d, mdef: 40*d, spd: 10*d }),
}
const ENEMY_EXP: Record<EnemyTypeKey, (d: number) => number> = {
  standard: (d) => 20*d, attack: (d) => 20*d, magic: (d) => 20*d,
  defense:  (d) => 20*d, elite:  (d) => 50*d, boss:  (d) => 100*d,
}
const ITEM_EFFECTS: Record<string, { type: 'heal' | 'buff'; buffType?: 'atk' | 'def' | 'mag'; percent: number }> = {
  potion:     { type: 'heal', percent: 25 },
  panacea:    { type: 'heal', percent: 50 },
  stimulant:  { type: 'buff', buffType: 'atk', percent: 10 },
  bubble_med: { type: 'buff', buffType: 'def', percent: 10 },
  magic_med:  { type: 'buff', buffType: 'mag', percent: 10 },
}

const TENDENCY_LABEL: Record<string, string> = {
  standard: '標準', attack: '攻撃型', magic: '魔法型', defense: '防御型', speed: '速度型',
}
const TENDENCY_COLOR: Record<string, string> = {
  standard: 'text-slate-400', attack: 'text-red-400', magic: 'text-purple-400',
  defense: 'text-blue-400', speed: 'text-green-400',
}

// ─── Pure helpers ──────────────────────────────────────────────────────────
function calcDmg(atk: number, def: number) {
  return Math.max(1, Math.floor(atk * atk / (atk + def)))
}
function attrMult(atkAttr: Attribute, defAttr: Attribute): number {
  if (!atkAttr || !defAttr) return 1
  if (ATTR_ADVANTAGE[atkAttr] === defAttr) return 1.5
  if (ATTR_ADVANTAGE[defAttr] === atkAttr) return 0.75
  return 1
}
function dungeonAttr(dl: number): Attribute {
  return DUNGEON_ATTR[(dl - 1) % 4]
}
function randomEnemyType(): EnemyTypeKey {
  const r = Math.random()
  if (r < 0.40) return 'standard'
  if (r < 0.65) return 'attack'
  if (r < 0.90) return 'magic'
  return 'defense'
}
function makeEnemy(type: EnemyTypeKey, dl: number, attr: Attribute): EnemyInstance {
  const s = ENEMY_STATS[type](dl)
  return { id: crypto.randomUUID(), type, hp: s.hp, maxHp: s.hp, stats: s, attribute: attr }
}
function makeEnemies(stageType: StageType, dl: number): EnemyInstance[] {
  const attr = dungeonAttr(dl)
  if (stageType === 'boss')  return [makeEnemy('boss',  dl, attr)]
  if (stageType === 'elite') return [makeEnemy('elite', dl, attr)]
  const count = dl <= 15 ? (Math.random() < 0.5 ? 1 : 2) : (Math.random() < 0.5 ? 2 : 3)
  return Array.from({ length: count }, () => makeEnemy(randomEnemyType(), dl, null))
}
function buildTurnOrder(partyIds: string[], chars: CharacterInstance[], enemies: EnemyInstance[]) {
  const all: { id: string; spd: number; isPlayer: boolean }[] = [
    ...partyIds.map((id) => {
      const c = chars.find((x) => x.id === id)!
      return { id, spd: c.stats.spd, isPlayer: true }
    }),
    ...enemies.map((e) => ({ id: e.id, spd: e.stats.spd, isPlayer: false })),
  ]
  all.sort((a, b) => b.spd - a.spd)
  return all.map(({ id, isPlayer }) => ({ id, isPlayer }))
}
function buffedStat(base: number, buffs: Buff[], type: 'atk' | 'def' | 'mag') {
  const bonus = buffs.filter((b) => b.type === type && b.turnsRemaining > 0)
    .reduce((s, b) => s + b.percent / 100, 0)
  return Math.floor(base * (1 + bonus))
}
function charWeaponAttr(char: CharacterInstance): Attribute {
  const wid = char.equipment.weapon
  if (!wid) return null
  const inv = useInventoryStore.getState()
  const inst = inv.equipment.find((e) => e.instanceId === wid)
  if (!inst) return null
  return getEquipment(inst.masterId)?.attribute ?? null
}
function charArmorAttr(char: CharacterInstance): Attribute {
  const aid = char.equipment.armor
  if (!aid) return null
  const inv = useInventoryStore.getState()
  const inst = inv.equipment.find((e) => e.instanceId === aid)
  if (!inst) return null
  return getEquipment(inst.masterId)?.attribute ?? null
}
function generateStageTypes(): StageType[] {
  return [
    'battle',
    Math.random() < 0.6 ? 'battle' : 'chest',
    'battle',
    (() => { const r = Math.random(); return r < 0.5 ? 'recovery' : r < 0.8 ? 'chest' : 'battle' })(),
    Math.random() < 0.15 ? 'elite' : 'battle',
    'boss',
  ]
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function DungeonBattlePage({ params }: { params: Promise<{ level: string }> }) {
  const { level: lvStr } = use(params)
  const dl = parseInt(lvStr, 10)
  const router = useRouter()

  const addGold         = useGameStore((s) => s.addGold)
  const upgradeGuildRank = useGameStore((s) => s.upgradeGuildRank)
  const guildRank       = useGameStore((s) => s.guildRank)
  const characters      = useCharacterStore((s) => s.characters)
  const gainBattleExp   = useCharacterStore((s) => s.gainBattleExp)
  const updateCurrentHp = useCharacterStore((s) => s.updateCurrentHp)
  const clearDungeon     = useDungeonStore((s) => s.clearDungeon)
  const addRecruitPoints = useDungeonStore((s) => s.addRecruitPoints)
  const storedBattle     = useDungeonStore((s) => s.activeBattle)
  const setActiveBattle  = useDungeonStore((s) => s.setActiveBattle)
  const invEquipment     = useInventoryStore((s) => s.equipment)

  const [partyIds,   setPartyIds]   = useState<string[]>([])
  const [dungeonItems, setDungeonItems] = useState<Record<string, number>>({})
  const [bs, setBs]     = useState<BattleState | null>(() =>
    storedBattle?.dungeonLevel === dl ? storedBattle : null
  )
  const [action, setAction] = useState<'menu' | 'attack' | 'magic' | 'item' | 'item-target'>('menu')
  const [selectedItem, setSelectedItem] = useState('')
  const [result, setResult] = useState<'clear' | 'wipe' | 'retreat' | null>(null)

  function getEquipName(instanceId: string | null): string | null {
    if (!instanceId) return null
    const inst = invEquipment.find((e) => e.instanceId === instanceId)
    return inst ? getEquipment(inst.masterId)?.name ?? null : null
  }

  function effectiveStats(char: CharacterInstance) {
    const base = char.stats
    // Character star rank: each ★ above 1 gives +20% to all stats
    const charStarBonus = (char.starRank - 1) * 0.2
    let atkMult = 1 + charStarBonus, defMult = 1 + charStarBonus
    let magMult = 1 + charStarBonus, mdefMult = 1 + charStarBonus
    let hpMult  = 1 + charStarBonus, spdMult  = 1 + charStarBonus
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const inst = invEquipment.find((e) => e.instanceId === char.equipment[slot])
      const master = inst ? getEquipment(inst.masterId) : null
      if (!master || !inst) continue
      // Equipment star rank: each ★ multiplies the base effect by that rank
      const s = inst.starRank
      atkMult  += (master.effects.atkPercent  ?? 0) / 100 * s
      defMult  += (master.effects.defPercent  ?? 0) / 100 * s
      magMult  += (master.effects.magPercent  ?? 0) / 100 * s
      mdefMult += (master.effects.mdefPercent ?? 0) / 100 * s
      hpMult   += (master.effects.hpPercent   ?? 0) / 100 * s
      spdMult  += (master.effects.spdPercent  ?? 0) / 100 * s
    }
    return {
      hp:   Math.floor(base.hp   * hpMult),
      atk:  Math.floor(base.atk  * atkMult),
      def:  Math.floor(base.def  * defMult),
      mag:  Math.floor(base.mag  * magMult),
      mdef: Math.floor(base.mdef * mdefMult),
      spd:  Math.floor(base.spd  * spdMult),
    }
  }

  // Restore item inventory snapshot when resuming
  useEffect(() => {
    if (storedBattle?.dungeonLevel === dl && !result) {
      const inv = useInventoryStore.getState()
      const items: Record<string, number> = {}
      for (const id of DUNGEON_ITEMS) items[id] = Math.min(inv.materials[id] ?? 0, 5)
      setDungeonItems(items)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync battle state to store on every change
  useEffect(() => {
    if (bs && !result) setActiveBattle(bs)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bs])

  // ── Party selection ─────────────────────────────────────────────────────
  function toggleParty(id: string) {
    setPartyIds((p) => p.includes(id) ? p.filter((x) => x !== id) : p.length < 5 ? [...p, id] : p)
  }

  function startDungeon() {
    if (partyIds.length === 0) return
    const stageTypes = generateStageTypes()

    // Snapshot item inventory
    const inv = useInventoryStore.getState()
    const items: Record<string, number> = {}
    for (const id of DUNGEON_ITEMS) items[id] = Math.min(inv.materials[id] ?? 0, 5)
    setDungeonItems(items)

    // Snapshot party HP
    const partyHps: Record<string, number> = {}
    for (const id of partyIds) {
      const c = characters.find((x) => x.id === id)!
      partyHps[id] = c.currentHp
    }

    const stageType = stageTypes[0]
    const enemies = stageType === 'battle' ? makeEnemies(stageType, dl) : []
    const initialBs: BattleState = {
      dungeonLevel: dl,
      stageTypes,
      currentStage: 0,
      stageType,
      enemies,
      partyIds,
      partyHps,
      partyBuffs: {},
      loot: { gold: 0, materials: {}, exp: 0 },
      turnOrder: enemies.length > 0 ? buildTurnOrder(partyIds, characters, enemies) : [],
      currentTurnIndex: 0,
      battlePhase: enemies.length > 0 ? 'player-action' : 'result',
      log: [`ダンジョン Lv.${dl} 開始！`],
    }
    const firstSlot = initialBs.turnOrder[initialBs.currentTurnIndex]
    if (firstSlot && !firstSlot.isPlayer) {
      const firstEnemy = initialBs.enemies.find((e) => e.id === firstSlot.id)
      if (firstEnemy) {
        setBs(processEnemyTurn(initialBs, initialBs.currentTurnIndex, firstEnemy))
        return
      }
    }
    setBs(initialBs)
  }

  // ── Stage advancement ───────────────────────────────────────────────────
  // NOTE: advanceStage must NOT call handleClear (Zustand set inside React setState updater)
  // The caller is responsible for checking currentStage + 1 >= 6 and calling handleClear directly.
  function advanceStage(state: BattleState): BattleState {
    const nextStage = state.currentStage + 1
    if (nextStage >= 6) return state  // safety guard; caller should not reach here

    const nextType = state.stageTypes[nextStage]
    const newLog = [...state.log]
    let newLoot = { ...state.loot, materials: { ...state.loot.materials } }
    let newHps = { ...state.partyHps }

    if (nextType === 'recovery') {
      for (const id of state.partyIds) {
        const c = characters.find((x) => x.id === id)!
        const maxHp = effectiveStats(c).hp
        const heal = Math.floor(maxHp * 0.5)
        newHps[id] = Math.min(maxHp, (newHps[id] ?? maxHp) + heal)
        newLog.push(`💚 ${getCharacterMaster(c.masterId)?.name} HP +${heal}`)
      }
    } else if (nextType === 'chest') {
      const gold = 100 * dl
      newLoot.gold += gold
      const mats = getDungeonMaterials(dl)
      if (mats.length > 0) {
        const mat = mats[Math.floor(Math.random() * mats.length)]
        const qty = 5 + Math.floor(Math.random() * 6)
        newLoot.materials[mat.id] = (newLoot.materials[mat.id] ?? 0) + qty
        newLog.push(`📦 宝箱: ${gold}G・${mat.name}×${qty}`)
      } else {
        newLog.push(`📦 宝箱: ${gold}G`)
      }
    }

    const enemies = (nextType === 'battle' || nextType === 'boss' || nextType === 'elite')
      ? makeEnemies(nextType, dl) : []

    const next: BattleState = {
      ...state,
      currentStage: nextStage,
      stageType: nextType,
      enemies,
      partyHps: newHps,
      loot: newLoot,
      turnOrder: enemies.length > 0 ? buildTurnOrder(state.partyIds, characters, enemies) : [],
      currentTurnIndex: 0,
      battlePhase: enemies.length > 0 ? 'player-action' : 'result',
      log: newLog,
    }
    return next
  }

  function handleClear(state: BattleState): BattleState {
    addGold(state.loot.gold)
    const inv = useInventoryStore.getState()
    for (const [matId, qty] of Object.entries(state.loot.materials)) {
      inv.addMaterial(matId, qty)
    }
    for (const id of state.partyIds) gainBattleExp(id, state.loot.exp)
    for (const id of state.partyIds) {
      const c = characters.find((x) => x.id === id)!
      updateCurrentHp(id, c.stats.hp)
    }
    clearDungeon(dl)
    // Recruit points: 1 per party member's region
    for (const id of state.partyIds) {
      const c = characters.find((x) => x.id === id)!
      const master = getCharacterMaster(c.masterId)
      if (master) addRecruitPoints(master.region, 1)
    }
    if (dl % 10 === 0 && dl / 10 === guildRank) upgradeGuildRank()
    setActiveBattle(null)
    setResult('clear')
    return state
  }

  // ── Turn advancement ────────────────────────────────────────────────────
  function advanceTurn(state: BattleState): BattleState {
    const len = state.turnOrder.length
    if (len === 0) return state

    let idx = (state.currentTurnIndex + 1) % len
    let attempts = 0

    while (attempts < len) {
      const slot = state.turnOrder[idx]
      if (slot.isPlayer) {
        if ((state.partyHps[slot.id] ?? 0) > 0) {
          return { ...state, currentTurnIndex: idx, battlePhase: 'player-action' }
        }
      } else {
        const enemy = state.enemies.find((e) => e.id === slot.id)
        if (enemy && enemy.hp > 0) {
          // Process enemy turn
          return processEnemyTurn(state, idx, enemy)
        }
      }
      idx = (idx + 1) % len
      attempts++
    }
    return state
  }

  function processEnemyTurn(state: BattleState, idx: number, enemy: EnemyInstance): BattleState {
    const aliveParty = state.partyIds.filter((id) => (state.partyHps[id] ?? 0) > 0)
    if (aliveParty.length === 0) {
      for (const id of state.partyIds) {
        const c = characters.find((x) => x.id === id)
        if (c) updateCurrentHp(id, c.stats.hp)
      }
      setActiveBattle(null)
      setResult('wipe')
      return state
    }

    const usesMag = enemy.type === 'magic' ||
      ((enemy.type === 'elite' || enemy.type === 'boss') && enemy.stats.mag >= enemy.stats.atk)

    // Target selection
    let targetId: string
    if (enemy.type === 'defense') {
      targetId = aliveParty.reduce((a, b) =>
        (state.partyHps[a] ?? 0) < (state.partyHps[b] ?? 0) ? a : b
      )
    } else {
      targetId = aliveParty[Math.floor(Math.random() * aliveParty.length)]
    }

    const target  = characters.find((c) => c.id === targetId)!
    const buffs   = state.partyBuffs[targetId] ?? []
    const effDef  = effectiveStats(target)
    const defStat = usesMag ? effDef.mdef : effDef.def
    const dmgRaw  = usesMag ? calcDmg(enemy.stats.mag, defStat) : calcDmg(enemy.stats.atk, defStat)
    const armorAttr = charArmorAttr(target)
    const mult = attrMult(enemy.attribute, armorAttr)
    const defBuff = buffs.filter((b) => b.type === 'def' && b.turnsRemaining > 0)
      .reduce((s, b) => s + b.percent / 100, 0)
    const dmg = Math.max(1, Math.floor(dmgRaw * mult * (1 - defBuff)))

    const newHp = Math.max(0, (state.partyHps[targetId] ?? target.stats.hp) - dmg)
    const newHps = { ...state.partyHps, [targetId]: newHp }

    const multStr = mult > 1 ? '【有利！】' : mult < 1 ? '【不利】' : ''
    const tname = getCharacterMaster(target.masterId)?.name ?? targetId
    const newLog = [...state.log,
      `🔴 ${enemy.type} → ${tname} に${usesMag ? '魔法' : '物理'}${dmg}ダメージ${multStr}`]

    // Tick buffs for target
    const newBuffs = { ...state.partyBuffs }
    if (newBuffs[targetId]) {
      newBuffs[targetId] = newBuffs[targetId]
        .map((b) => ({ ...b, turnsRemaining: b.turnsRemaining - 1 }))
        .filter((b) => b.turnsRemaining > 0)
    }

    const newState = { ...state, partyHps: newHps, partyBuffs: newBuffs, currentTurnIndex: idx, log: newLog }

    // Check wipe
    if (Object.values(newHps).every((hp) => hp <= 0)) {
      for (const id of state.partyIds) {
        const c = characters.find((x) => x.id === id)
        if (c) updateCurrentHp(id, c.stats.hp)
      }
      setActiveBattle(null)
      setResult('wipe')
      return newState
    }

    return advanceTurn(newState)
  }

  // ── Player actions ──────────────────────────────────────────────────────
  function handleAttack(targetEnemyId: string, usesMagic: boolean) {
    if (!bs || bs.battlePhase !== 'player-action') return
    const slot = bs.turnOrder[bs.currentTurnIndex]
    if (!slot?.isPlayer) return

    const attacker = characters.find((c) => c.id === slot.id)!
    const enemy = bs.enemies.find((e) => e.id === targetEnemyId)!
    if (!attacker || !enemy || enemy.hp <= 0) return

    const buffs    = bs.partyBuffs[attacker.id] ?? []
    const effAtk   = effectiveStats(attacker)
    const atkStat  = usesMagic
      ? buffedStat(effAtk.mag, buffs, 'mag')
      : buffedStat(effAtk.atk, buffs, 'atk')
    const defStat = usesMagic ? enemy.stats.mdef : enemy.stats.def
    const wAttr = charWeaponAttr(attacker)
    const mult  = attrMult(wAttr, enemy.attribute)
    const dmg   = Math.max(1, Math.floor(calcDmg(atkStat, defStat) * mult))

    // Tick attacker buffs
    const newBuffs = { ...bs.partyBuffs }
    newBuffs[attacker.id] = (newBuffs[attacker.id] ?? [])
      .map((b) => ({ ...b, turnsRemaining: b.turnsRemaining - 1 }))
      .filter((b) => b.turnsRemaining > 0)

    const newEnemies = bs.enemies.map((e) =>
      e.id === targetEnemyId ? { ...e, hp: Math.max(0, e.hp - dmg) } : e
    )
    const multStr = mult > 1 ? '【有利！】' : mult < 1 ? '【不利】' : ''
    const aname = getCharacterMaster(attacker.masterId)?.name ?? attacker.id
    const newLog = [...bs.log,
      `${aname} → ${enemy.type} に${usesMagic ? '魔法' : '物理'}${dmg}ダメージ${multStr}`]

    const allDead = newEnemies.every((e) => e.hp <= 0)
    if (allDead) {
      const expGain  = bs.enemies.reduce((s, e) => s + ENEMY_EXP[e.type as EnemyTypeKey](dl), 0)
      const goldGain = bs.stageType === 'boss' ? 500*dl : bs.stageType === 'elite' ? 300*dl : 50*dl
      const mats     = getDungeonMaterials(dl)
      const mat      = mats.length > 0 ? mats[Math.floor(Math.random() * mats.length)] : null
      const matQty   = mat ? 5 + Math.floor(Math.random() * 6) : 0
      const newLoot = {
        gold: bs.loot.gold + goldGain,
        exp:  bs.loot.exp  + expGain,
        materials: mat
          ? { ...bs.loot.materials, [mat.id]: (bs.loot.materials[mat.id] ?? 0) + matQty }
          : { ...bs.loot.materials },
      }
      const winLog = [...newLog, `✨ 勝利！ +${goldGain}G${mat ? `・${mat.name}×${matQty}` : ''}`]
      setBs({ ...bs, enemies: newEnemies, partyBuffs: newBuffs, loot: newLoot, battlePhase: 'result', log: winLog })
    } else {
      const mid = { ...bs, enemies: newEnemies, partyBuffs: newBuffs, log: newLog }
      setBs(advanceTurn(mid))
    }
    setAction('menu')
  }

  function handleUseItem(targetCharId: string) {
    if (!bs || !selectedItem) return
    const eff = ITEM_EFFECTS[selectedItem]
    if (!eff) return

    const target = characters.find((c) => c.id === targetCharId)!
    if (!target) return

    // Identify the acting character for the log
    const actingSlot = bs.turnOrder[bs.currentTurnIndex]
    const actingChar = actingSlot ? characters.find((c) => c.id === actingSlot.id) : null
    const aname = actingChar ? (getCharacterMaster(actingChar.masterId)?.name ?? actingSlot.id) : '???'

    let newHps = { ...bs.partyHps }
    let newBuffs = { ...bs.partyBuffs }
    const newLog = [...bs.log]

    if (eff.type === 'heal') {
      const maxHp = effectiveStats(target).hp
      const heal = Math.floor(maxHp * eff.percent / 100)
      newHps[targetCharId] = Math.min(maxHp, (newHps[targetCharId] ?? maxHp) + heal)
      const tname = getCharacterMaster(target.masterId)?.name ?? targetCharId
      newLog.push(`🧪 ${aname} → ${tname} HP +${heal}回復`)
    } else if (eff.type === 'buff' && eff.buffType) {
      const buff: Buff = { type: eff.buffType, percent: eff.percent, turnsRemaining: 3 }
      newBuffs[targetCharId] = [
        ...(newBuffs[targetCharId] ?? []).filter((b) => b.type !== eff.buffType),
        buff,
      ]
      const tname = getCharacterMaster(target.masterId)?.name ?? targetCharId
      newLog.push(`🧪 ${aname} → ${tname} ${eff.buffType}+${eff.percent}%（3ターン）`)
    }

    setDungeonItems((prev) => ({ ...prev, [selectedItem]: (prev[selectedItem] ?? 0) - 1 }))
    setSelectedItem('')

    const mid = { ...bs, partyHps: newHps, partyBuffs: newBuffs, log: newLog }
    setBs(advanceTurn(mid))
    setAction('menu')
  }

  function handleRetreat() {
    if (!bs) return
    const gold = Math.floor(bs.loot.gold * 0.8)
    addGold(gold)
    const inv = useInventoryStore.getState()
    for (const [matId, qty] of Object.entries(bs.loot.materials)) {
      inv.addMaterial(matId, Math.floor(qty * 0.8))
    }
    for (const id of bs.partyIds) gainBattleExp(id, Math.floor(bs.loot.exp * 0.8))
    for (const id of bs.partyIds) {
      const c = characters.find((x) => x.id === id)
      if (c) updateCurrentHp(id, c.stats.hp)
    }
    setActiveBattle(null)
    setResult('retreat')
  }

  function handleNextStage() {
    if (!bs) return
    const next = advanceStage(bs)
    if (next.battlePhase === 'player-action') {
      const slot = next.turnOrder[next.currentTurnIndex]
      if (slot && !slot.isPlayer) {
        const enemy = next.enemies.find((e) => e.id === slot.id)
        if (enemy && enemy.hp > 0) {
          setBs(processEnemyTurn(next, next.currentTurnIndex, enemy))
          return
        }
      }
    }
    setBs(next)
  }

  // ─── Render: party select ─────────────────────────────────────────────
  if (!bs && result === null) {
    const eligible = characters.filter((c) => c.assignment === null || c.assignment.type === 'dungeon')
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-white">← 戻る</button>
          <h1 className="text-lg font-bold text-slate-200">DL{dl} パーティ選択</h1>
        </div>
        <p className="text-xs text-slate-400 mb-3">1〜5人選択 ({partyIds.length}/5)</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {eligible.map((char) => {
            const master     = getCharacterMaster(char.masterId)
            const sel        = partyIds.includes(char.id)
            const expCur     = char.battleExp - 100 * char.battleLevel * (char.battleLevel - 1) / 2
            const expNeeded  = 100 * char.battleLevel
            const expPct     = Math.min(100, Math.round((expCur / expNeeded) * 100))
            const weaponName = getEquipName(char.equipment.weapon)
            const armorName  = getEquipName(char.equipment.armor)
            return (
              <button key={char.id} onClick={() => toggleParty(char.id)}
                className={`rounded-xl p-3 border text-left transition-colors ${sel
                  ? 'bg-yellow-900 border-yellow-400 text-yellow-100'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-200'}`}>
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="text-sm font-semibold truncate">{master?.name ?? char.masterId}</div>
                  <span className={`text-xs shrink-0 ${TENDENCY_COLOR[char.tendency]}`}>
                    {TENDENCY_LABEL[char.tendency]}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  HP: {char.currentHp}/{char.stats.hp}
                </div>
                {(weaponName || armorName) && (
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {weaponName && `⚔ ${weaponName}`}{weaponName && armorName ? '　' : ''}{armorName && `🛡 ${armorName}`}
                  </div>
                )}
                <div className="mt-1.5">
                  <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                    <span>戦闘 Lv.{char.battleLevel}</span>
                    <span>{expCur}/{expNeeded}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-700 rounded-full">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${expPct}%` }} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        <button onClick={startDungeon} disabled={partyIds.length === 0}
          className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl">
          挑戦する
        </button>
      </div>
    )
  }

  // ─── Render: result ───────────────────────────────────────────────────
  if (result) {
    const loot = bs?.loot
    return (
      <div className="p-4 text-center">
        <div className={`text-3xl font-bold mb-6 ${
          result === 'clear' ? 'text-yellow-300' :
          result === 'wipe'  ? 'text-red-400' : 'text-slate-300'}`}>
          {result === 'clear' ? '🎉 クリア！' : result === 'wipe' ? '全滅...' : '撤退'}
        </div>
        {loot && (
          <div className="bg-slate-800 rounded-xl p-4 mb-6 text-sm text-left space-y-1.5">
            <div className="text-slate-400 font-semibold mb-2">獲得報酬</div>
            <div className="flex justify-between">
              <span className="text-slate-300">ゴールド</span>
              <span className="text-yellow-300 font-bold">
                {result === 'retreat' ? Math.floor(loot.gold * 0.8) : loot.gold}G
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">経験値</span>
              <span className="text-blue-300 font-bold">
                {result === 'retreat' ? Math.floor(loot.exp * 0.8) : loot.exp}
              </span>
            </div>
            {Object.entries(loot.materials).map(([matId, qty]) => {
              const mats = getDungeonMaterials(dl)
              const m = mats.find((x) => x.id === matId)
              const actual = result === 'retreat' ? Math.floor(qty * 0.8) : qty
              return (
                <div key={matId} className="flex justify-between">
                  <span className="text-slate-300">{m?.name ?? matId}</span>
                  <span className="text-green-300">×{actual}</span>
                </div>
              )
            })}
          </div>
        )}
        <button onClick={() => router.push('/dungeon')}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl">
          ダンジョン一覧へ
        </button>
      </div>
    )
  }

  // ─── Render: dungeon battle ───────────────────────────────────────────
  if (!bs) return null
  const slot = bs.turnOrder[bs.currentTurnIndex]
  const isPlayerTurn = slot?.isPlayer && bs.battlePhase === 'player-action'
  const actingChar = isPlayerTurn ? characters.find((c) => c.id === slot.id) : null
  const actingEffStats = actingChar ? effectiveStats(actingChar) : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 shrink-0">
        <div className="text-sm font-semibold text-slate-200">
          DL{dl} — {bs.currentStage + 1}/6ステージ
          <span className="ml-2 text-xs text-slate-400">
            {bs.stageType === 'boss' ? '🔴 BOSS' : bs.stageType === 'elite' ? '🟠 強敵'
              : bs.stageType === 'recovery' ? '💚 回復' : bs.stageType === 'chest' ? '📦 宝箱' : '⚔️ 戦闘'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {/* Enemies */}
        {bs.enemies.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 mb-1">敵</div>
            <div className="flex gap-2 flex-wrap">
              {bs.enemies.map((e) => {
                const isTarget = action === 'attack' || action === 'magic'
                return (
                  <button key={e.id}
                    onClick={() => isTarget && e.hp > 0 && handleAttack(e.id, action === 'magic')}
                    disabled={e.hp <= 0 || !isTarget}
                    className={`rounded-lg p-2 text-center min-w-20 border transition-colors ${
                      e.hp <= 0 ? 'opacity-30 border-slate-700 bg-slate-800' :
                      isTarget ? 'border-yellow-400 bg-slate-700 hover:bg-slate-600 cursor-pointer' :
                      'border-slate-700 bg-slate-800'}`}>
                    <div className="text-xs text-slate-300">
                      {e.type}
                      {e.attribute && (
                        <span className={`ml-1 ${ATTR_COLOR[e.attribute]}`}>[{ATTR_LABEL[e.attribute]}]</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{e.hp}/{e.maxHp}</div>
                    <div className="w-full h-1 bg-slate-700 rounded mt-1">
                      <div className="h-full bg-red-500 rounded" style={{ width: `${(e.hp / e.maxHp) * 100}%` }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Party */}
        <div>
          <div className="text-xs text-slate-500 mb-1">パーティ</div>
          <div className="space-y-1.5">
            {bs.partyIds.map((charId) => {
              const char = characters.find((c) => c.id === charId)!
              if (!char) return null
              const master     = getCharacterMaster(char.masterId)
              const hp         = bs.partyHps[charId] ?? char.stats.hp
              const hpPct      = (hp / char.stats.hp) * 100
              const isActing   = slot?.id === charId && bs.battlePhase === 'player-action'
              const buffs      = bs.partyBuffs[charId] ?? []
              const isItemTarget = action === 'item-target'
              const weaponName = getEquipName(char.equipment.weapon)
              const armorName  = getEquipName(char.equipment.armor)
              return (
                <button key={charId}
                  onClick={() => isItemTarget && hp > 0 && handleUseItem(charId)}
                  disabled={hp <= 0 || !isItemTarget}
                  className={`w-full rounded-lg p-2.5 border text-left transition-colors ${
                    hp <= 0 ? 'opacity-30 border-slate-700 bg-slate-800' :
                    isItemTarget ? 'border-yellow-400 bg-slate-700 hover:bg-slate-600 cursor-pointer' :
                    isActing ? 'border-yellow-300 bg-slate-700' : 'border-slate-700 bg-slate-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-slate-100 truncate">{master?.name}</span>
                      <span className={`text-xs shrink-0 ${TENDENCY_COLOR[char.tendency]}`}>
                        {TENDENCY_LABEL[char.tendency]}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 ml-1">{hp}/{char.stats.hp}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded mb-1">
                    <div className={`h-full rounded transition-all ${hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${hpPct}%` }} />
                  </div>
                  {(weaponName || armorName) && (
                    <div className="text-xs text-slate-500 mb-1 truncate">
                      {weaponName && `⚔ ${weaponName}`}{weaponName && armorName ? '　' : ''}{armorName && `🛡 ${armorName}`}
                    </div>
                  )}
                  {buffs.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {buffs.map((b, i) => (
                        <span key={i} className="text-xs bg-blue-900 text-blue-200 px-1 rounded">
                          {b.type}+{b.percent}%({b.turnsRemaining}T)
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Battle log */}
        <div className="bg-slate-900 rounded-lg p-2 max-h-28 overflow-y-auto">
          {bs.log.slice(-10).reverse().map((line, i) => (
            <div key={i} className="text-xs text-slate-400 leading-5">{line}</div>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div className="border-t border-slate-700 bg-slate-800 p-3 shrink-0">
        {bs.battlePhase === 'result' ? (
          bs.currentStage + 1 >= 6 ? (
            // Final stage cleared: call handleClear directly (must NOT be inside setBs updater)
            <button onClick={() => handleClear(bs)}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2.5 rounded-lg">
              🎉 ダンジョンクリア！
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleRetreat}
                className="bg-slate-700 hover:bg-slate-600 border border-slate-500 text-slate-200 font-bold py-2.5 rounded-lg text-sm">
                撤退 (80%)
              </button>
              <button onClick={handleNextStage}
                className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2.5 rounded-lg text-sm">
                次のステージへ →
              </button>
            </div>
          )
        ) : isPlayerTurn && actingChar ? (
          <div>
            <div className="text-xs text-slate-400 mb-2">
              ⚡ {getCharacterMaster(actingChar.masterId)?.name} のターン
            </div>
            {action === 'menu' && (
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setAction('attack')}
                  className="bg-red-800 hover:bg-red-700 text-white py-2 rounded text-sm font-bold leading-tight">
                  <div>攻撃</div>
                  <div className="text-xs font-normal opacity-80">ATK {actingEffStats?.atk}</div>
                </button>
                <button onClick={() => setAction('magic')}
                  className="bg-purple-800 hover:bg-purple-700 text-white py-2 rounded text-sm font-bold leading-tight">
                  <div>魔法</div>
                  <div className="text-xs font-normal opacity-80">MAG {actingEffStats?.mag}</div>
                </button>
                <button onClick={() => setAction('item')}
                  className="bg-slate-600 hover:bg-slate-500 text-white py-2 rounded text-sm font-bold">アイテム</button>
              </div>
            )}
            {(action === 'attack' || action === 'magic') && (
              <div className="flex items-center gap-2">
                <button onClick={() => setAction('menu')} className="text-xs text-slate-400 hover:text-white border border-slate-600 px-2 py-1 rounded">← 戻る</button>
                <span className="text-xs text-slate-400">↑ 攻撃する敵を選択</span>
              </div>
            )}
            {action === 'item' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setAction('menu')} className="text-xs text-slate-400 hover:text-white border border-slate-600 px-2 py-1 rounded">← 戻る</button>
                  <span className="text-xs text-slate-400">アイテムを選択</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {DUNGEON_ITEMS.map((itemId) => {
                    const qty = dungeonItems[itemId] ?? 0
                    const recipe = getRecipe(itemId)
                    return (
                      <button key={itemId} disabled={qty <= 0}
                        onClick={() => { setSelectedItem(itemId); setAction('item-target') }}
                        className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 border border-slate-600 rounded p-2 text-left text-xs">
                        <div className="text-slate-200 font-medium">{recipe?.name}</div>
                        <div className="text-slate-400">残り{qty}個</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {action === 'item-target' && (
              <div className="flex items-center gap-2">
                <button onClick={() => setAction('item')} className="text-xs text-slate-400 hover:text-white border border-slate-600 px-2 py-1 rounded">← 戻る</button>
                <span className="text-xs text-slate-400">↑ 対象キャラクターを選択</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-sm text-slate-500 py-1">敵のターン...</div>
        )}
      </div>
    </div>
  )
}
