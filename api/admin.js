// Server-side admin operations — uses service role key to bypass RLS
import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  const supabaseUrl = process.env.SUPABASE_URL

  if (!serviceKey || !supabaseUrl) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  let body
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { action, gameId } = body

  if (action === 'renamePlayer') {
    const { oldName, newName } = body
    if (!oldName || !newName) {
      return new Response(JSON.stringify({ error: 'oldName and newName required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    try {
      // Update profiles table (service key bypasses RLS — anon key is blocked for cross-user updates)
      await supabase.from('profiles').update({ username: newName }).eq('username', oldName)
      // Sync auth user_metadata so it never drifts out of step with profiles
      const { data: profile } = await supabase.from('profiles').select('id').eq('username', newName).maybeSingle()
      if (profile?.id) {
        await supabase.auth.admin.updateUserById(profile.id, { user_metadata: { username: newName } })
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  if (action === 'deleteGame') {
    if (!gameId) {
      return new Response(JSON.stringify({ error: 'gameId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    try {
      await supabase.from('game_players').delete().eq('game_id', gameId)
      await supabase.from('game_states').delete().eq('game_id', gameId)
      const { error } = await supabase.from('games_index').delete().eq('id', gameId)
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
