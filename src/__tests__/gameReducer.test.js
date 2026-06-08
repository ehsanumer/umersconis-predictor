// Unit tests for gameReducer — pure function, no rendering or network calls.
// These run fast and catch regressions in state transitions.
import { describe, it, expect, vi } from 'vitest'

// Mock supabase before App.jsx is imported (vi.mock is hoisted automatically)
vi.mock('../lib/supabase.js', () => ({
  supabase: { channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })) })), removeChannel: vi.fn() },
  signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), getSession: vi.fn(),
  onAuthChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  getGamesIndex: vi.fn(), createGameInDB: vi.fn(), findGameByJoinCode: vi.fn(),
  getUserGames: vi.fn(), loadGameState: vi.fn(), saveGameState: vi.fn(),
  subscribeToGame: vi.fn(() => ({})), unsubscribeFromGame: vi.fn(),
  getUsernameForUser: vi.fn(), addPlayerToGame: vi.fn(), removePlayerFromGame: vi.fn(),
  getPlayerEmails: vi.fn().mockResolvedValue({}), resetPasswordForEmail: vi.fn(),
  updatePassword: vi.fn(), getAllGames: vi.fn(), deleteGame: vi.fn(),
  getGamePlayerCounts: vi.fn(),
}))

import { gameReducer, makeGameState } from '../App.jsx'

// ─── helpers ──────────────────────────────────────────────────────────────────
function makeGame(overrides = {}) {
  return { ...makeGameState('Test Game', 'admin'), players: ['admin', 'alice', 'bob'], ...overrides }
}

function makeMatch(overrides = {}) {
  return { id: 'm1', teams: 'Spain v Morocco', stage: 'group', kickoff: '2026-06-12T18:00:00Z', ...overrides }
}

// ─── ENTER_RESULT ─────────────────────────────────────────────────────────────
describe('ENTER_RESULT', () => {
  it('sets result and score on the correct match', () => {
    const state = makeGame({ matches: [makeMatch(), makeMatch({ id: 'm2', teams: 'France v USA' })] })
    const next = gameReducer(state, { type: 'ENTER_RESULT', matchId: 'm1', result: 'H', score: '2-1' })
    const m1 = next.matches.find(m => m.id === 'm1')
    const m2 = next.matches.find(m => m.id === 'm2')
    expect(m1.result).toBe('H')
    expect(m1.score).toBe('2-1')
    expect(m2.result).toBeUndefined()
  })
})

// ─── SYNC_RESULTS ─────────────────────────────────────────────────────────────
describe('SYNC_RESULTS', () => {
  it('updates result and score for matched matches', () => {
    const state = makeGame({ matches: [makeMatch()] })
    const next = gameReducer(state, {
      type: 'SYNC_RESULTS',
      results: [{ matchId: 'm1', result: 'A', score: '0-1' }],
      source: 'cron',
    })
    expect(next.matches[0].result).toBe('A')
    expect(next.matches[0].score).toBe('0-1')
  })

  it('appends an audit log entry when a result changes', () => {
    const state = makeGame({ matches: [makeMatch({ result: 'H', score: '1-0' })] })
    const next = gameReducer(state, {
      type: 'SYNC_RESULTS',
      results: [{ matchId: 'm1', result: 'A', score: '0-1' }],
      source: 'cron',
    })
    expect(next.resultSyncLog).toHaveLength(1)
    expect(next.resultSyncLog[0].from).toEqual({ result: 'H', score: '1-0' })
    expect(next.resultSyncLog[0].to).toEqual({ result: 'A', score: '0-1' })
    expect(next.resultSyncLog[0].source).toBe('cron')
    expect(next.resultSyncLog[0].matchId).toBe('m1')
  })

  it('does NOT overwrite a locked match', () => {
    const state = makeGame({
      matches: [makeMatch({ result: 'H', score: '1-0' })],
      lockedResults: { m1: true },
    })
    const next = gameReducer(state, {
      type: 'SYNC_RESULTS',
      results: [{ matchId: 'm1', result: 'A', score: '0-1' }],
    })
    expect(next.matches[0].result).toBe('H')  // unchanged
    expect(next.resultSyncLog).toHaveLength(0) // no log entry
  })

  it('returns the same state reference when nothing changes', () => {
    const state = makeGame({ matches: [makeMatch({ result: 'H', score: '1-0' })] })
    const next = gameReducer(state, {
      type: 'SYNC_RESULTS',
      results: [{ matchId: 'm1', result: 'H', score: '1-0' }], // identical
    })
    expect(next).toBe(state)
  })

  it('caps resultSyncLog at 49 entries', () => {
    const existingLog = Array.from({ length: 49 }, (_, i) => ({ matchId: `m${i}` }))
    const state = makeGame({
      matches: [makeMatch({ result: 'H', score: '1-0' })],
      resultSyncLog: existingLog,
    })
    const next = gameReducer(state, {
      type: 'SYNC_RESULTS',
      results: [{ matchId: 'm1', result: 'A', score: '0-2' }],
    })
    expect(next.resultSyncLog).toHaveLength(49)
  })
})

