import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export async function signUp(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }
  })
  if (error) throw error
  // Also store username in a profile row for reliable retrieval
  if (data.user) {
    try {
      await supabase.from('profiles').upsert({ id: data.user.id, username, email })
    } catch(e) { /* non-fatal */ }
  }
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getUsernameForUser(userId, email) {
  // Try profiles table first (most reliable)
  try {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single()
    if (data?.username) return data.username
  } catch {}
  // Fallback to email prefix
  return email ? email.split('@')[0] : 'Player'
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => callback(event, session))
}

// ─── GAMES INDEX ──────────────────────────────────────────────────────────────

export async function getGamesIndex() {
  const { data, error } = await supabase
    .from('games_index')
    .select('*')
  if (error) throw error
  return Object.fromEntries((data || []).map(g => [g.id, {
    name: g.name,
    joinCode: g.join_code,
    adminId: g.admin_id,
    createdAt: g.created_at,
  }]))
}

export async function createGameInDB(id, meta) {
  const { error } = await supabase
    .from('games_index')
    .insert({ id, name: meta.name, join_code: meta.joinCode, admin_id: meta.adminId })
  if (error) throw error
}

export async function findGameByJoinCode(code) {
  const { data, error } = await supabase
    .from('games_index')
    .select('*')
    .eq('join_code', code.toUpperCase())
    .single()
  if (error) return null
  return data ? { id: data.id, meta: { name: data.name, joinCode: data.join_code, adminId: data.admin_id } } : null
}

export async function getUserGames(username) {
  // Use game_players table for fast reliable lookup
  try {
    const { data, error } = await supabase
      .from('game_players')
      .select('game_id')
      .eq('username', username)
    if (error) throw error
    return (data || []).map(r => r.game_id)
  } catch {
    // Fallback: scan game states
    const { data } = await supabase.from('game_states').select('game_id, state_json')
    return (data || []).filter(row => {
      try { return JSON.parse(row.state_json).players?.includes(username) } catch { return false }
    }).map(row => row.game_id)
  }
}

export async function addPlayerToGame(gameId, username) {
  try { await supabase.from('game_players').upsert({ game_id: gameId, username }) } catch {}
}

export async function resetPasswordForEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  })
  if (error) throw error
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// ─── GAME STATE ───────────────────────────────────────────────────────────────

export async function loadGameState(gameId) {
  const { data, error } = await supabase
    .from('game_states')
    .select('state_json')
    .eq('game_id', gameId)
    .single()
  if (error) return null
  try { return JSON.parse(data.state_json) } catch { return null }
}

export async function saveGameState(gameId, state) {
  const { error } = await supabase
    .from('game_states')
    .upsert({ game_id: gameId, state_json: JSON.stringify(state), updated_at: new Date().toISOString() })
  if (error) throw error
}

// ─── REALTIME ─────────────────────────────────────────────────────────────────

export function subscribeToGame(gameId, callback) {
  return supabase
    .channel(`game:${gameId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'game_states',
      filter: `game_id=eq.${gameId}`,
    }, payload => {
      try {
        const state = JSON.parse(payload.new.state_json)
        callback(state)
      } catch {}
    })
    .subscribe()
}

export function unsubscribeFromGame(channel) {
  supabase.removeChannel(channel)
}
