// Regression test for the Players tab blank-screen bug.
//
// Root cause: AdminView was referencing `activeGameId` (a useState variable
// scoped to App) instead of the `gameId` prop it receives. This caused a
// ReferenceError when the Players tab was clicked, crashing the entire
// component tree to a blank screen.
//
// This test renders AdminView with an explicit gameId prop, clicks the Players
// tab, and asserts that the player list renders without error — which would
// fail immediately if `activeGameId` (undefined) were re-introduced.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// vi.mock is hoisted above imports, so the mock factory must not reference
// variables declared below it. We expose the spy via the mocked module instead.
vi.mock('../lib/supabase.js', () => ({
  supabase: { channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })) })), removeChannel: vi.fn() },
  signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), getSession: vi.fn(),
  onAuthChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  getGamesIndex: vi.fn(), createGameInDB: vi.fn(), findGameByJoinCode: vi.fn(),
  getUserGames: vi.fn(), loadGameState: vi.fn(), saveGameState: vi.fn(),
  subscribeToGame: vi.fn(() => ({})), unsubscribeFromGame: vi.fn(),
  getUsernameForUser: vi.fn(), addPlayerToGame: vi.fn(), removePlayerFromGame: vi.fn(),
  getPlayerEmails: vi.fn().mockResolvedValue({
    admin: 'admin@test.com',
    alice: 'alice@test.com',
    bob: 'bob@test.com',
  }),
  resetPasswordForEmail: vi.fn(), updatePassword: vi.fn(),
  getAllGames: vi.fn(), deleteGame: vi.fn(), getGamePlayerCounts: vi.fn(),
}))

// Import after vi.mock so we get the mocked versions
import { getPlayerEmails } from '../lib/supabase.js'
import { AdminView, makeGameState } from '../App.jsx'

function makeTestGame() {
  return {
    ...makeGameState('Test Game', 'admin'),
    players: ['admin', 'alice', 'bob'],
    matches: [],
  }
}

describe('AdminView — Players tab', () => {
  it('renders the player list without crashing', async () => {
    render(
      <AdminView
        game={makeTestGame()}
        gameId="game-abc-123"   // explicit prop — must be forwarded to PlayersTab
        gameMeta={{ joinCode: 'TESTX', adminId: 'admin' }}
        dispatch={vi.fn()}
        session={{ username: 'admin' }}
        onLeaveGame={vi.fn()}
      />
    )

    // Click the Players tab
    fireEvent.click(screen.getByRole('button', { name: 'Players' }))

    // Players should be visible — this fails if gameId is undefined because
    // getPlayerEmails would be called with wrong args and the component may crash
    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
      expect(screen.getByText('alice')).toBeInTheDocument()
      expect(screen.getByText('bob')).toBeInTheDocument()
    })
  })

  it('calls getPlayerEmails with the game players (not with undefined)', async () => {
    render(
      <AdminView
        game={makeTestGame()}
        gameId="game-abc-123"
        gameMeta={{ joinCode: 'TESTX', adminId: 'admin' }}
        dispatch={vi.fn()}
        session={{ username: 'admin' }}
        onLeaveGame={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Players' }))

    await waitFor(() => {
      expect(getPlayerEmails).toHaveBeenCalledWith(['admin', 'alice', 'bob'])
    })
  })
})