// ─── TOGGLE_RESULT_LOCK ───────────────────────────────────────────────────────
describe('TOGGLE_RESULT_LOCK', () => {
  it('locks an unlocked match', () => {
    const state = makeGame()
    const next = gameReducer(state, { type: 'TOGGLE_RESULT_LOCK', matchId: 'm1' })
    expect(next.lockedResults.m1).toBe(true)
  })

  it('unlocks a locked match', () => {
    const state = makeGame({ lockedResults: { m1: true } })
    const next = gameReducer(state, { type: 'TOGGLE_RESULT_LOCK', matchId: 'm1' })
    expect(next.lockedResults.m1).toBeUndefined()
  })

  it('does not affect other locks', () => {
    const state = makeGame({ lockedResults: { m2: true } })
    const next = gameReducer(state, { type: 'TOGGLE_RESULT_LOCK', matchId: 'm1' })
    expect(next.lockedResults.m1).toBe(true)
    expect(next.lockedResults.m2).toBe(true)
  })
})

// ─── SUBMIT_RELATIONSHIPS ─────────────────────────────────────────────────────
describe('SUBMIT_RELATIONSHIPS', () => {
  it('stores vendettas and BFFs for the player', () => {
    const state = makeGame()
    const vendettas = [{ target: 'alice', reason: 'always lucky' }]
    const bffs = [{ target: 'bob', reason: 'solid picks' }]
    const next = gameReducer(state, { type: 'SUBMIT_RELATIONSHIPS', player: 'admin', vendettas, bffs })
    expect(next.relationships.admin.vendettas).toEqual(vendettas)
    expect(next.relationships.admin.bffs).toEqual(bffs)
  })

  it('marks the player as completed', () => {
    const state = makeGame()
    const next = gameReducer(state, {
      type: 'SUBMIT_RELATIONSHIPS', player: 'alice',
      vendettas: [{ target: 'bob', reason: 'test' }],
      bffs: [{ target: 'admin', reason: 'test' }],
    })
    expect(next.relationshipsCompleted).toContain('alice')
  })

  it('does not duplicate a player in relationshipsCompleted', () => {
    const state = makeGame({ relationshipsCompleted: ['alice'] })
    const next = gameReducer(state, {
      type: 'SUBMIT_RELATIONSHIPS', player: 'alice',
      vendettas: [{ target: 'bob', reason: 'still hate' }],
      bffs: [{ target: 'admin', reason: 'still fine' }],
    })
    expect(next.relationshipsCompleted.filter(p => p === 'alice')).toHaveLength(1)
  })
})

// ─── TOGGLE_RELATIONSHIPS_UNLOCK ──────────────────────────────────────────────
describe('TOGGLE_RELATIONSHIPS_UNLOCK', () => {
  it('toggles from false to true', () => {
    const state = makeGame()
    expect(gameReducer(state, { type: 'TOGGLE_RELATIONSHIPS_UNLOCK' }).relationshipsUnlocked).toBe(true)
  })

  it('toggles from true to false', () => {
    const state = makeGame({ relationshipsUnlocked: true })
    expect(gameReducer(state, { type: 'TOGGLE_RELATIONSHIPS_UNLOCK' }).relationshipsUnlocked).toBe(false)
  })
})
