import { useState, useEffect, useCallback, useRef } from "react";
import {
  supabase, signUp, signIn, signOut, getSession, onAuthChange,
  getGamesIndex, createGameInDB, findGameByJoinCode, getUserGames,
  loadGameState, saveGameState, subscribeToGame, unsubscribeFromGame,
  getUsernameForUser, addPlayerToGame, removePlayerFromGame, getPlayerEmails,
  resetPasswordForEmail, updatePassword, getAllGames, deleteGame, getGamePlayerCounts,
} from "./lib/supabase.js";

// ─── THEME — USA 94 DENIM STARS ──────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@400;500;600;700&family=Barlow+Condensed:ital,wght@0,400;0,600;1,400&display=swap');
    :root {
      --pitch: #1B3358; --pitch-light: #233F6A;
      --gold: #CC1020; --gold-light: #E8152A;
      --cream: #FFFFFF; --ink: #060F22;
      --red: #CC1020; --red-dark: #9A0C18;
      --silver: #5A7AA0; --card-bg: #142846;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--pitch); font-family: 'Barlow Condensed', sans-serif;
      color: var(--cream); min-height: 100vh;
    }
    .app {
      min-height: 100vh;
      background-color: #142846;
      background-image:
        repeating-linear-gradient(135deg, transparent 0, transparent 2px, rgba(0,0,0,0.13) 2px, rgba(0,0,0,0.13) 4px),
        repeating-linear-gradient(45deg,  transparent 0, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px),
        repeating-linear-gradient(90deg,  transparent 0, transparent 9px, rgba(255,255,255,0.012) 9px, rgba(255,255,255,0.012) 10px),
        repeating-linear-gradient(0deg,   transparent 0, transparent 9px, rgba(255,255,255,0.008) 9px, rgba(255,255,255,0.008) 10px);
    }

    /* STRIPE — thin repeating flag stripes, not a loading bar */
    .app-stripe { height: 14px; background: repeating-linear-gradient(90deg, #CC1020 0px 22px, #fff 22px 26px, #060F22 26px 48px, #fff 48px 52px); box-shadow: 0 3px 14px rgba(204,16,32,0.6); }

    /* HEADER */
    .header { background: rgba(6,15,34,0.97); border-bottom: 3px solid var(--red); position: sticky; top: 0; z-index: 100; }
    .header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 64px; gap: 12px; }
    .logo { font-family: 'Anton', sans-serif; font-size: 26px; letter-spacing: 3px; color: var(--cream); line-height: 1; white-space: nowrap; }
    .logo span { color: var(--red); }
    .game-badge { font-family: 'Oswald', sans-serif; font-weight: 600; font-size: 12px; letter-spacing: 2px; color: var(--silver); border: 1px solid rgba(204,16,32,0.3); padding: 3px 10px; border-radius: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
    .nav { display: flex; gap: 2px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
    .nav::-webkit-scrollbar { display: none; }
    .nav-btn { font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 2px; font-size: 13px; padding: 8px 12px; border: none; background: transparent; color: var(--silver); cursor: pointer; transition: all 0.2s; border-bottom: 3px solid transparent; white-space: nowrap; }
    .nav-btn:hover { color: var(--cream); }
    .nav-btn.active { color: var(--cream); border-bottom-color: var(--red); }
    .nav-btn.admin { color: var(--red); }
    .nav-btn.admin.active { color: var(--red); border-bottom-color: var(--red); }
    .user-pill { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--silver); white-space: nowrap; }
    .user-pill strong { color: var(--cream); font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 1px; }
    .admin-badge { font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 1px; background: var(--red); color: white; padding: 2px 8px; border-radius: 2px; box-shadow: 0 0 10px rgba(204,16,32,0.5); }
    .logout-btn { font-family: 'Oswald', sans-serif; font-weight: 600; letter-spacing: 1px; font-size: 11px; padding: 4px 8px; border: 1px solid rgba(255,255,255,0.15); background: transparent; color: var(--silver); border-radius: 2px; cursor: pointer; }
    .logout-btn:hover { border-color: var(--red); color: var(--cream); }

    /* HERO — the 1994 denim stars shirt */
    .hero {
      padding: 56px 24px 48px; text-align: center; position: relative; overflow: hidden;
      background-color: #1B3358;
      background-image:
        repeating-linear-gradient(135deg, transparent 0, transparent 2px, rgba(0,0,0,0.16) 2px, rgba(0,0,0,0.16) 4px),
        repeating-linear-gradient(45deg,  transparent 0, transparent 2px, rgba(0,0,0,0.09) 2px, rgba(0,0,0,0.09) 4px),
        radial-gradient(ellipse at 25% 60%, rgba(8,18,50,0.35) 0%, transparent 65%),
        radial-gradient(ellipse at 80% 15%, rgba(25,55,120,0.25) 0%, transparent 55%);
    }
    /* V-neck collar — the defining detail of the home kit */
    .hero-vneck { position: absolute; top: 0; left: 50%; transform: translateX(-50%); z-index: 5; pointer-events: none; }
    .hero-vneck::before { content: ''; display: block; width: 0; height: 0; border-left: 80px solid transparent; border-right: 80px solid transparent; border-top: 56px solid #CC1020; filter: drop-shadow(0 6px 10px rgba(204,16,32,0.6)); }
    .hero-vneck::after { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid rgba(255,255,255,0.7); border-right: 8px solid rgba(255,255,255,0.7); border-top: 56px solid transparent; }
    /* SVG star layer — proper geometric 5-point stars at -36°, diagonal bands */
    .hero-stars { position: absolute; inset: 0; pointer-events: none; z-index: 1; width: 100%; height: 100%; }
    /* All other hero children sit above the stars */
    .hero > :not(.hero-vneck):not(.hero-stars) { position: relative; z-index: 2; }
    .hero-eyebrow { font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 8px; font-size: 11px; color: rgba(255,255,255,0.55); margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 12px; }
    .hero-eyebrow-stars { color: var(--red); font-size: 14px; letter-spacing: 4px; text-shadow: 0 0 16px rgba(204,16,32,0.9); }
    .hero-title { font-family: 'Anton', sans-serif; font-size: clamp(42px,7vw,88px); font-weight: 400; color: var(--cream); line-height: 0.9; margin-bottom: 6px; text-shadow: 4px 4px 0 rgba(0,0,0,0.4); letter-spacing: 2px; }
    .hero-title em { color: var(--red); font-style: normal; text-shadow: 0 0 40px rgba(204,16,32,0.5), 4px 4px 0 rgba(0,0,0,0.4); }
    .hero-sub { font-style: italic; color: var(--silver); font-size: 14px; margin-bottom: 32px; letter-spacing: 1px; }
    .hero-stats { display: flex; justify-content: center; gap: 0; flex-wrap: wrap; }
    .hero-stat { text-align: center; padding: 0 32px; }
    .hero-stat + .hero-stat { border-left: 1px solid rgba(255,255,255,0.08); }
    .hero-stat-num { font-family: 'Anton', sans-serif; font-size: 48px; color: var(--red); line-height: 1; text-shadow: 0 0 30px rgba(204,16,32,0.4), 3px 3px 0 rgba(0,0,0,0.3); }
    .hero-stat-label { font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: var(--silver); margin-top: 2px; }

    /* RED TICKER */
    .ticker { background: var(--red); overflow: hidden; height: 50px; display: flex; align-items: center; box-shadow: 0 0 28px rgba(204,16,32,0.55); border-top: 2px solid rgba(255,255,255,0.12); border-bottom: 2px solid rgba(255,255,255,0.12); }
    .ticker-track { display: flex; white-space: nowrap; animation: ticker-scroll 22s linear infinite; font-family: 'Anton', sans-serif; font-size: 14px; letter-spacing: 6px; color: var(--cream); }
    .ticker-item { padding: 0 20px; display: flex; align-items: center; gap: 14px; }
    .ticker-star { font-size: 18px; }
    @keyframes ticker-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

    /* PAGE */
    .page { max-width: 1200px; margin: 0 auto; padding: 28px 20px; }
    .section-header { display: flex; align-items: center; gap: 0; margin-bottom: 20px; }
    .section-title {
      font-family: 'Anton', sans-serif; font-size: 26px; letter-spacing: 3px; color: var(--cream);
      background: var(--red); padding: 6px 22px 6px 16px; display: flex; align-items: center; gap: 8px;
      clip-path: polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%);
      box-shadow: 4px 0 20px rgba(204,16,32,0.45);
    }
    .section-title-star { font-size: 13px; color: rgba(255,255,255,0.65); }
    .section-rule { flex: 1; height: 2px; background: linear-gradient(90deg, rgba(204,16,32,0.4), transparent); margin-left: 2px; }
    .section-sub { font-style: italic; font-size: 12px; color: var(--silver); padding-left: 14px; white-space: nowrap; }

    /* LEADERBOARD */
    .lb-row {
      background: #142846; border: 1px solid rgba(204,16,32,0.15); border-radius: 0; display: grid;
      grid-template-columns: 48px 1fr 90px 70px 70px 70px 70px 90px 70px 70px;
      align-items: center; padding: 14px 16px; transition: all 0.2s; position: relative; overflow: hidden;
      background-image: repeating-linear-gradient(135deg, transparent 0, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px);
    }
    .lb-row::after { content: ''; position: absolute; right: 10px; top: 50%; transform: translateY(-50%) rotate(-36deg); width: 60px; height: 60px; opacity: 0.04; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-1.1 -1.1 2.2 2.2'%3E%3Cpolygon points='0,-1 .2245,-.309 .9511,-.309 .363,.118 .5878,.809 0,.382 -.5878,.809 -.363,.118 -.9511,-.309 -.2245,-.309' fill='white'/%3E%3C/svg%3E") center/contain no-repeat; }
    .lb-row:nth-child(even) { background-color: #0E1E38; }
    .lb-row:hover { background-color: rgba(204,16,32,0.12) !important; border-color: rgba(204,16,32,0.3); }
    .lb-row.rank-1 { background: linear-gradient(90deg, rgba(204,16,32,0.18), #142846) !important; border-left: 5px solid var(--red); }
    .lb-row.rank-1::after { width: 90px; height: 90px; opacity: 0.1; }
    .lb-row.rank-2 { background: linear-gradient(90deg, rgba(255,255,255,0.04), #142846) !important; border-left: 5px solid rgba(255,255,255,0.2); }
    .lb-row.rank-3 { border-left: 5px solid rgba(255,255,255,0.08); }
    .lb-row.header-row { background: var(--ink) !important; color: var(--silver); font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 2px; font-size: 11px; padding: 9px 16px; border: none; border-radius: 0; border-bottom: 2px solid var(--red); }
    .lb-row.header-row::after { display: none; }
    .lb-row.header-row:hover { background: var(--ink) !important; }
    .lb-rank { font-family: 'Anton', sans-serif; font-size: 22px; color: rgba(255,255,255,0.2); }
    .lb-rank.gold { color: var(--red); text-shadow: 0 0 16px rgba(204,16,32,0.6); }
    .lb-rank.silver { color: rgba(255,255,255,0.5); }
    .lb-rank.bronze { color: rgba(255,255,255,0.3); }
    .lb-name { font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 17px; color: var(--cream); }
    .lb-name-sub { font-size: 11px; color: var(--silver); font-weight: 400; }
    .lb-score { font-family: 'Anton', sans-serif; font-size: 28px; color: var(--cream); text-align: right; }
    .lb-score.leader { color: var(--red); text-shadow: 0 0 16px rgba(204,16,32,0.4); }
    .lb-component { text-align: right; font-size: 12px; color: var(--silver); }
    .lb-component.positive { color: #4ade80; font-weight: 700; }
    .lb-component.negative { color: var(--red); }
    .lb-component.gold { color: var(--red); }
    .lb-badge { display: inline-block; font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 1px; padding: 1px 6px; border-radius: 2px; margin-left: 6px; }
    .badge-umer { background: var(--red); color: white; }
    .badge-fine { background: var(--red); color: white; }

    /* MATCHES */
    .matches-grid { display: flex; flex-direction: column; gap: 10px; }
    .date-group-header { font-family: 'Anton', sans-serif; letter-spacing: 3px; font-size: 14px; color: var(--cream); background: var(--ink); padding: 8px 16px; border-radius: 2px; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--red); }
    .match-card {
      background: #142846; border: 1px solid rgba(204,16,32,0.2); border-radius: 3px; overflow: hidden; position: relative;
      background-image: repeating-linear-gradient(135deg, transparent 0, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px);
    }
    .match-header { background: linear-gradient(90deg, rgba(204,16,32,0.18) 0%, transparent 60%); color: var(--cream); padding: 11px 16px; display: flex; justify-content: space-between; align-items: center; border-left: 6px solid var(--red); border-bottom: 1px solid rgba(204,16,32,0.15); }
    .match-teams { font-family: 'Oswald', sans-serif; font-size: 17px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .match-meta { font-size: 11px; color: var(--silver); margin-top: 2px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; letter-spacing: 0.5px; }
    .match-result { font-family: 'Anton', sans-serif; font-size: 22px; color: var(--red); letter-spacing: 2px; text-shadow: 0 0 20px rgba(204,16,32,0.7); background: rgba(204,16,32,0.1); border: 1px solid rgba(204,16,32,0.3); padding: 3px 12px; border-radius: 2px; }
    .match-body { padding: 12px 16px; }
    .match-predictions { display: flex; gap: 6px; flex-wrap: wrap; }
    .prediction-chip { display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 4px; font-size: 12px; border: 1px solid transparent; }
    .prediction-chip.correct-score  { background: rgba(74,222,128,0.08);  border-color: rgba(74,222,128,0.4);  color: #4ade80; }
    .prediction-chip.correct-result { background: rgba(96,165,250,0.08);  border-color: rgba(96,165,250,0.35); color: #93c5fd; }
    .prediction-chip.wrong   { background: rgba(204,16,32,0.1);   border-color: rgba(204,16,32,0.35);  color: #ff7088; }
    .prediction-chip.pending { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1);  color: var(--silver); }
    .chip-name { font-weight: 700; font-size: 11px; }
    .chip-pred { font-family: 'Oswald', sans-serif; font-weight: 600; letter-spacing: 1px; }
    .tag-ko { background: rgba(204,16,32,0.15); color: var(--red); border: 1px solid rgba(204,16,32,0.4); font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 1px; padding: 2px 6px; border-radius: 2px; }

    /* SCORE INPUTS */
    .method-btns { display: flex; gap: 6px; margin-top: 4px; }
    .method-btn { font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 1px; font-size: 12px; padding: 6px 12px; border: 2px solid rgba(255,255,255,0.1); border-radius: 4px; background: rgba(255,255,255,0.04); color: var(--silver); cursor: pointer; transition: all 0.15s; }
    .method-btn:hover { border-color: var(--red); color: var(--cream); }
    .method-btn.selected-aet  { background: rgba(74,222,128,0.1); border-color: #4ade80; color: #4ade80; }
    .method-btn.selected-pens { background: rgba(168,85,247,0.1); border-color: #a855f7; color: #a855f7; }
    .score-inputs { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .score-team { font-family: 'Oswald', sans-serif; font-size: 14px; font-weight: 700; flex: 1; min-width: 0; word-break: break-word; color: var(--cream); letter-spacing: 0.5px; }
    .score-num { width: 52px; text-align: center; font-family: 'Anton', sans-serif; font-size: 26px; padding: 6px 8px; border: 2px solid rgba(204,16,32,0.3); border-radius: 4px; background: rgba(204,16,32,0.06); color: var(--cream); -moz-appearance: textfield; }
    .score-num::-webkit-outer-spin-button, .score-num::-webkit-inner-spin-button { -webkit-appearance: none; }
    .score-num:focus { outline: none; border-color: var(--red); box-shadow: 0 0 10px rgba(204,16,32,0.4); }
    .score-sep { font-family: 'Anton', sans-serif; font-size: 22px; color: rgba(255,255,255,0.15); }

    /* TOURNIE */
    .tournie-grid { display: grid; gap: 1px; background: rgba(204,16,32,0.15); border: 1px solid rgba(204,16,32,0.2); border-radius: 0; overflow: hidden; font-size: 11px; }
    .tg-cell { background: #142846; padding: 8px 10px; text-align: center; color: var(--cream); }
    .tg-cell.header { background: var(--ink); color: var(--red); font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 1px; font-size: 11px; }
    .tg-cell.label { background: #0E1E38; text-align: left; font-style: italic; color: var(--silver); }
    .tg-cell.correct { background: rgba(74,222,128,0.1); color: #4ade80; font-weight: 700; border: 1px solid rgba(74,222,128,0.3); }
    .tg-cell.wrong { background: rgba(204,16,32,0.12); color: #ff7088; }

    /* CHAOS */
    .chaos-entry { display: flex; align-items: flex-start; gap: 12px; background: #142846; border: 1px solid rgba(204,16,32,0.15); border-radius: 3px; padding: 12px 16px; background-image: repeating-linear-gradient(135deg, transparent 0, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px); }
    .chaos-icon { font-size: 22px; line-height: 1; }
    .chaos-body { flex: 1; }
    .chaos-player { font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 15px; color: var(--cream); }
    .chaos-reason { font-size: 12px; color: var(--silver); margin-top: 2px; }
    .chaos-pts { font-family: 'Anton', sans-serif; font-size: 22px; white-space: nowrap; }
    .chaos-pts.positive { color: var(--red); text-shadow: 0 0 12px rgba(204,16,32,0.4); }
    .chaos-pts.negative { color: var(--silver); }

    /* ADMIN */
    .admin-panel { background: rgba(204,16,32,0.06); border: 2px solid var(--red); border-radius: 4px; padding: 24px; margin-bottom: 24px; }
    .admin-title { font-family: 'Anton', sans-serif; font-size: 22px; letter-spacing: 4px; color: var(--red); margin-bottom: 4px; }
    .admin-sub { font-style: italic; color: var(--silver); font-size: 12px; margin-bottom: 20px; }
    .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .admin-field { display: flex; flex-direction: column; gap: 5px; }
    .admin-label { font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 2px; font-size: 12px; color: var(--silver); }
    .admin-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(204,16,32,0.3); border-radius: 3px; color: var(--cream); padding: 9px 12px; font-family: 'Barlow Condensed', sans-serif; font-size: 14px; transition: border-color 0.2s; }
    .admin-input:focus { outline: none; border-color: var(--red); }
    .admin-input option { background: #060F22; }

    /* BUTTONS */
    .btn { font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 2px; font-size: 14px; padding: 10px 22px; border: none; border-radius: 3px; cursor: pointer; transition: all 0.15s; }
    .btn-gold { background: var(--red); color: white; box-shadow: 0 3px 16px rgba(204,16,32,0.45); }
    .btn-gold:hover { background: var(--gold-light); }
    .btn-red { background: var(--red); color: white; } .btn-red:hover { background: var(--red-dark); }
    .btn-green { background: #27ae60; color: white; } .btn-green:hover { background: #1e8449; }
    .btn-pitch { background: var(--pitch); color: var(--cream); border: 1px solid rgba(255,255,255,0.15); } .btn-pitch:hover { background: var(--pitch-light); }
    .btn-sm { padding: 6px 12px; font-size: 11px; }
    .btn:disabled { opacity: 0.45; cursor: not-allowed; }

    /* TABS */
    .tabs { display: flex; gap: 0; margin-bottom: 20px; border-bottom: 2px solid rgba(204,16,32,0.3); overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
    .tabs::-webkit-scrollbar { display: none; }
    .tab { font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 2px; font-size: 13px; padding: 9px 16px; background: transparent; border: none; color: var(--silver); cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -2px; transition: all 0.2s; white-space: nowrap; }
    .tab:hover { color: var(--cream); }
    .tab.active { color: var(--cream); border-bottom-color: var(--red); }

    /* PRED INPUTS */
    .pred-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 3px; padding: 7px 10px; font-family: 'Barlow Condensed', sans-serif; font-size: 13px; width: 100%; color: var(--cream); }
    .pred-input:focus { outline: none; border-color: var(--red); }

    /* LOGIN */
    .login-screen {
      min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 24px; position: relative; overflow: hidden;
      background-color: #1B3358;
      background-image:
        repeating-linear-gradient(135deg, transparent 0, transparent 2px, rgba(0,0,0,0.16) 2px, rgba(0,0,0,0.16) 4px),
        repeating-linear-gradient(45deg, transparent 0, transparent 2px, rgba(0,0,0,0.09) 2px, rgba(0,0,0,0.09) 4px),
        radial-gradient(ellipse at 80% 20%, rgba(204,16,32,0.12) 0%, transparent 50%),
        radial-gradient(ellipse at 20% 80%, rgba(255,255,255,0.04) 0%, transparent 40%);
    }
    /* Big diagonal stars in login background, same angle as the kit */
    .login-screen::before {
      content: '★'; position: absolute; font-size: 55vw; top: 50%; right: -10%; transform: translateY(-50%) rotate(-36deg);
      color: rgba(204,16,32,0.07); pointer-events: none; line-height: 1; z-index: 0;
    }
    .login-screen::after {
      content: '★'; position: absolute; font-size: 30vw; top: 10%; left: -8%; transform: rotate(-36deg);
      color: rgba(255,255,255,0.04); pointer-events: none; line-height: 1; z-index: 0;
    }
    .login-card { background: #060F22; border: 2px solid var(--red); border-radius: 6px; padding: 40px 36px; width: 100%; max-width: 420px; text-align: center; box-shadow: 0 0 60px rgba(204,16,32,0.3), 0 20px 60px rgba(0,0,0,0.6); position: relative; z-index: 1; }
    .login-card { background: #060F22; border: 2px solid var(--red); border-radius: 6px; padding: 40px 36px; width: 100%; max-width: 420px; text-align: center; box-shadow: 0 0 40px rgba(204,16,32,0.25); }
    .login-logo { font-family: 'Anton', sans-serif; font-size: 48px; letter-spacing: 4px; color: var(--cream); line-height: 1; }
    .login-logo span { color: var(--red); }
    .login-tagline { font-style: italic; color: var(--silver); font-size: 13px; margin-top: 4px; margin-bottom: 28px; }
    .login-tab { flex: 1; font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 2px; font-size: 13px; padding: 9px; border: none; background: transparent; color: var(--silver); cursor: pointer; transition: all 0.2s; }
    .login-tab.active { background: var(--red); color: white; }
    .login-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; text-align: left; }
    .login-label { font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 2px; font-size: 11px; color: var(--silver); }
    .login-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(204,16,32,0.25); border-radius: 3px; color: var(--cream); padding: 11px 14px; font-family: 'Barlow Condensed', sans-serif; font-size: 14px; width: 100%; transition: border-color 0.2s; }
    .login-input:focus { outline: none; border-color: var(--red); }
    .login-input option { background: #060F22; }
    .login-error { background: rgba(204,16,32,0.12); border: 1px solid var(--red); border-radius: 3px; color: #ff7088; padding: 9px 12px; font-size: 13px; margin-bottom: 14px; text-align: left; }
    .login-btn { width: 100%; font-family: 'Anton', sans-serif; letter-spacing: 4px; font-size: 15px; padding: 13px; border: none; border-radius: 3px; background: var(--red); color: white; cursor: pointer; transition: all 0.15s; margin-top: 4px; box-shadow: 0 4px 20px rgba(204,16,32,0.5); }
    .login-btn:hover { background: var(--gold-light); }
    .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .login-divider { border: none; border-top: 1px solid rgba(204,16,32,0.15); margin: 20px 0; }
    .login-switch { font-size: 13px; color: var(--silver); }
    .login-switch button { background: none; border: none; color: var(--red); cursor: pointer; font-size: 13px; text-decoration: underline; }

    /* GAME SELECT */
    .game-select-screen {
      min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 24px 24px 40px; position: relative; overflow: hidden;
      background-color: #1B3358;
      background-image:
        repeating-linear-gradient(135deg, transparent 0, transparent 2px, rgba(0,0,0,0.16) 2px, rgba(0,0,0,0.16) 4px),
        repeating-linear-gradient(45deg, transparent 0, transparent 2px, rgba(0,0,0,0.09) 2px, rgba(0,0,0,0.09) 4px),
        radial-gradient(ellipse at 85% 15%, rgba(204,16,32,0.12) 0%, transparent 50%),
        radial-gradient(ellipse at 15% 85%, rgba(255,255,255,0.04) 0%, transparent 40%);
    }
    .game-select-screen::before {
      content: '★'; position: absolute; font-size: 60vw; top: 50%; right: -12%; transform: translateY(-50%) rotate(-36deg);
      color: rgba(204,16,32,0.07); pointer-events: none; line-height: 1; z-index: 0;
    }
    .game-select-screen::after {
      content: '★'; position: absolute; font-size: 28vw; bottom: 5%; left: -6%; transform: rotate(-36deg);
      color: rgba(255,255,255,0.04); pointer-events: none; line-height: 1; z-index: 0;
    }
    .game-select-screen > * { position: relative; z-index: 1; }
    .game-card { background: #142846; border: 1px solid rgba(204,16,32,0.2); border-radius: 4px; padding: 18px 20px; cursor: pointer; transition: all 0.2s; text-align: left; width: 100%; border-left: 4px solid transparent; }
    .game-card:hover { border-color: rgba(204,16,32,0.4); border-left-color: var(--red); transform: translateX(3px); }
    .game-card-name { font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 18px; color: var(--cream); }
    .game-card-meta { font-size: 12px; color: var(--silver); margin-top: 4px; }
    .game-card-badge { font-family: 'Oswald', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 1px; padding: 2px 8px; border-radius: 2px; display: inline-block; margin-top: 6px; }

    /* MISC */
    .notice { background: rgba(204,16,32,0.08); border: 1px solid rgba(204,16,32,0.25); border-radius: 4px; padding: 12px 16px; font-style: italic; color: var(--silver); font-size: 13px; margin-bottom: 16px; }
    .empty { text-align: center; padding: 48px; color: var(--silver); font-style: italic; }
    .flex-end { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .mt { margin-top: 20px; }
    .pill { display: inline-block; font-size: 10px; font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 1px; padding: 1px 6px; border-radius: 8px; background: var(--pitch); color: var(--red); margin-left: 5px; border: 1px solid rgba(204,16,32,0.3); }

    @media (max-width: 768px) {
      .lb-row { grid-template-columns: 36px 1fr 64px; gap: 0; padding: 10px 12px; }
      .lb-component { display: none; }
      .lb-score { font-size: 20px; }
      .lb-name { font-size: 14px; }
      .lb-rank { font-size: 16px; }
      .admin-grid { grid-template-columns: 1fr; }
      .login-card { padding: 24px 16px; }
      .header-inner { padding: 0 8px; gap: 4px; height: auto; min-height: 56px; flex-wrap: wrap; padding: 6px 8px; }
      .logo { font-size: 18px; letter-spacing: 1px; flex-shrink: 0; }
      .game-badge { display: none; }
      .nav { order: 3; width: 100%; border-top: 1px solid rgba(204,16,32,0.15); padding-top: 4px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .nav-btn { font-size: 11px; padding: 5px 7px; letter-spacing: 1px; }
      .user-pill { flex-shrink: 0; }
      .user-pill strong { display: none; }
      .admin-badge { display: none; }
      .page { padding: 16px 12px; }
      .hero { padding: 36px 16px 28px; }
      .hero-title { font-size: 32px; }
      .hero-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
      .hero-stat { padding: 10px 16px; border-left: none !important; border-bottom: 1px solid rgba(255,255,255,0.06); }
      .hero-stat:nth-child(even) { border-left: 1px solid rgba(255,255,255,0.08) !important; }
      .hero-stat:nth-child(3), .hero-stat:nth-child(4) { border-bottom: none; }
      .hero-stat-num { font-size: 32px; }
      .lb-row.header-row > div:nth-child(n+4) { display: none; }
      .section-header { flex-direction: row; align-items: center; gap: 0; }
      .score-inputs { gap: 5px; }
      .score-team { font-size: 11px; }
      .score-num { width: 44px; font-size: 18px; }
      .match-teams { font-size: 14px; }
      .match-card { margin-bottom: 8px; }
      .method-btns { flex-wrap: wrap; gap: 4px; }
      .method-btn { font-size: 11px; padding: 5px 8px; }
      .admin-panel { padding: 14px 12px; }
      .tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .tab { font-size: 11px; padding: 8px 10px; letter-spacing: 1px; }
      .tournie-grid { font-size: 10px; }
      .tg-cell { padding: 6px 6px; }
      .game-select-screen { padding: 16px; }
      .game-card { padding: 14px 16px; }
      .date-group-header { font-size: 12px; padding: 6px 12px; }
      .prediction-chip { font-size: 11px; padding: 3px 7px; }
      .chaos-entry { padding: 10px 12px; gap: 8px; }
      .ticker { height: 40px; }
      .ticker-track { font-size: 12px; letter-spacing: 4px; }
    }
    @media (max-width: 480px) {
      .nav { gap: 0; }
      .nav-btn { padding: 6px 6px; font-size: 10px; }
      .hero-stats { gap: 0; }
      .hero-stat { padding: 0 10px; }
      .hero-stat-num { font-size: 26px; }
      .score-team { font-size: 10px; }
    }
  `}</style>
);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TOURNIE_CATEGORIES = [
  { id: "winner", label: "Tournament Winner" },
  { id: "runnerUp", label: "Runners Up" },
  { id: "playerOfTournament", label: "Player of Tournament" },
  { id: "bestYoungPlayer", label: "Best Young Player" },
  { id: "topScorer", label: "Top Scorer" },
  { id: "mvpGK", label: "MVP — Goalkeeper" },
  { id: "mvpDEF", label: "MVP — Defender" },
  { id: "mvpMID", label: "MVP — Midfielder" },
  { id: "mvpFWD", label: "MVP — Forward" },
];

const KNOCKOUT_ROUNDS = [
  { id: "r32",   label: "Round of 32",   correctResult: 5,  correctScore: 15,  wrong: -10 },
  { id: "r16",   label: "Round of 16",   correctResult: 10, correctScore: 30,  wrong: -20 },
  { id: "qf",    label: "Quarter Final", correctResult: 20, correctScore: 60,  wrong: -40 },
  { id: "sf",    label: "Semi Final",    correctResult: 40, correctScore: 120, wrong: -40 },
  { id: "third", label: "3rd/4th Place", correctResult: 40, correctScore: 120, wrong: -40 },
  { id: "final", label: "Final",         correctResult: 80, correctScore: 240, wrong: -40 },
];

const KILLER_STATS = [
  { id: "shots",    label: "Total Shots" },
  { id: "fouls",    label: "Total Fouls" },
  { id: "offsides", label: "Total Offsides" },
  { id: "passes",   label: "Total Passes" },
  { id: "tackles",  label: "Total Tackles" },
];

// Storage handled by Supabase — see src/lib/supabase.js

// ─── GAME STATE FACTORY ───────────────────────────────────────────────────────
function makeGameState(name, adminUsername) {
  return {
    name,
    adminId: adminUsername,
    players: [adminUsername],
    tournamentAnswers: {},
    tournamentPredictions: {},
    matches: [],
    predictions: {},
    umersconiAwards: [],
    infinetinos: [],
    tournieDeadline: null,
    killerRounds: [],
    miniGames: [],
    matchDays: [],
    autopilot: {
      enabled: false,
      personalityBrief: "",       // WhatsApp excerpts + player dynamics
      playerNotes: {},            // { playerName: "notes about them" }
      log: [],                    // [{ timestamp, matchDay, actions, reasoning }]
    },
  };
}

// Auth + storage helpers are in src/lib/supabase.js

// ─── FIXTURE DATA ─────────────────────────────────────────────────────────────
function et(dateStr, timeET) {
  const clean = timeET.replace(/\s/g,"");
  const isPM = clean.includes("PM");
  const [hStr, mStr] = clean.replace(/[APM]/g,"").split(":");
  let h = parseInt(hStr), m = parseInt(mStr||"0");
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return new Date(`${dateStr}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00-04:00`).toISOString();
}

const WC2026_FIXTURES = [
  // Group A
  {id:"m1",  teams:"Mexico v South Africa",            stage:"group", kickoff:et("2026-06-11","3:00PM")},
  {id:"m2",  teams:"South Korea v Czechia",            stage:"group", kickoff:et("2026-06-11","10:00PM")},
  {id:"m25", teams:"Czechia v South Africa",           stage:"group", kickoff:et("2026-06-18","12:00PM")},
  {id:"m28", teams:"Mexico v South Korea",             stage:"group", kickoff:et("2026-06-18","9:00PM")},
  {id:"m53", teams:"Czechia v Mexico",                 stage:"group", kickoff:et("2026-06-24","9:00PM")},
  {id:"m54", teams:"South Africa v South Korea",       stage:"group", kickoff:et("2026-06-24","9:00PM")},
  // Group B
  {id:"m3",  teams:"Canada v Bosnia & Herzegovina",    stage:"group", kickoff:et("2026-06-12","3:00PM")},
  {id:"m6",  teams:"Qatar v Switzerland",              stage:"group", kickoff:et("2026-06-13","3:00PM")},
  {id:"m26", teams:"Switzerland v Bosnia & Herzegovina",stage:"group",kickoff:et("2026-06-18","3:00PM")},
  {id:"m27", teams:"Canada v Qatar",                   stage:"group", kickoff:et("2026-06-18","6:00PM")},
  {id:"m49", teams:"Switzerland v Canada",             stage:"group", kickoff:et("2026-06-24","3:00PM")},
  {id:"m50", teams:"Bosnia & Herzegovina v Qatar",     stage:"group", kickoff:et("2026-06-24","3:00PM")},
  // Group C
  {id:"m7",  teams:"Brazil v Morocco",                 stage:"group", kickoff:et("2026-06-13","6:00PM")},
  {id:"m8",  teams:"Haiti v Scotland",                 stage:"group", kickoff:et("2026-06-13","9:00PM")},
  {id:"m31", teams:"Scotland v Morocco",               stage:"group", kickoff:et("2026-06-19","6:00PM")},
  {id:"m32", teams:"Brazil v Haiti",                   stage:"group", kickoff:et("2026-06-19","9:00PM")},
  {id:"m51", teams:"Scotland v Brazil",                stage:"group", kickoff:et("2026-06-24","6:00PM")},
  {id:"m52", teams:"Morocco v Haiti",                  stage:"group", kickoff:et("2026-06-24","6:00PM")},
  // Group D
  {id:"m4",  teams:"USA v Paraguay",                   stage:"group", kickoff:et("2026-06-12","9:00PM")},
  {id:"m5",  teams:"Australia v Türkiye",              stage:"group", kickoff:et("2026-06-13","12:00AM")},
  {id:"m29", teams:"Türkiye v Paraguay",               stage:"group", kickoff:et("2026-06-19","12:00AM")},
  {id:"m30", teams:"USA v Australia",                  stage:"group", kickoff:et("2026-06-19","3:00PM")},
  {id:"m59", teams:"Türkiye v USA",                    stage:"group", kickoff:et("2026-06-25","10:00PM")},
  {id:"m60", teams:"Paraguay v Australia",             stage:"group", kickoff:et("2026-06-25","10:00PM")},
  // Group E
  {id:"m9",  teams:"Germany v Curaçao",                stage:"group", kickoff:et("2026-06-14","1:00PM")},
  {id:"m11", teams:"Ivory Coast v Ecuador",            stage:"group", kickoff:et("2026-06-14","7:00PM")},
  {id:"m35", teams:"Germany v Ivory Coast",            stage:"group", kickoff:et("2026-06-20","4:00PM")},
  {id:"m36", teams:"Ecuador v Curaçao",                stage:"group", kickoff:et("2026-06-20","8:00PM")},
  {id:"m55", teams:"Curaçao v Ivory Coast",            stage:"group", kickoff:et("2026-06-25","4:00PM")},
  {id:"m56", teams:"Ecuador v Germany",                stage:"group", kickoff:et("2026-06-25","4:00PM")},
  // Group F
  {id:"m10", teams:"Netherlands v Japan",              stage:"group", kickoff:et("2026-06-14","4:00PM")},
  {id:"m12", teams:"Sweden v Tunisia",                 stage:"group", kickoff:et("2026-06-14","10:00PM")},
  {id:"m33", teams:"Tunisia v Japan",                  stage:"group", kickoff:et("2026-06-20","12:00AM")},
  {id:"m34", teams:"Netherlands v Sweden",             stage:"group", kickoff:et("2026-06-20","1:00PM")},
  {id:"m57", teams:"Japan v Sweden",                   stage:"group", kickoff:et("2026-06-25","7:00PM")},
  {id:"m58", teams:"Tunisia v Netherlands",            stage:"group", kickoff:et("2026-06-25","7:00PM")},
  // Group G
  {id:"m14", teams:"Belgium v Egypt",                  stage:"group", kickoff:et("2026-06-15","3:00PM")},
  {id:"m16", teams:"Iran v New Zealand",               stage:"group", kickoff:et("2026-06-15","9:00PM")},
  {id:"m38", teams:"Belgium v Iran",                   stage:"group", kickoff:et("2026-06-21","3:00PM")},
  {id:"m40", teams:"New Zealand v Egypt",              stage:"group", kickoff:et("2026-06-21","9:00PM")},
  {id:"m65", teams:"Egypt v Iran",                     stage:"group", kickoff:et("2026-06-26","11:00PM")},
  {id:"m66", teams:"New Zealand v Belgium",            stage:"group", kickoff:et("2026-06-26","11:00PM")},
  // Group H
  {id:"m13", teams:"Spain v Cape Verde",               stage:"group", kickoff:et("2026-06-15","12:00PM")},
  {id:"m15", teams:"Saudi Arabia v Uruguay",           stage:"group", kickoff:et("2026-06-15","6:00PM")},
  {id:"m37", teams:"Spain v Saudi Arabia",             stage:"group", kickoff:et("2026-06-21","12:00PM")},
  {id:"m39", teams:"Uruguay v Cape Verde",             stage:"group", kickoff:et("2026-06-21","6:00PM")},
  {id:"m63", teams:"Cape Verde v Saudi Arabia",        stage:"group", kickoff:et("2026-06-26","8:00PM")},
  {id:"m64", teams:"Uruguay v Spain",                  stage:"group", kickoff:et("2026-06-26","8:00PM")},
  // Group I
  {id:"m17", teams:"France v Senegal",                 stage:"group", kickoff:et("2026-06-16","3:00PM")},
  {id:"m18", teams:"Iraq v Norway",                    stage:"group", kickoff:et("2026-06-16","6:00PM")},
  {id:"m42", teams:"France v Iraq",                    stage:"group", kickoff:et("2026-06-22","5:00PM")},
  {id:"m43", teams:"Norway v Senegal",                 stage:"group", kickoff:et("2026-06-22","8:00PM")},
  {id:"m61", teams:"Norway v France",                  stage:"group", kickoff:et("2026-06-26","3:00PM")},
  {id:"m62", teams:"Senegal v Iraq",                   stage:"group", kickoff:et("2026-06-26","3:00PM")},
  // Group J
  {id:"m19", teams:"Argentina v Algeria",              stage:"group", kickoff:et("2026-06-16","9:00PM")},
  {id:"m20", teams:"Austria v Jordan",                 stage:"group", kickoff:et("2026-06-16","12:00AM")},
  {id:"m41", teams:"Argentina v Austria",              stage:"group", kickoff:et("2026-06-22","1:00PM")},
  {id:"m44", teams:"Jordan v Algeria",                 stage:"group", kickoff:et("2026-06-22","11:00PM")},
  {id:"m71", teams:"Algeria v Austria",                stage:"group", kickoff:et("2026-06-27","10:00PM")},
  {id:"m72", teams:"Jordan v Argentina",               stage:"group", kickoff:et("2026-06-27","10:00PM")},
  // Group K
  {id:"m21", teams:"Portugal v DR Congo",              stage:"group", kickoff:et("2026-06-17","1:00PM")},
  {id:"m24", teams:"Uzbekistan v Colombia",            stage:"group", kickoff:et("2026-06-17","10:00PM")},
  {id:"m45", teams:"Portugal v Uzbekistan",            stage:"group", kickoff:et("2026-06-23","1:00PM")},
  {id:"m48", teams:"Colombia v DR Congo",              stage:"group", kickoff:et("2026-06-23","10:00PM")},
  {id:"m69", teams:"Colombia v Portugal",              stage:"group", kickoff:et("2026-06-27","7:30PM")},
  {id:"m70", teams:"DR Congo v Uzbekistan",            stage:"group", kickoff:et("2026-06-27","7:30PM")},
  // Group L
  {id:"m22", teams:"England v Croatia",                stage:"group", kickoff:et("2026-06-17","4:00PM")},
  {id:"m23", teams:"Ghana v Panama",                   stage:"group", kickoff:et("2026-06-17","7:00PM")},
  {id:"m46", teams:"England v Ghana",                  stage:"group", kickoff:et("2026-06-23","4:00PM")},
  {id:"m47", teams:"Panama v Croatia",                 stage:"group", kickoff:et("2026-06-23","7:00PM")},
  {id:"m67", teams:"Panama v England",                 stage:"group", kickoff:et("2026-06-27","5:00PM")},
  {id:"m68", teams:"Croatia v Ghana",                  stage:"group", kickoff:et("2026-06-27","5:00PM")},
  // Round of 32
  {id:"m73", teams:"Runner-up A v Runner-up B",        stage:"knockout", round:"r32", kickoff:et("2026-06-28","3:00PM")},
  {id:"m74", teams:"Winner C v Runner-up F",           stage:"knockout", round:"r32", kickoff:et("2026-06-29","1:00PM")},
  {id:"m75", teams:"Winner E v Best 3rd",              stage:"knockout", round:"r32", kickoff:et("2026-06-29","4:30PM")},
  {id:"m76", teams:"Winner F v Runner-up C",           stage:"knockout", round:"r32", kickoff:et("2026-06-29","9:00PM")},
  {id:"m77", teams:"Winner I v Best 3rd",              stage:"knockout", round:"r32", kickoff:et("2026-06-30","5:00PM")},
  {id:"m78", teams:"Runner-up E v Runner-up I",        stage:"knockout", round:"r32", kickoff:et("2026-06-30","1:00PM")},
  {id:"m79", teams:"Winner A v Best 3rd",              stage:"knockout", round:"r32", kickoff:et("2026-06-30","9:00PM")},
  {id:"m80", teams:"Winner L v Best 3rd",              stage:"knockout", round:"r32", kickoff:et("2026-07-01","12:00PM")},
  {id:"m81", teams:"Winner D v Best 3rd",              stage:"knockout", round:"r32", kickoff:et("2026-07-01","8:00PM")},
  {id:"m82", teams:"Winner G v Best 3rd",              stage:"knockout", round:"r32", kickoff:et("2026-07-01","4:00PM")},
  {id:"m83", teams:"Runner-up K v Runner-up L",        stage:"knockout", round:"r32", kickoff:et("2026-07-02","7:00PM")},
  {id:"m84", teams:"Winner H v Runner-up J",           stage:"knockout", round:"r32", kickoff:et("2026-07-02","3:00PM")},
  {id:"m85", teams:"Winner B v Best 3rd",              stage:"knockout", round:"r32", kickoff:et("2026-07-02","11:00PM")},
  {id:"m86", teams:"Winner J v Runner-up H",           stage:"knockout", round:"r32", kickoff:et("2026-07-03","6:00PM")},
  {id:"m87", teams:"Winner K v Best 3rd",              stage:"knockout", round:"r32", kickoff:et("2026-07-03","9:30PM")},
  {id:"m88", teams:"Runner-up D v Runner-up G",        stage:"knockout", round:"r32", kickoff:et("2026-07-03","2:00PM")},
  // Round of 16
  {id:"m89", teams:"Winner M74 v Winner M77",          stage:"knockout", round:"r16", kickoff:et("2026-07-04","5:00PM")},
  {id:"m90", teams:"Winner M73 v Winner M75",          stage:"knockout", round:"r16", kickoff:et("2026-07-04","1:00PM")},
  {id:"m91", teams:"Winner M76 v Winner M78",          stage:"knockout", round:"r16", kickoff:et("2026-07-05","4:00PM")},
  {id:"m92", teams:"Winner M79 v Winner M80",          stage:"knockout", round:"r16", kickoff:et("2026-07-05","8:00PM")},
  {id:"m93", teams:"Winner M83 v Winner M84",          stage:"knockout", round:"r16", kickoff:et("2026-07-06","3:00PM")},
  {id:"m94", teams:"Winner M81 v Winner M82",          stage:"knockout", round:"r16", kickoff:et("2026-07-06","8:00PM")},
  {id:"m95", teams:"Winner M86 v Winner M88",          stage:"knockout", round:"r16", kickoff:et("2026-07-07","12:00PM")},
  {id:"m96", teams:"Winner M85 v Winner M87",          stage:"knockout", round:"r16", kickoff:et("2026-07-07","4:00PM")},
  // Quarters
  {id:"m97", teams:"Winner M89 v Winner M90",          stage:"knockout", round:"qf", kickoff:et("2026-07-09","4:00PM")},
  {id:"m98", teams:"Winner M93 v Winner M94",          stage:"knockout", round:"qf", kickoff:et("2026-07-10","3:00PM")},
  {id:"m99", teams:"Winner M91 v Winner M92",          stage:"knockout", round:"qf", kickoff:et("2026-07-11","5:00PM")},
  {id:"m100",teams:"Winner M95 v Winner M96",          stage:"knockout", round:"qf", kickoff:et("2026-07-11","9:00PM")},
  // Semis
  {id:"m101",teams:"Winner M97 v Winner M98",          stage:"knockout", round:"sf", kickoff:et("2026-07-14","3:00PM")},
  {id:"m102",teams:"Winner M99 v Winner M100",         stage:"knockout", round:"sf", kickoff:et("2026-07-15","3:00PM")},
  // 3rd/Final
  {id:"m103",teams:"3rd Place Play-off",               stage:"knockout", round:"third", kickoff:et("2026-07-18","5:00PM")},
  {id:"m104",teams:"World Cup Final",                  stage:"knockout", round:"final", kickoff:et("2026-07-19","3:00PM")},
];

// ─── MINI GAME SCORE AGGREGATOR ───────────────────────────────────────────────
function calcMiniGameScores(game) {
  const scores = {};
  (game.players||[]).forEach(p => { scores[p] = 0; });

  (game.miniGames||[]).forEach(mg => {
    // Emoji Bonus: +5 per solved puzzle per winner, +40 to Umersconi per unsolved (not distributed)
    if (mg.type === "emoji_bonus" && mg.status === "ended") {
      (mg.puzzles||[]).forEach(pz => {
        if (pz.solved && pz.winner && scores[pz.winner] !== undefined) {
          scores[pz.winner] += 5;
        }
      });
    }

    // Who Am I: winner gets their pts
    if (mg.type === "who_am_i" && mg.status === "ended") {
      if (mg.winner && mg.winner !== "Umersconi" && scores[mg.winner] !== undefined) {
        scores[mg.winner] += mg.winnerPts || 0;
        // If winner chose to redistribute, winnerKept will be false
        if (mg.redistribute) {
          scores[mg.winner] -= mg.winnerPts || 0;
          const share = Math.floor((mg.winnerPts || 0) / (game.players||[]).length);
          (game.players||[]).forEach(p => { scores[p] += share; });
        }
      }
    }

    // Bounty Hunters: apply kills and bloodlust
    if (mg.type === "bounty" && mg.status === "ended") {
      (mg.resolvedKills||[]).forEach(({hunter, victim, pts}) => {
        if (scores[hunter] !== undefined) scores[hunter] += pts;
        if (scores[victim] !== undefined) scores[victim] -= pts;
      });
      (mg.bloodlust||[]).forEach(({hunter, victim, pts}) => {
        if (scores[hunter] !== undefined) scores[hunter] += pts;
        if (scores[victim] !== undefined) scores[victim] -= pts;
      });
    }

    // Traitors: use resolvedActions computed during resolution
    if (mg.type === "traitors" && mg.status === "ended") {
      (mg.resolvedActions||[]).forEach(a => {
        if (a.type === "gain" && scores[a.player] !== undefined) scores[a.player] += a.pts;
        if (a.type === "loss" && scores[a.player] !== undefined) scores[a.player] -= a.pts;
        // ambush and double_tap flags are informational — admin applies manually via Killer resolve
        // swap flags noted separately, applied in next Killer round resolve
      });
    }

    // Duels: winner steals 100 from loser
    if (mg.type === "duels" && mg.status === "ended") {
      (mg.results||[]).forEach(r => {
        if (r.winner && r.winner !== "tie") {
          const loser = r.winner === r.player1 ? r.player2 : r.player1;
          if (scores[r.winner] !== undefined) scores[r.winner] += 100;
          if (scores[loser]    !== undefined) scores[loser]    -= 100;
        }
      });
    }
  });

  return scores;
}

// ─── SCORING ENGINE ───────────────────────────────────────────────────────────
function forfeitPenalty(match) {
  if (match.stage === "group") return -10;
  if (match.round === "r32" || match.round === "r16") return -20;
  return -40;
}

// Parse a score string into { goals, method }
// e.g. "2-0" → { goals:"2-0", method:"normal" }
//      "2-0 (AET)" → { goals:"2-0", method:"aet" }
//      "1-1 (PENS)" → { goals:"1-1", method:"pens" }
function parseScoreStr(s) {
  if (!s) return { goals:"", method:"normal" };
  const aet  = /\(AET\)/i.test(s);
  const pens = /\(PENS\)/i.test(s);
  const goals = s.replace(/\s*\((AET|PENS)\)/i, "").trim();
  return { goals, method: pens ? "pens" : aet ? "aet" : "normal" };
}

// Is this a perfect score prediction?
// Rules:
//   - Scoreline (goals) must match exactly
//   - Method must match exactly (normal vs AET vs PENS)
//   - For PENS: scoreline is the 90+ET score, winner is encoded in result (H/A)
//     so goals+method match = perfect, regardless of who won the shootout
//     (the "who won" is already captured in result matching)
function isPerfectScore(predScore, actualScore) {
  const p = parseScoreStr(predScore);
  const a = parseScoreStr(actualScore);
  return p.goals === a.goals && p.method === a.method;
}

function calcScores(game) {
  const scores = {};
  game.players.forEach(p => { scores[p] = { base:0, streaks:0, tournies:0, umersconi:0, infinetinos:0, killer:0, miniGames:0, total:0, correctScores:0 }; });

  const sortedMatches = [...(game.matches||[])].sort((a,b) => new Date(a.kickoff||0) - new Date(b.kickoff||0));

  sortedMatches.forEach(match => {
    if (!match.result) return;
    const preds = game.predictions[match.id] || {};
    game.players.forEach(player => {
      const pred = preds[player];
      if (!pred || pred.result === "x") { scores[player].base += forfeitPenalty(match); return; }
      if (match.stage === "group") {
        if (pred.result === match.result) {
          // Group stage: score is a simple string, exact string match for perfect score
          const perfect = pred.score === match.score;
          if (perfect) { scores[player].base += 8; scores[player].correctScores++; }
          else scores[player].base += 3;
        }
      } else {
        const round = KNOCKOUT_ROUNDS.find(r => r.id === match.round);
        if (!round) return;
        if (pred.result === match.result) {
          const perfect = isPerfectScore(pred.score, match.score);
          if (perfect) { scores[player].base += round.correctScore; scores[player].correctScores++; }
          else scores[player].base += round.correctResult;
        } else {
          scores[player].base += round.wrong;
        }
      }
    });
  });

  // Streaks
  game.players.forEach(player => {
    let streak = 0, pts = 0;
    sortedMatches.filter(m => m.result).forEach(match => {
      const pred = (game.predictions[match.id]||{})[player];
      if (pred && pred.result !== "x" && pred.result === match.result) {
        streak++;
        if (streak === 3)  pts += 25;
        else if (streak === 5)  pts += 50;
        else if (streak === 10) pts += 150;
      } else streak = 0;
    });
    scores[player].streaks = pts;
  });

  // Tournies
  game.players.forEach(player => {
    let tp = 0;
    TOURNIE_CATEGORIES.forEach(cat => {
      const ans  = game.tournamentAnswers[cat.id];
      const pred = (game.tournamentPredictions[player]||{})[cat.id];
      if (ans && pred && pred.toLowerCase().trim() === ans.toLowerCase().trim()) tp += 50;
    });
    scores[player].tournies = tp * Math.max(1, scores[player].correctScores);
  });

  // Umersconi & Infinetinos
  (game.umersconiAwards||[]).forEach(({player,pts}) => { if(scores[player]) scores[player].umersconi += pts; });
  (game.infinetinos||[]).forEach(({player,pts})    => { if(scores[player]) scores[player].infinetinos += pts; });

  // Killer
  const ks = calcKillerScores(game);
  game.players.forEach(p => { scores[p].killer = ks[p]?.net || 0; });

  // Mini-game points
  const mg = calcMiniGameScores(game);
  game.players.forEach(p => { scores[p].miniGames = mg[p] || 0; });

  game.players.forEach(p => {
    const s = scores[p];
    s.total = s.base + s.streaks + s.tournies + s.umersconi + s.infinetinos + s.killer + s.miniGames;
  });
  return scores;
}

// ─── KILLER ENGINE ────────────────────────────────────────────────────────────
function isWithinTolerance(pred, actual) { return pred >= actual*0.9 && pred <= actual*1.1; }

function calcKillerQuestion(statId, players, predictions, actual) {
  if (actual === null || actual === undefined || actual === "") return null;
  const act = Number(actual);
  const eligible = players.map(p => ({ player:p, pred:Number(predictions[p]?.[statId]??NaN) })).filter(x => !isNaN(x.pred) && isWithinTolerance(x.pred, act));
  if (!eligible.length) return { winners:[], houseWins:true, exact:false };
  const minDist = Math.min(...eligible.map(x => Math.abs(x.pred-act)));
  const winners = eligible.filter(x => Math.abs(x.pred-act) === minDist);
  return { winners: winners.map(w=>w.player), houseWins:false, exact: winners[0].pred===act };
}

function calcKillerAggregate(players, predictions, actuals, cats) {
  const statList = cats||KILLER_STATS;
  const actualAgg = statList.reduce((s,st) => s+(Number(actuals?.[st.id])||0), 0);
  if (!actualAgg) return { star:null, worst:null, actualAgg:0, playerAggs:{} };
  const playerAggs = {};
  players.forEach(p => { playerAggs[p] = statList.reduce((s,st) => s+(Number(predictions?.[p]?.[st.id])||0), 0); });
  const dists = players.map(p => ({ player:p, dist:Math.abs(playerAggs[p]-actualAgg) })).sort((a,b)=>a.dist-b.dist);
  return { star:dists[0]?.player, worst:dists[dists.length-1]?.player, actualAgg, playerAggs };
}

function calcKillerScores(game) {
  const scores = {};
  (game.players||[]).forEach(p => { scores[p] = { gain:0, loss:0, net:0 }; });
  (game.killerRounds||[]).filter(r=>r.resolved).forEach(round => {
    (round.steals||[]).forEach(({winner,victim,pts}) => { if(scores[winner]) scores[winner].gain+=pts; if(scores[victim]) scores[victim].loss-=pts; });
    (round.houseSteals||[]).forEach(({victim,pts}) => { if(scores[victim]) scores[victim].loss-=pts; });
    if (round.starBonus && scores[round.starBonus]) scores[round.starBonus].gain+=50;
    (round.starPredAwards||[]).forEach(({player,pts}) => { if(scores[player]) scores[player].gain+=pts; });
    (round.worstPredAwards||[]).forEach(({player,pts}) => { if(scores[player]) scores[player].gain+=pts; });
  });
  (game.players||[]).forEach(p => { scores[p].net = scores[p].gain+scores[p].loss; });
  return scores;
}

// ─── DEADLINE HELPERS ─────────────────────────────────────────────────────────
function getTournieDeadline(game) {
  if (game.tournieDeadline) return new Date(game.tournieDeadline);
  const kickoffs = (game.matches||[]).map(m=>m.kickoff).filter(Boolean).map(k=>new Date(k));
  if (!kickoffs.length) return null;
  return new Date(Math.min(...kickoffs) - 3600000);
}
function isTournieDeadlinePassed(game) { const d=getTournieDeadline(game); return d ? new Date()>d : false; }
function getMatchDeadline(match) { return match.kickoff ? new Date(new Date(match.kickoff).getTime()-3600000) : null; }
function isMatchDeadlinePassed(match) { const d=getMatchDeadline(match); return d ? new Date()>d : false; }
function formatDeadline(date) { if(!date) return "Not set"; return date.toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); }
function formatKickoff(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZoneName:"short"});
}
function formatDateKey(iso) {
  if (!iso) return "Unknown date";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
}

// Returns YYYY-MM-DD in local time
function isoToDateStr(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// Auto-generate Match Day objects from a game's matches, sorted by date.
// Merges with any existing matchDays so custom labels are preserved.
function autoGenerateMatchDays(game) {
  const matches = (game.matches||[]).filter(m=>m.kickoff);
  // Group match IDs by calendar date
  const byDate = {};
  matches.forEach(m => {
    const date = isoToDateStr(m.kickoff);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(m.id);
  });
  const existing = game.matchDays||[];
  const sorted = Object.entries(byDate).sort((a,b)=>a[0].localeCompare(b[0]));
  return sorted.map(([date, matchIds], i) => {
    const ex = existing.find(d=>d.date===date);
    return {
      id: ex?.id || `md_${date}`,
      label: ex?.label || `Match Day ${i+1}`,
      date,
      matchIds,
    };
  });
}

// ─── GAME REDUCER ─────────────────────────────────────────────────────────────
function gameReducer(state, action) {
  switch (action.type) {
    case "LOAD": return action.state;
    case "ADD_MATCH": return { ...state, matches:[...(state.matches||[]), action.match] };
    case "DELETE_MATCH": return { ...state, matches:(state.matches||[]).filter(m=>m.id!==action.matchId) };
    case "EDIT_MATCH_TEAMS": return { ...state, matches:(state.matches||[]).map(m=>m.id===action.matchId?{...m,teams:action.teams}:m) };
    case "SYNC_MATCHES": {
      const ids = new Set((state.matches||[]).map(m=>m.id));
      return { ...state, matches:[...(state.matches||[]), ...action.matches.filter(m=>!ids.has(m.id))] };
    }
    case "ENTER_RESULT": return { ...state, matches:(state.matches||[]).map(m=>m.id===action.matchId?{...m,result:action.result,score:action.score}:m) };
    case "SET_PREDICTIONS": return { ...state, predictions:{...state.predictions,[action.matchId]:{...(state.predictions[action.matchId]||{}),...action.predictions}} };
    case "ADD_UMERSCONI": return { ...state, umersconiAwards:[...(state.umersconiAwards||[]),{player:action.player,pts:action.pts,reason:action.reason,timestamp:new Date().toISOString()}] };
    case "ADD_INFINETINO": return { ...state, infinetinos:[...(state.infinetinos||[]),{player:action.player,pts:action.pts,reason:action.reason,timestamp:new Date().toISOString()}] };
    case "SET_TOURNIE_ANSWERS": return { ...state, tournamentAnswers:action.answers };
    case "SET_TOURNIE_DEADLINE": return { ...state, tournieDeadline:action.deadline };
    case "SET_TOURNIE_PREDS": return { ...state, tournamentPredictions:{...state.tournamentPredictions,[action.player]:{...(state.tournamentPredictions[action.player]||{}),...action.preds}} };
    case "ADD_MINI_GAME": return { ...state, miniGames:[...(state.miniGames||[]), action.game] };
    case "UPDATE_MINI_GAME": return { ...state, miniGames:(state.miniGames||[]).map(g=>g.id===action.id?{...g,...action.updates}:g) };
    case "DELETE_MINI_GAME": return { ...state, miniGames:(state.miniGames||[]).filter(g=>g.id!==action.id) };
    case "SYNC_MATCH_DAYS": return { ...state, matchDays: action.matchDays };
    case "EDIT_MATCH_DAY_LABEL": return { ...state, matchDays:(state.matchDays||[]).map(d=>d.id===action.id?{...d,label:action.label}:d) };
    case "SET_AUTOPILOT": return { ...state, autopilot:{...(state.autopilot||{}), ...action.updates} };
    case "AUTOPILOT_LOG": return { ...state, autopilot:{...(state.autopilot||{}), log:[action.entry,...((state.autopilot||{}).log||[]).slice(0,49)]} };
    case "BATCH_DISPATCH": {
      // Execute multiple actions at once from autopilot
      return action.actions.reduce((s, a) => gameReducer(s, a), state);
    }
    case "ADD_KILLER_ROUND": return { ...state, killerRounds:[...(state.killerRounds||[]),action.round] };
    case "SET_KILLER_PREDICTION": return { ...state, killerRounds:(state.killerRounds||[]).map(r=>r.id===action.roundId?{...r,predictions:{...r.predictions,[action.player]:action.preds}}:r) };
    case "SET_KILLER_ACTUALS": return { ...state, killerRounds:(state.killerRounds||[]).map(r=>r.id===action.roundId?{...r,actuals:action.actuals}:r) };
    case "RESOLVE_KILLER": return { ...state, killerRounds:(state.killerRounds||[]).map(r=>r.id===action.roundId?{...r,resolved:true,steals:action.steals,houseSteals:action.houseSteals,starBonus:action.starBonus,starPredAwards:action.starPredAwards,worstPredAwards:action.worstPredAwards}:r) };
    case "ADD_PLAYER": return { ...state, players:[...(state.players||[]), action.player] };
    case "REMOVE_PLAYER": {
      const p = action.player;
      const preds = {...(state.predictions||{})};
      Object.keys(preds).forEach(mid => { const m={...preds[mid]}; delete m[p]; preds[mid]=m; });
      return { ...state, players:(state.players||[]).filter(x=>x!==p), predictions:preds };
    }
    case "RENAME_PLAYER": {
      const {oldName, newName} = action;
      const preds = {...(state.predictions||{})};
      Object.keys(preds).forEach(mid => { const m={...preds[mid]}; if(m[oldName]!==undefined){m[newName]=m[oldName]; delete m[oldName];} preds[mid]=m; });
      return { ...state,
        players:(state.players||[]).map(x=>x===oldName?newName:x),
        predictions:preds,
        umersconiAwards:(state.umersconiAwards||[]).map(a=>a.player===oldName?{...a,player:newName}:a),
        infinetinos:(state.infinetinos||[]).map(a=>a.player===oldName?{...a,player:newName}:a),
      };
    }
    default: return state;
  }
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, pendingJoinCode }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  function switchMode(m) { setMode(m); setError(""); setInfo(""); }

  async function handleLogin() {
    if (!email.trim() || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      const data = await signIn(email.trim(), password);
      const username = data.user?.user_metadata?.username || email.split("@")[0];
      onLogin({ username, email: email.trim(), userId: data.user.id });
    } catch(e) {
      setError(e.message || "Login failed. Check your email and password.");
    }
    setLoading(false);
  }

  async function handleRegister() {
    if (!username.trim()) { setError("Please choose a username."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (!password) { setError("Please enter a password."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    try {
      await signUp(email.trim(), password, username.trim());
      const data = await signIn(email.trim(), password);
      onLogin({ username: username.trim(), email: email.trim(), userId: data.user.id });
    } catch(e) {
      setError(e.message || "Registration failed.");
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true); setError(""); setInfo("");
    try {
      await resetPasswordForEmail(email.trim());
      setInfo("Password reset email sent — check your inbox.");
    } catch(e) {
      setError(e.message || "Failed to send reset email.");
    }
    setLoading(false);
  }

  return (
    <div className="login-screen">
      <div style={{position:"absolute",top:0,left:0,right:0,height:14,background:"repeating-linear-gradient(90deg,#CC1020 0px 22px,#fff 22px 26px,#060F22 26px 48px,#fff 48px 52px)",boxShadow:"0 3px 14px rgba(204,16,32,0.6)",zIndex:2}}/>
      <div className="login-card">
        <div className="login-logo">Umer<span>sconi</span></div>
        <div className="login-tagline">The Beautiful Game. The Beautiful Corruption.</div>
        {pendingJoinCode&&(
          <div style={{background:"rgba(204,16,32,0.12)",border:"1px solid rgba(204,16,32,0.4)",borderRadius:4,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#ff9aaa",textAlign:"left"}}>
            ★ You've been invited to join a game. Sign in or register to continue — you'll be added automatically.
          </div>
        )}
        {mode !== "forgot" && (
          <div style={{display:"flex",marginBottom:24,borderRadius:4,overflow:"hidden",border:"1px solid rgba(204,16,32,0.3)"}}>
            {["login","register"].map(m=>(
              <button key={m} className={`login-tab ${mode===m?"active":""}`} onClick={()=>switchMode(m)}>
                {m==="login"?"Sign In":"Register"}
              </button>
            ))}
          </div>
        )}
        {error && <div className="login-error">⚠ {error}</div>}
        {info && <div style={{background:"rgba(204,16,32,0.12)",border:"1px solid rgba(204,16,32,0.4)",borderRadius:6,padding:"10px 14px",marginBottom:16,color:"#ff9aaa",fontSize:14}}>✓ {info}</div>}
        {mode==="login" ? (
          <>
            <div className="login-field"><label className="login-label">Email</label>
              <input className="login-input" type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></div>
            <div className="login-field"><label className="login-label">Password</label>
              <input className="login-input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></div>
            <div style={{textAlign:"right",marginBottom:12,marginTop:-4}}>
              <button onClick={()=>switchMode("forgot")} style={{background:"none",border:"none",color:"var(--silver)",fontSize:13,cursor:"pointer",textDecoration:"underline",padding:0}}>Forgot password?</button>
            </div>
            <button className="login-btn" onClick={handleLogin} disabled={loading}>{loading?"Checking...":"Enter the Arena"}</button>
            <hr className="login-divider"/>
            <div className="login-switch">No account? <button onClick={()=>switchMode("register")}>Register here</button></div>
          </>
        ) : mode==="register" ? (
          <>
            <div className="login-field"><label className="login-label">Username (shown to other players)</label>
              <input className="login-input" placeholder="e.g. Umer" value={username} onChange={e=>setUsername(e.target.value)} /></div>
            <div className="login-field"><label className="login-label">Email</label>
              <input className="login-input" type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} /></div>
            <div className="login-field"><label className="login-label">Password</label>
              <input className="login-input" type="password" placeholder="Min. 6 characters" value={password} onChange={e=>setPassword(e.target.value)} /></div>
            <div className="login-field"><label className="login-label">Confirm Password</label>
              <input className="login-input" type="password" placeholder="Repeat password" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleRegister()} /></div>
            <button className="login-btn" onClick={handleRegister} disabled={loading}>{loading?"Setting up...":"Create Account"}</button>
            <hr className="login-divider"/>
            <div className="login-switch">Already registered? <button onClick={()=>switchMode("login")}>Sign in</button></div>
          </>
        ) : (
          <>
            <div style={{color:"var(--cream)",fontFamily:"Anton,sans-serif",fontSize:22,letterSpacing:2,marginBottom:16}}>RESET YOUR PASSWORD</div>
            <div className="login-field"><label className="login-label">Email address</label>
              <input className="login-input" type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleForgotPassword()} /></div>
            <button className="login-btn" onClick={handleForgotPassword} disabled={loading}>{loading?"Sending...":"Send Reset Email"}</button>
            <hr className="login-divider"/>
            <div className="login-switch"><button onClick={()=>switchMode("login")}>← Back to sign in</button></div>
          </>
        )}
      </div>
    </div>
  );
}

function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleReset() {
    if (!password) { setError("Please enter a new password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true); setError("");
    try {
      await updatePassword(password);
      setDone(true);
    } catch(e) {
      setError(e.message || "Failed to update password.");
    }
    setLoading(false);
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">Umer<span>sconi</span></div>
        <div style={{color:"var(--cream)",fontFamily:"Oswald,sans-serif",fontSize:18,fontStyle:"italic",marginBottom:24}}>Set a new password</div>
        {done ? (
          <>
            <div style={{background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.3)",borderRadius:6,padding:"12px 16px",color:"#4ade80",marginBottom:20}}>✓ Password updated successfully.</div>
            <button className="login-btn" onClick={onDone}>Go to my games</button>
          </>
        ) : (
          <>
            {error && <div className="login-error">⚠ {error}</div>}
            <div className="login-field"><label className="login-label">New Password</label>
              <input className="login-input" type="password" placeholder="Min. 6 characters" value={password} onChange={e=>setPassword(e.target.value)} /></div>
            <div className="login-field"><label className="login-label">Confirm New Password</label>
              <input className="login-input" type="password" placeholder="Repeat password" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleReset()} /></div>
            <button className="login-btn" onClick={handleReset} disabled={loading}>{loading?"Updating...":"Set New Password"}</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── GAME SELECT SCREEN ───────────────────────────────────────────────────────
function GameSelectScreen({ session, onSelectGame, onLogout, onSuperAdmin, pendingJoinCode, onClearPendingCode }) {
  const [games, setGames] = useState({});
  const [myGameIds, setMyGameIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState(pendingJoinCode||"");
  const [error, setError] = useState("");
  const [tab, setTab] = useState(pendingJoinCode?"join":"games");
  const [creating, setCreating] = useState(false);
  const [autoJoining, setAutoJoining] = useState(!!pendingJoinCode);

  useEffect(() => { loadGames(); }, []);

  // Auto-join when arriving via invite link
  useEffect(() => {
    if (autoJoining && !loading && pendingJoinCode) {
      setAutoJoining(false);
      onClearPendingCode?.();
      joinGame();
    }
  }, [autoJoining, loading]);

  async function loadGames() {
    setLoading(true);
    try {
      const idx = await getGamesIndex();
      setGames(idx);
      const mine = await getUserGames(session.username);
      setMyGameIds(mine);
    } catch(e) { setError("Could not load games: " + e.message); }
    setLoading(false);
  }

  async function createGame() {
    if (!newName.trim()) { setError("Please enter a game name."); return; }
    setCreating(true); setError("");
    const id = "game_" + Date.now();
    const code = Math.random().toString(36).substring(2,8).toUpperCase();
    const meta = { name:newName.trim(), joinCode:code, adminId:session.username, createdAt:new Date().toISOString() };
    const gs = makeGameState(newName.trim(), session.username);
    try {
      await createGameInDB(id, meta);
      await saveGameState(id, gs);
      await addPlayerToGame(id, session.username);
      setCreating(false);
      onSelectGame(id, meta, gs);
    } catch(e) { setError("Failed to create game: " + e.message); setCreating(false); }
  }

  async function joinGame() {
    if (!joinCode.trim()) { setError("Please enter a join code."); return; }
    setError("");
    try {
      const result = await findGameByJoinCode(joinCode.trim());
      if (!result) { setError("No game found with that code."); return; }
      const { id, meta } = result;
      const gs = await loadGameState(id);
      if (!gs) { setError("Game data not found."); return; }
      if (!gs.players.includes(session.username)) {
        gs.players.push(session.username);
        await saveGameState(id, gs);
        await addPlayerToGame(id, session.username);
      }
      onSelectGame(id, meta, gs);
    } catch(e) { setError("Failed to join: " + e.message); }
  }

  if (loading) return (
    <div className="game-select-screen">
      <div style={{color:"var(--red)",fontFamily:"Anton,sans-serif",fontSize:36,letterSpacing:4}}>★ LOADING… ★</div>
    </div>
  );

  const myGames = myGameIds.map(id => ({ id, ...(games[id]||{}) }));

  return (
    <div className="game-select-screen">
      <div style={{position:"absolute",top:0,left:0,right:0,height:14,background:"repeating-linear-gradient(90deg,#CC1020 0px 22px,#fff 22px 26px,#060F22 26px 48px,#fff 48px 52px)",boxShadow:"0 3px 14px rgba(204,16,32,0.6)",zIndex:2}}/>
      <div style={{width:"100%",maxWidth:520}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontFamily:"Anton,sans-serif",fontSize:52,letterSpacing:4,color:"var(--cream)",lineHeight:1}}>UMER<span style={{color:"var(--red)"}}>SCONI</span></div>
          <div style={{fontFamily:"Oswald,sans-serif",fontWeight:600,color:"var(--silver)",marginTop:8,letterSpacing:2,fontSize:13}}>WELCOME, <span style={{color:"var(--cream)"}}>{session.username}</span></div>
        </div>

        <div style={{display:"flex",marginBottom:20,borderRadius:4,overflow:"hidden",border:"1px solid rgba(204,16,32,0.3)"}}>
          {[["games","My Games"],["create","Create Game"],["join","Join Game"]].map(([t,l])=>(
            <button key={t} className={`login-tab ${tab===t?"active":""}`} style={{flex:1,fontSize:12}} onClick={()=>{setTab(t);setError("");}}>
              {l}
            </button>
          ))}
        </div>

        {error && <div className="login-error">⚠ {error}</div>}

        {tab==="games"&&(
          <div>
            {myGames.length===0 ? (
              <div className="empty" style={{background:"#0E1E38",borderRadius:4,padding:32,border:"1px solid rgba(204,16,32,0.2)"}}>
                You're not in any games yet.<br/>Create one or join with a code.
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {myGames.map(g=>(
                  <div key={g.id} className="game-card" onClick={async(e)=>{
                    if (e.target.closest('.copy-invite-btn')) return; // don't navigate when copying
                    const gs = await loadGameState(g.id);
                    onSelectGame(g.id, games[g.id], gs);
                  }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div style={{minWidth:0}}>
                        <div className="game-card-name">{g.name}</div>
                        <div className="game-card-meta">Admin: {g.adminId} · Code: <strong style={{letterSpacing:2}}>{g.joinCode}</strong></div>
                      </div>
                      <button className="copy-invite-btn btn btn-sm btn-pitch" style={{flexShrink:0,fontSize:11}}
                        onClick={e=>{
                          e.stopPropagation();
                          navigator.clipboard.writeText(`https://umersconi.com/join/${g.joinCode}`).then(()=>{
                            e.target.textContent="Copied!";
                            setTimeout(()=>e.target.textContent="🔗 Invite link",1500);
                          });
                        }}>🔗 Invite link</button>
                    </div>
                    <span className="game-card-badge" style={{background:g.adminId===session.username?"var(--red)":"rgba(255,255,255,0.08)",color:"white"}}>
                      {g.adminId===session.username?"ADMIN":"PLAYER"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==="create"&&(
          <div style={{background:"var(--card-bg)",borderRadius:6,padding:24}}>
            <div className="login-field"><label className="login-label">Game Name</label>
              <input className="login-input" placeholder="e.g. World Cup 2026" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createGame()} /></div>
            <button className="login-btn" onClick={createGame} disabled={creating}>{creating?"Creating...":"Create Game"}</button>
            <p style={{marginTop:12,fontSize:12,color:"var(--silver)",fontStyle:"italic"}}>You'll be the admin. Share the join code with your friends.</p>
          </div>
        )}

        {tab==="join"&&(
          <div style={{background:"var(--card-bg)",borderRadius:6,padding:24}}>
            <div className="login-field"><label className="login-label">Join Code</label>
              <input className="login-input" style={{textTransform:"uppercase",letterSpacing:4,fontSize:18,fontFamily:"Anton,sans-serif"}} placeholder="XXXXXX" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&joinGame()} /></div>
            <button className="login-btn" onClick={joinGame}>Join Game</button>
          </div>
        )}

        <div style={{marginTop:24,textAlign:"center",display:"flex",justifyContent:"center",gap:10}}>
          {session.username===SUPER_ADMIN&&(
            <button className="btn btn-sm" style={{background:"rgba(204,16,32,0.15)",color:"#ff7088",border:"1px solid rgba(204,16,32,0.3)",fontFamily:"Oswald,sans-serif",letterSpacing:2}} onClick={onSuperAdmin}>★ Super Admin</button>
          )}
          <button className="logout-btn" onClick={onLogout}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
function Leaderboard({ game }) {
  const scores = calcScores(game);
  const ranked = [...game.players].sort((a,b)=>scores[b].total-scores[a].total);
  const rc = i => i===0?"rank-1":i===1?"rank-2":i===2?"rank-3":"";
  const medals = ["🥇","🥈","🥉"];
  const played = (game.matches||[]).filter(m=>m.result).length;
  const total  = (game.matches||[]).length;
  const chaos  = (game.umersconiAwards||[]).length+(game.infinetinos||[]).length;

  return (
    <div>
      <div style={{height:14,background:"repeating-linear-gradient(90deg,#CC1020 0px 22px,#fff 22px 26px,#060F22 26px 48px,#fff 48px 52px)",boxShadow:"0 3px 14px rgba(204,16,32,0.6)"}}/>
      <div className="hero">
        {/* V-neck collar — defining detail of the 1994 home kit */}
        <div className="hero-vneck"/>
        {/* SVG star layer: proper 5-point geometric stars at -36°, diagonal bands upper-right → lower-left */}
        <svg className="hero-stars" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 560" preserveAspectRatio="xMidYMid slice">
          <defs><polygon id="hs" points="0,-1 0.2245,-0.309 0.9511,-0.309 0.363,0.118 0.5878,0.809 0,0.382 -0.5878,0.809 -0.363,0.118 -0.9511,-0.309 -0.2245,-0.309" fill="white"/></defs>
          <use href="#hs" transform="translate(1160,25)  rotate(-38) scale(130)" opacity="0.17"/>
          <use href="#hs" transform="translate(940,75)   rotate(-36) scale(88)"  opacity="0.21"/>
          <use href="#hs" transform="translate(760,130)  rotate(-37) scale(62)"  opacity="0.19"/>
          <use href="#hs" transform="translate(610,175)  rotate(-35) scale(45)"  opacity="0.17"/>
          <use href="#hs" transform="translate(1240,170) rotate(-37) scale(105)" opacity="0.13"/>
          <use href="#hs" transform="translate(1060,240) rotate(-36) scale(78)"  opacity="0.21"/>
          <use href="#hs" transform="translate(860,295)  rotate(-38) scale(56)"  opacity="0.23"/>
          <use href="#hs" transform="translate(680,340)  rotate(-35) scale(40)"  opacity="0.21"/>
          <use href="#hs" transform="translate(530,370)  rotate(-37) scale(28)"  opacity="0.17"/>
          <use href="#hs" transform="translate(1190,370) rotate(-36) scale(115)" opacity="0.11"/>
          <use href="#hs" transform="translate(990,435)  rotate(-37) scale(82)"  opacity="0.19"/>
          <use href="#hs" transform="translate(790,480)  rotate(-35) scale(58)"  opacity="0.21"/>
          <use href="#hs" transform="translate(80,90)    rotate(-36) scale(72)"  opacity="0.15"/>
          <use href="#hs" transform="translate(-25,270)  rotate(-37) scale(92)"  opacity="0.11"/>
          <use href="#hs" transform="translate(115,415)  rotate(-35) scale(52)"  opacity="0.16"/>
          <use href="#hs" transform="translate(15,530)   rotate(-38) scale(78)"  opacity="0.10"/>
          <use href="#hs" transform="translate(1090,520) rotate(-36) scale(90)"  opacity="0.13"/>
        </svg>
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-stars">★★★★★</span>
          WORLD CUP 2026 · USA PREDICTOR
          <span className="hero-eyebrow-stars">★★★★★</span>
        </div>
        <h1 className="hero-title">The <em>Predictor</em></h1>
        <p className="hero-sub">{game.name} · Where fortunes are made, lost, and arbitrarily redistributed</p>
        <div className="hero-stats">
          {[
            {n:game.players.length, l:"Players"},
            {n:`${played}/${total||"—"}`, l:"Matches Played"},
            {n:chaos, l:"Chaos Events"},
            {n:ranked[0]?scores[ranked[0]].total:"—", l:"Leader's Score"},
          ].map(s=>(
            <div key={s.l} className="hero-stat">
              <div className="hero-stat-num">{s.n}</div>
              <div className="hero-stat-label">★ {s.l} ★</div>
            </div>
          ))}
        </div>
      </div>
      {/* Red scrolling ticker */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {["★ UMERSCONI'S PREDICTOR","★ USA 2026","★ WORLD CUP","★ FINAL DAY","★ THE PREDICTOR","★ UMERSCONI'S PREDICTOR","★ USA 2026","★ WORLD CUP","★ FINAL DAY","★ THE PREDICTOR","★ UMERSCONI'S PREDICTOR","★ USA 2026","★ WORLD CUP","★ FINAL DAY","★ THE PREDICTOR","★ UMERSCONI'S PREDICTOR","★ USA 2026","★ WORLD CUP","★ FINAL DAY","★ THE PREDICTOR"].map((t,i)=>(
            <span key={i} className="ticker-item">{t}</span>
          ))}
        </div>
      </div>
      <div className="page">
        <div className="section-header"><div className="section-title">Standings</div><div className="section-sub">Updated after each result</div></div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <div className="lb-row header-row">
            <div>#</div>
            <div>Player</div>
            <div style={{textAlign:"right"}}>Total</div>
            <div style={{textAlign:"right",fontSize:10}}>Base</div>
            <div style={{textAlign:"right",fontSize:10}}>Streaks</div>
            <div style={{textAlign:"right",fontSize:10}}>Tournies</div>
            <div style={{textAlign:"right",fontSize:10}}>Umersconi</div>
            <div style={{textAlign:"right",fontSize:10}}>Infinetinos</div>
            <div style={{textAlign:"right",fontSize:10}}>Killer</div>
            <div style={{textAlign:"right",fontSize:10}}>Mini</div>
          </div>
          {ranked.map((player,i)=>{
            const s=scores[player];
            const nu=( game.umersconiAwards||[]).filter(a=>a.player===player).length;
            const nf=(game.infinetinos||[]).filter(a=>a.player===player).length;
            return (
              <div key={player} className={`lb-row ${rc(i)}`}>
                <div className={`lb-rank ${i===0?"gold":i===1?"silver":i===2?"bronze":""}`}>{medals[i]||i+1}</div>
                <div>
                  <div className="lb-name">{player}{nu>0&&<span className="lb-badge badge-umer">U×{nu}</span>}{nf>0&&<span className="lb-badge badge-fine">F×{nf}</span>}</div>
                  <div className="lb-name-sub">{s.correctScores} perfect score{s.correctScores!==1?"s":""}</div>
                </div>
                <div className="lb-score">{s.total.toLocaleString()}</div>
                <div className="lb-component">{s.base.toLocaleString()}</div>
                <div className={`lb-component ${s.streaks>0?"positive":""}`}>{s.streaks>0?`+${s.streaks}`:s.streaks}</div>
                <div className="lb-component gold">{s.tournies.toLocaleString()}</div>
                <div className={`lb-component ${s.umersconi>0?"positive":""}`}>{s.umersconi>0?`+${s.umersconi}`:s.umersconi}</div>
                <div className={`lb-component ${s.infinetinos<0?"negative":""}`}>{s.infinetinos}</div>
                <div className={`lb-component ${s.killer>0?"positive":s.killer<0?"negative":""}`}>{s.killer>0?`+${s.killer}`:s.killer||"—"}</div>
                <div className={`lb-component ${s.miniGames>0?"positive":s.miniGames<0?"negative":""}`}>{s.miniGames>0?`+${s.miniGames}`:s.miniGames||"—"}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── MATCHES VIEW ─────────────────────────────────────────────────────────────
function MatchesView({ game, dispatch, session }) {
  const [submitting, setSubmitting] = useState({});
  const [saved, setSaved] = useState({});
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState("upcoming"); // upcoming | today | completed | all
  const [openDates, setOpenDates] = useState({});

  const myPlayer = session.username;
  const sorted = [...(game.matches||[])].sort((a,b)=>new Date(a.kickoff||0)-new Date(b.kickoff||0));

  // Filter
  const now = new Date();
  const todayStr = now.toDateString();
  const filtered = sorted.filter(m => {
    if (filter==="today") return m.kickoff && new Date(m.kickoff).toDateString()===todayStr;
    if (filter==="upcoming") return !m.result;
    if (filter==="completed") return !!m.result;
    return true;
  });

  // Group by date
  const byDate = {};
  filtered.forEach(m => {
    const dk = formatDateKey(m.kickoff);
    if (!byDate[dk]) byDate[dk] = [];
    byDate[dk].push(m);
  });

  // Build a lookup: formatDateKey → Match Day label
  const matchDayLookup = {};
  const storedDays = autoGenerateMatchDays(game);
  // Merge with stored labels
  const mergedDays = storedDays.map(g => {
    const s = (game.matchDays||[]).find(d=>d.id===g.id);
    return s ? {...g, label:s.label} : g;
  });
  mergedDays.forEach(md => {
    const sample = (game.matches||[]).find(m=>md.matchIds.includes(m.id)&&m.kickoff);
    if (sample) matchDayLookup[formatDateKey(sample.kickoff)] = md.label;
  });

  // Auto-open today and next upcoming date
  useEffect(() => {
    const init = {};
    const dateKeys = Object.keys(byDate);
    dateKeys.forEach(dk => {
      const hasToday = byDate[dk].some(m => m.kickoff && new Date(m.kickoff).toDateString()===todayStr);
      const hasUpcoming = byDate[dk].some(m => !m.result);
      if (hasToday || hasUpcoming) init[dk] = true;
    });
    // Open first date group if nothing auto-opened
    if (!Object.values(init).some(Boolean) && dateKeys.length) init[dateKeys[0]] = true;
    setOpenDates(init);
  }, [filter, game.matches?.length]);

  function toggleDate(dk) { setOpenDates(p=>({...p,[dk]:!p[dk]})); }

  function getMyPred(match) { return (game.predictions[match.id]||{})[myPlayer]||null; }

  function getPredChip(match, player) {
    const pred = (game.predictions[match.id]||{})[player];
    if (!pred) return null;
    if (pred.result==="x") return {type:"wrong",label:"FORFEIT"};
    const late = pred.late ? " ⚠":"";
    if (!match.result) return {type:pred.late?"wrong":"pending",label:`${pred.result} ${pred.score||"?-?"}${late}`};
    const cr = pred.result===match.result;
    const cs = cr && pred.score===match.score;
    return {type:cs?"correct-score":cr?"correct-result":"wrong",label:`${pred.result} ${pred.score||"?-?"}${late}`};
  }

  function parseScore(scoreStr, result) {
    if (!scoreStr) return {home:"",away:"",method:"",pensWinner:""};
    const mm = scoreStr.match(/\((AET|PENS)\)/);
    const method = mm ? mm[1].toLowerCase() : "";
    const clean = scoreStr.replace(/\s*\((AET|PENS)\)/,"");
    const parts = clean.split("-");
    return {home:parts[0]||"",away:parts[1]||"",method,pensWinner:method==="pens"?(result||""):""};
  }

  function submitPred(match) {
    const draft = submitting[match.id]||{};
    const isLateFirst = isMatchDeadlinePassed(match) && !getMyPred(match)?.submittedAt;
    if (isLateFirst && !draft.excuse?.trim()) return;
    const homeGoals = draft.scoreHome!==""&&draft.scoreHome!==undefined ? parseInt(draft.scoreHome) : null;
    const awayGoals = draft.scoreAway!==""&&draft.scoreAway!==undefined ? parseInt(draft.scoreAway) : null;
    const isKO = match.stage==="knockout";
    if (homeGoals===null||awayGoals===null||isNaN(homeGoals)||isNaN(awayGoals)) { setErrors(p=>({...p,[match.id]:"Please enter a score for both teams."})); return; }
    if (homeGoals<0||awayGoals<0) { setErrors(p=>({...p,[match.id]:"Scores can't be negative."})); return; }
    if (isKO && homeGoals===awayGoals && !draft.method) { setErrors(p=>({...p,[match.id]:"Level scores in a knockout must have AET or Penalties selected."})); return; }
    if (draft.method==="pens" && homeGoals!==awayGoals) { setErrors(p=>({...p,[match.id]:"Penalties require a level score."})); return; }
    if (draft.method==="aet" && homeGoals===awayGoals) { setErrors(p=>({...p,[match.id]:"AET must have a winner — or select Penalties."})); return; }
    if (draft.method==="pens" && !draft.pensWinner) { setErrors(p=>({...p,[match.id]:"Please select who wins the shootout."})); return; }
    let result = draft.method==="pens" ? draft.pensWinner : homeGoals>awayGoals?"H":"A";
    if (!isKO && homeGoals===awayGoals) result="D";
    const score = `${homeGoals}-${awayGoals}${draft.method==="aet"?" (AET)":draft.method==="pens"?" (PENS)":""}`;
    const existing = getMyPred(match);
    setErrors(p=>{const n={...p};delete n[match.id];return n;});
    dispatch({type:"SET_PREDICTIONS",matchId:match.id,predictions:{[myPlayer]:{result,score,submittedAt:new Date().toISOString(),late:isLateFirst||existing?.late||false,excuse:isLateFirst?draft.excuse.trim():(existing?.excuse||"")}}});
    setSubmitting(p=>{const n={...p};delete n[match.id];return n;});
    setSaved(p=>({...p,[match.id]:true}));
    setTimeout(()=>setSaved(p=>{const n={...p};delete n[match.id];return n;}),2000);
  }

  const filterBtns = [
    {k:"upcoming",l:`Upcoming (${sorted.filter(m=>!m.result).length})`},
    {k:"today",l:"Today"},
    {k:"completed",l:`Completed (${sorted.filter(m=>m.result).length})`},
    {k:"all",l:`All (${sorted.length})`},
  ];

  return (
    <div className="page">
      <div className="section-header"><div className="section-title">Matches</div><div className="section-sub">{(game.matches||[]).length} fixtures · sorted by kickoff</div></div>
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {filterBtns.map(b=>(
          <button key={b.k} className={`btn btn-sm ${filter===b.k?"btn-gold":"btn-pitch"}`} onClick={()=>setFilter(b.k)}>{b.l}</button>
        ))}
      </div>
      {Object.keys(byDate).length===0 && <div className="empty">No matches in this view.</div>}
      {Object.entries(byDate).map(([dk,matches])=>(
        <div key={dk}>
          <div className="date-group-header" onClick={()=>toggleDate(dk)}>
            <span>
              {matchDayLookup[dk] && <span style={{color:"var(--red)",marginRight:8}}>{matchDayLookup[dk]}</span>}
              <span style={{color:"var(--silver)",fontSize:12}}>{dk}</span>
            </span>
            <span style={{fontSize:14}}>{openDates[dk]?"▲":"▼"} {matches.length} match{matches.length!==1?"es":""}</span>
          </div>
          {openDates[dk] && (
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:6,marginBottom:8}}>
              {matches.map(match=>{
                const myPred=getMyPred(match);
                const deadlinePassed=isMatchDeadlinePassed(match);
                const deadline=getMatchDeadline(match);
                const hasResult=!!match.result;
                const draft=submitting[match.id]||{};
                const isKO=match.stage==="knockout";
                const [homeTeam,awayTeam]=match.teams.includes(" v ")?match.teams.split(" v "):[match.teams,""];
                const isLateFirst=deadlinePassed&&!myPred?.submittedAt;

                function parseS(s,r){return parseScore(s,r);}

                return (
                  <div key={match.id} className="match-card">
                    <div className="match-header">
                      <div>
                        <div className="match-teams">{match.teams}</div>
                        <div className="match-meta">
                          {isKO&&<span className="tag-ko">{KNOCKOUT_ROUNDS.find(r=>r.id===match.round)?.label||match.round}</span>}
                          {!isKO&&<span>Group Stage</span>}
                          {match.kickoff&&<span>{formatKickoff(match.kickoff)}</span>}
                          {deadline&&!hasResult&&<span style={{color:deadlinePassed?"var(--red)":"var(--silver)"}}>{deadlinePassed?"⚠ Deadline passed":`⏱ ${formatDeadline(deadline)}`}</span>}
                        </div>
                      </div>
                      <div className="match-result">{hasResult?`${match.result} · ${match.score}`:<span style={{color:"var(--silver)",fontSize:13}}>Pending</span>}</div>
                    </div>

                    {/* My prediction */}
                    {!hasResult&&(
                      <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:deadlinePassed?"rgba(204,16,32,0.08)":"rgba(255,255,255,0.03)"}}>
                        <div style={{fontSize:11,fontFamily:"Oswald,sans-serif",fontWeight:700,letterSpacing:2,color:deadlinePassed?"var(--red)":"var(--silver)",marginBottom:8}}>
                          {deadlinePassed?"⚠ LATE SUBMISSION":"YOUR PREDICTION"}
                        </div>
                        {myPred&&!submitting[match.id]?(
                          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                            <span style={{fontFamily:"Oswald,sans-serif",fontWeight:700,fontSize:17,color:"var(--cream)"}}>
                              {myPred.result==="H"?homeTeam:myPred.result==="A"?awayTeam:"Draw"} · {myPred.score||"?-?"}
                              {myPred.score?.includes("(PENS)")&&<span style={{fontSize:12,color:"#8e44ad",marginLeft:6}}>{myPred.result==="H"?homeTeam:awayTeam} on pens</span>}
                            </span>
                            {myPred.late&&<span style={{fontSize:11,color:"var(--red)",fontStyle:"italic"}}>late</span>}
                            {myPred.excuse&&<span style={{fontSize:11,color:"var(--red)",fontStyle:"italic"}}>"{myPred.excuse}"</span>}
                            <button className="btn btn-sm btn-pitch" onClick={()=>{
                              const s=parseS(myPred.score,myPred.result);
                              setErrors(p=>{const n={...p};delete n[match.id];return n;});
                              setSubmitting(p=>({...p,[match.id]:{scoreHome:s.home,scoreAway:s.away,method:s.method,pensWinner:s.pensWinner,excuse:myPred.excuse||""}}));
                            }}>Edit</button>
                          </div>
                        ):(
                          <div style={{display:"flex",flexDirection:"column",gap:8}}>
                            <div style={{fontSize:11,color:"var(--silver)",fontStyle:"italic"}}>
                              {isKO?"Enter score after 90 mins. Select AET or Penalties if needed.":"Enter score — result is derived automatically."}
                            </div>
                            <div className="score-inputs">
                              <span className="score-team" style={{textAlign:"right"}}>{homeTeam}</span>
                              <input type="number" className="score-num" min="0" max="99" placeholder="0"
                                value={draft.scoreHome??""}
                                onChange={e=>{setErrors(p=>{const n={...p};delete n[match.id];return n;});setSubmitting(p=>({...p,[match.id]:{...(p[match.id]||{}),scoreHome:e.target.value}}));}} />
                              <span className="score-sep">—</span>
                              <input type="number" className="score-num" min="0" max="99" placeholder="0"
                                value={draft.scoreAway??""}
                                onChange={e=>{setErrors(p=>{const n={...p};delete n[match.id];return n;});setSubmitting(p=>({...p,[match.id]:{...(p[match.id]||{}),scoreAway:e.target.value}}));}} />
                              <span className="score-team">{awayTeam}</span>
                            </div>
                            {isKO&&(
                              <div>
                                <div style={{fontSize:11,fontFamily:"Oswald,sans-serif",letterSpacing:2,color:"var(--silver)",marginBottom:5}}>DID THIS GO BEYOND 90 MINS?</div>
                                <div className="method-btns">
                                  {[{id:"aet",label:"After Extra Time"},{id:"pens",label:"Penalties"}].map(opt=>(
                                    <button key={opt.id} className={`method-btn ${draft.method===opt.id?`selected-${opt.id}`:""}`}
                                      onClick={()=>setSubmitting(p=>({...p,[match.id]:{...(p[match.id]||{}),method:p[match.id]?.method===opt.id?"":opt.id,pensWinner:""}}))}>
                                      {opt.label}
                                    </button>
                                  ))}
                                  {draft.method&&<button className="method-btn" style={{fontSize:11,color:"var(--silver)"}} onClick={()=>setSubmitting(p=>({...p,[match.id]:{...(p[match.id]||{}),method:"",pensWinner:""}}))}>✕ Normal Time</button>}
                                </div>
                                {draft.method==="pens"&&(
                                  <div style={{marginTop:8}}>
                                    <div style={{fontSize:11,fontFamily:"Oswald,sans-serif",letterSpacing:2,color:"var(--silver)",marginBottom:5}}>WHO WINS THE SHOOTOUT?</div>
                                    <div className="method-btns">
                                      {[{id:"H",label:homeTeam||"Home"},{id:"A",label:awayTeam||"Away"}].map(opt=>(
                                        <button key={opt.id} className={`method-btn ${draft.pensWinner===opt.id?"selected-pens":""}`}
                                          onClick={()=>setSubmitting(p=>({...p,[match.id]:{...(p[match.id]||{}),pensWinner:opt.id}}))}>
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {errors[match.id]&&<div style={{color:"var(--red)",fontSize:12,fontStyle:"italic"}}>⚠ {errors[match.id]}</div>}
                            {isLateFirst&&(
                              <input className="pred-input" placeholder="⚠ You're late — provide your excuse (required)" style={{borderColor:"var(--red)",background:"rgba(204,16,32,0.08)"}}
                                value={draft.excuse||""} onChange={e=>setSubmitting(p=>({...p,[match.id]:{...(p[match.id]||{}),excuse:e.target.value}}))} />
                            )}
                            <div style={{display:"flex",gap:8}}>
                              <button className="btn btn-sm btn-gold" onClick={()=>submitPred(match)} disabled={isLateFirst&&!draft.excuse?.trim()}>
                                {saved[match.id]?"✓ Saved":"Submit"}
                              </button>
                              {myPred&&<button className="btn btn-sm btn-pitch" onClick={()=>{setSubmitting(p=>{const n={...p};delete n[match.id];return n;});setErrors(p=>{const n={...p};delete n[match.id];return n;});}}>Cancel</button>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {hasResult&&myPred&&(
                      <div style={{padding:"8px 16px",borderBottom:"1px solid rgba(201,168,76,0.15)",background:"#f8f8f8",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                        <span style={{fontSize:11,fontFamily:"Oswald,sans-serif",letterSpacing:2,color:"var(--silver)"}}>YOUR PREDICTION</span>
                        <span style={{fontFamily:"Oswald,sans-serif",fontSize:15}}>{myPred.result==="H"?homeTeam:myPred.result==="A"?awayTeam:"Draw"} · {myPred.score||"?-?"}</span>
                        {myPred.late&&<span style={{fontSize:11,color:"var(--red)",fontStyle:"italic"}}>late</span>}
                        {myPred.excuse&&<span style={{fontSize:11,color:"var(--red)",fontStyle:"italic"}}>"{myPred.excuse}"</span>}
                      </div>
                    )}
                    <div className="match-body">
                      <div className="match-predictions">
                        {game.players.map(player=>{
                          const chip=getPredChip(match,player);
                          if (!hasResult&&player!==myPlayer) return (
                            <div key={player} className="prediction-chip pending"><span className="chip-name">{player}</span><span className="chip-pred">🔒</span></div>
                          );
                          if (!chip) return (
                            <div key={player} className="prediction-chip pending"><span className="chip-name">{player}</span><span className="chip-pred">—</span></div>
                          );
                          return (
                            <div key={player} className={`prediction-chip ${chip.type}`}><span className="chip-name">{player}</span><span className="chip-pred">{chip.label}</span></div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── TOURNIES VIEW ────────────────────────────────────────────────────────────
function TournieView({ game, dispatch, session }) {
  const scores = calcScores(game);
  const deadline = getTournieDeadline(game);
  const deadlinePassed = isTournieDeadlinePassed(game);
  const myPreds = game.tournamentPredictions[session.username]||{};
  const [draft, setDraft] = useState({...myPreds});
  const [excuse, setExcuse] = useState(myPreds.__excuse||"");
  const [saved, setSaved] = useState(false);
  const hasSubmitted = Object.keys(myPreds).filter(k=>!k.startsWith("__")).length>0;
  const isDirty = JSON.stringify({...draft,__excuse:excuse})!==JSON.stringify(myPreds);
  const isFirstLate = deadlinePassed&&!myPreds.__late;

  function handleSave() {
    if (isFirstLate&&!excuse.trim()) return;
    dispatch({type:"SET_TOURNIE_PREDS",player:session.username,preds:{...draft,__late:deadlinePassed||myPreds.__late||false,__excuse:isFirstLate?excuse.trim():(myPreds.__excuse||"")}});
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  }

  return (
    <div className="page">
      <div className="section-header"><div className="section-title">Tournament Predictions</div><div className="section-sub">50 pts each × correct scores = Tournie Score</div></div>
      <div className="notice" style={{background:deadlinePassed?"rgba(192,57,43,0.1)":"rgba(201,168,76,0.1)",borderColor:deadlinePassed?"var(--red)":"rgba(201,168,76,0.3)",color:deadlinePassed?"var(--red)":"var(--ink)"}}>
        {deadlinePassed?`⚠ Deadline passed: ${formatDeadline(deadline)}. Locked.`:deadline?`⏱ Deadline: ${formatDeadline(deadline)}`:"⏱ No deadline set — predictions open."}
      </div>
      {(!deadlinePassed||hasSubmitted)&&(
        <div style={{background:"var(--card-bg)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:6,padding:24,marginBottom:28}}>
          <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:3,fontSize:15,color:"var(--silver)",marginBottom:16}}>{deadlinePassed?"Your Predictions (locked)":"Your Tournament Predictions"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {TOURNIE_CATEGORIES.map(cat=>(
              <div key={cat.id} className="admin-field">
                <label className="login-label" style={{color:"var(--silver)"}}>{cat.label}</label>
                <input className="pred-input" placeholder="e.g. Mbappe" value={draft[cat.id]||""} disabled={deadlinePassed}
                  onChange={e=>setDraft(p=>({...p,[cat.id]:e.target.value}))} style={deadlinePassed?{background:"#f0f0f0",color:"#888"}:{}} />
              </div>
            ))}
          </div>
          {!deadlinePassed&&(
            <div className="flex-end">
              {isDirty&&<button className="btn btn-pitch" onClick={()=>{setDraft({...myPreds});setExcuse(myPreds.__excuse||"");}}>Discard</button>}
              <button className="btn btn-gold" onClick={handleSave} disabled={!isDirty}>{saved?"✓ Saved":hasSubmitted?"Update":"Submit Predictions"}</button>
            </div>
          )}
          {isFirstLate&&(
            <div style={{marginTop:14}}>
              <div style={{fontSize:11,fontFamily:"Oswald,sans-serif",letterSpacing:2,color:"var(--red)",marginBottom:5}}>⚠ YOU'RE LATE. YOUR EXCUSE WILL BE PUBLIC.</div>
              <input className="pred-input" placeholder="Your excuse…" style={{borderColor:"var(--red)",background:"rgba(204,16,32,0.08)"}} value={excuse} onChange={e=>setExcuse(e.target.value)} />
              <div className="flex-end"><button className="btn btn-red" onClick={handleSave} disabled={!excuse.trim()}>Submit Late (with shame)</button></div>
            </div>
          )}
          {myPreds.__late&&myPreds.__excuse&&<div style={{marginTop:10,padding:"8px 12px",background:"#fff0f0",border:"1px solid var(--red)",borderRadius:4,fontSize:12,color:"var(--red)",fontStyle:"italic"}}>Your excuse: "{myPreds.__excuse}"</div>}
        </div>
      )}
      <div className="section-header"><div className="section-title" style={{fontSize:20}}>All Predictions</div><div className="section-sub">Revealed after deadline</div></div>
      <div style={{overflowX:"auto"}}>
        <div className="tournie-grid" style={{gridTemplateColumns:`180px repeat(${game.players.length},1fr)`}}>
          <div className="tg-cell header">Category</div>
          {game.players.map(p=>{
            const pp=game.tournamentPredictions[p]||{};
            return <div key={p} className="tg-cell header">{p}{pp.__late&&<div style={{fontSize:9,color:"var(--red)"}}>LATE</div>}</div>;
          })}
          {TOURNIE_CATEGORIES.map(cat=>{
            const ans=game.tournamentAnswers[cat.id];
            return [
              <div key={`l-${cat.id}`} className="tg-cell label">{cat.label}{ans&&<div style={{color:"var(--gold)",fontWeight:700,fontSize:10}}>{ans}</div>}</div>,
              ...game.players.map(player=>{
                if (!deadlinePassed&&player!==session.username) return <div key={`${cat.id}-${player}`} className="tg-cell" style={{color:"#ccc"}}>🔒</div>;
                const pred=(game.tournamentPredictions[player]||{})[cat.id]||"—";
                const isCorrect=ans&&pred.toLowerCase().trim()===ans.toLowerCase().trim();
                const isWrong=ans&&pred!=="—"&&!isCorrect;
                return <div key={`${cat.id}-${player}`} className={`tg-cell ${isCorrect?"correct":isWrong?"wrong":""}`}>{pred}</div>;
              })
            ];
          })}
          <div className="tg-cell label" style={{fontWeight:700}}>Tournie Score</div>
          {game.players.map(p=><div key={p} className="tg-cell" style={{fontFamily:"Oswald,sans-serif",fontSize:16,color:"var(--gold)"}}>{deadlinePassed||p===session.username?scores[p].tournies.toLocaleString():"—"}</div>)}
        </div>
      </div>
    </div>
  );
}

// ─── CHAOS VIEW ───────────────────────────────────────────────────────────────
function ChaosView({ game }) {
  const all = [
    ...(game.umersconiAwards||[]).map(e=>({...e,type:"umer"})),
    ...(game.infinetinos||[]).map(e=>({...e,type:"fine"})),
  ].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));

  return (
    <div className="page">
      <div className="section-header"><div className="section-title">The Chaos Ledger</div><div className="section-sub">Umersconi giveth. Umersconi taketh away.</div></div>
      {all.length===0&&<div className="empty">No chaos yet. Umersconi is merely biding his time.</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {all.map((ev,i)=>(
          <div key={i} className="chaos-entry">
            <div className="chaos-icon">{ev.type==="umer"?"🏅":"🚨"}</div>
            <div className="chaos-body">
              <div className="chaos-player">{ev.player}<span className="pill">{ev.type==="umer"?"UMERSCONI AWARD":"INFINETINO"}</span></div>
              <div className="chaos-reason">{ev.reason}</div>
            </div>
            <div className={`chaos-pts ${ev.pts>0?"positive":"negative"}`}>{ev.pts>0?`+${ev.pts}`:ev.pts}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KILLER VIEW ──────────────────────────────────────────────────────────────
function KillerView({ game, dispatch, session }) {
  const [activeRound, setActiveRound] = useState(null);
  const [draft, setDraft] = useState({});
  const [starPred, setStarPred] = useState("");
  const [worstPred, setWorstPred] = useState("");
  const [saved, setSaved] = useState(false);

  function submitKillerPred(round) {
    const cats = round.categories||KILLER_STATS;
    if (!cats.every(s=>(draft[s.id]??round.predictions?.[session.username]?.[s.id])!==undefined&&(draft[s.id]??round.predictions?.[session.username]?.[s.id])!=="")) return;
    dispatch({type:"SET_KILLER_PREDICTION",roundId:round.id,player:session.username,preds:{...draft,__star:starPred||round.predictions?.[session.username]?.__star,__worst:worstPred||round.predictions?.[session.username]?.__worst}});
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  }

  return (
    <div className="page">
      <div className="section-header"><div className="section-title">⚔ Killer</div><div className="section-sub">Closest within ±10% wins. Exact doubles the prize.</div></div>
      {!(game.killerRounds||[]).length&&<div className="empty">No Killer rounds yet. Umersconi will unleash one when the time is right.</div>}
      {(game.killerRounds||[]).map(round=>{
        const myPred=round.predictions?.[session.username];
        const deadlinePassed=round.deadline?new Date()>new Date(round.deadline):false;
        const isActive=activeRound===round.id;
        const cats=round.categories||KILLER_STATS;
        const agg=round.resolved?calcKillerAggregate(game.players,round.predictions,round.actuals,cats):null;
        return (
          <div key={round.id} className="match-card" style={{marginBottom:10}}>
            <div className="match-header" style={{cursor:"pointer"}} onClick={()=>setActiveRound(isActive?null:round.id)}>
              <div>
                <div className="match-teams">⚔ {round.label}</div>
                <div className="match-meta">
                  {round.resolved?<span style={{background:"#27ae60",color:"white",padding:"2px 8px",borderRadius:2,fontFamily:"Oswald,sans-serif",fontSize:10}}>RESOLVED</span>:deadlinePassed?<span style={{color:"var(--red)"}}>⚠ Deadline passed</span>:<span style={{color:"var(--gold)"}}>⏱ Open</span>}
                  {myPred&&!round.resolved&&<span style={{fontStyle:"italic"}}>✓ Submitted</span>}
                </div>
              </div>
              <div style={{color:"var(--silver)"}}>{isActive?"▲":"▼"}</div>
            </div>
            {isActive&&(
              <div style={{padding:20}}>
                {!round.resolved&&(
                  <div style={{marginBottom:20,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(39,174,96,0.2)",borderRadius:4,padding:16}}>
                    <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"var(--silver)",marginBottom:12}}>{deadlinePassed?"⚠ DEADLINE PASSED":"YOUR PREDICTIONS"}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                      {cats.map(stat=>(
                        <div key={stat.id} className="admin-field">
                          <label className="login-label" style={{color:"var(--silver)"}}>{stat.label}</label>
                          <input type="number" min="0" className="pred-input" placeholder="e.g. 45" disabled={deadlinePassed}
                            value={draft[stat.id]??myPred?.[stat.id]??""} onChange={e=>setDraft(p=>({...p,[stat.id]:e.target.value}))} style={deadlinePassed?{background:"#f0f0f0",color:"#888"}:{}} />
                        </div>
                      ))}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12,borderTop:"1px solid rgba(201,168,76,0.2)",paddingTop:12}}>
                      <div className="admin-field">
                        <label className="login-label" style={{color:"var(--silver)"}}>⭐ Star Pick</label>
                        <select className="pred-input" disabled={deadlinePassed} value={starPred||myPred?.__star||""} onChange={e=>setStarPred(e.target.value)} style={deadlinePassed?{background:"#f0f0f0",color:"#888"}:{}}>
                          <option value="">— Pick —</option>
                          {game.players.map(p=><option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="admin-field">
                        <label className="login-label" style={{color:"var(--silver)"}}>💩 Worst Pick</label>
                        <select className="pred-input" disabled={deadlinePassed} value={worstPred||myPred?.__worst||""} onChange={e=>setWorstPred(e.target.value)} style={deadlinePassed?{background:"#f0f0f0",color:"#888"}:{}}>
                          <option value="">— Pick —</option>
                          {game.players.map(p=><option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                    {!deadlinePassed&&<div className="flex-end"><button className="btn btn-gold" onClick={()=>submitKillerPred(round)}>{saved?"✓ Saved":myPred?"Update":"Submit"}</button></div>}
                  </div>
                )}
                {round.resolved&&agg&&(
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
                      <div style={{background:"#d5f5e3",border:"1px solid #27ae60",borderRadius:4,padding:12,textAlign:"center"}}><div style={{fontFamily:"Oswald,sans-serif",fontSize:11,letterSpacing:2,color:"#1e8449"}}>⭐ STAR</div><div style={{fontFamily:"Oswald,sans-serif",fontWeight:700,fontSize:16}}>{round.starBonus||"—"}</div><div style={{fontSize:11,color:"#27ae60"}}>+50 pts bonus</div></div>
                      <div style={{background:"#fadbd8",border:"1px solid var(--red)",borderRadius:4,padding:12,textAlign:"center"}}><div style={{fontFamily:"Oswald,sans-serif",fontSize:11,letterSpacing:2,color:"var(--red)"}}>💩 WORST</div><div style={{fontFamily:"Oswald,sans-serif",fontWeight:700,fontSize:16}}>{agg.worst||"—"}</div></div>
                      <div style={{background:"var(--card-bg)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:4,padding:12,textAlign:"center"}}><div style={{fontFamily:"Oswald,sans-serif",fontSize:11,letterSpacing:2,color:"var(--silver)"}}>ACTUAL AGG</div><div style={{fontFamily:"Oswald,sans-serif",fontSize:28,color:"var(--gold)"}}>{agg.actualAgg}</div></div>
                    </div>
                    {cats.map(stat=>{
                      const qr=calcKillerQuestion(stat.id,game.players,round.predictions||{},round.actuals?.[stat.id]);
                      if (!qr) return null;
                      const actual=Number(round.actuals?.[stat.id]);
                      return (
                        <div key={stat.id} style={{marginBottom:10,padding:"10px 14px",background:"var(--card-bg)",border:"1px solid rgba(201,168,76,0.15)",borderRadius:4}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                            <span style={{fontFamily:"Oswald,sans-serif",fontSize:14,letterSpacing:1}}>{stat.label}</span>
                            <span style={{fontFamily:"Oswald,sans-serif",fontSize:16,color:"var(--gold)"}}>Actual: {round.actuals?.[stat.id]}</span>
                          </div>
                          {qr.houseWins?<div style={{color:"var(--red)",fontSize:12,fontStyle:"italic",marginBottom:6}}>🏠 House wins</div>:<div style={{color:"#27ae60",fontSize:12,fontStyle:"italic",marginBottom:6}}>🏆 {qr.winners.join(", ")} {qr.exact?"EXACT! (4×50 pts)":"(2×50 pts)"}</div>}
                          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                            {game.players.map(p=>{
                              const pred=round.predictions?.[p]?.[stat.id];
                              const isW=qr.winners.includes(p);
                              const inTol=pred!==undefined&&!isNaN(pred)&&isWithinTolerance(Number(pred),actual);
                              return <div key={p} style={{padding:"3px 8px",borderRadius:3,fontSize:11,background:isW?"#d5f5e3":inTol?"#fef9e7":"#fadbd8",border:`1px solid ${isW?"#27ae60":inTol?"#d4ac0d":"var(--red)"}`}}><strong>{p}</strong>: {pred??"—"}</div>;
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {(round.steals?.length>0||round.houseSteals?.length>0)&&(
                      <div style={{marginTop:14}}>
                        <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"var(--silver)",marginBottom:8}}>POINT MOVEMENTS</div>
                        {round.steals?.map((s,i)=><div key={i} className="chaos-entry" style={{marginBottom:6}}><div className="chaos-icon">⚔</div><div className="chaos-body"><div className="chaos-player">{s.winner} steals from {s.victim}</div><div className="chaos-reason">{cats.find(st=>st.id===s.question)?.label}{s.exact?" — EXACT!":""}</div></div><div className="chaos-pts positive">+{s.pts}</div></div>)}
                        {round.houseSteals?.map((s,i)=><div key={i} className="chaos-entry" style={{marginBottom:6}}><div className="chaos-icon">🏠</div><div className="chaos-body"><div className="chaos-player">House takes from {s.victim}</div><div className="chaos-reason">{s.allQuestions?"All questions failed":cats.find(st=>st.id===s.question)?.label}</div></div><div className="chaos-pts negative">−{s.pts}</div></div>)}
                        {round.starBonus&&<div className="chaos-entry" style={{marginBottom:6}}><div className="chaos-icon">⭐</div><div className="chaos-body"><div className="chaos-player">{round.starBonus}</div><div className="chaos-reason">Star performer bonus</div></div><div className="chaos-pts positive">+50</div></div>}
                        {round.starPredAwards?.map((a,i)=><div key={i} className="chaos-entry" style={{marginBottom:6}}><div className="chaos-icon">⭐</div><div className="chaos-body"><div className="chaos-player">{a.player}</div><div className="chaos-reason">Correctly predicted Star</div></div><div className="chaos-pts positive">+{a.pts}</div></div>)}
                        {round.worstPredAwards?.map((a,i)=><div key={i} className="chaos-entry" style={{marginBottom:6}}><div className="chaos-icon">💩</div><div className="chaos-body"><div className="chaos-player">{a.player}</div><div className="chaos-reason">Correctly predicted Worst</div></div><div className="chaos-pts positive">+{a.pts}</div></div>)}
                      </div>
                    )}
                  </div>
                )}
                {deadlinePassed&&!round.resolved&&(
                  <div>
                    <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"var(--silver)",marginBottom:8}}>ALL PREDICTIONS</div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead><tr style={{background:"var(--ink)",color:"var(--gold)"}}><th style={{padding:"6px 10px",textAlign:"left",fontFamily:"Oswald,sans-serif"}}>Stat</th>{game.players.map(p=><th key={p} style={{padding:"6px 10px",fontFamily:"Oswald,sans-serif"}}>{p}</th>)}</tr></thead>
                        <tbody>
                          {cats.map((stat,i)=>(
                            <tr key={stat.id} style={{background:i%2===0?"var(--card-bg)":"white"}}>
                              <td style={{padding:"6px 10px",fontStyle:"italic"}}>{stat.label}</td>
                              {game.players.map(p=><td key={p} style={{padding:"6px 10px",textAlign:"center"}}>{round.predictions?.[p]?.[stat.id]??<span style={{color:"#ccc"}}>—</span>}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MINI GAMES ───────────────────────────────────────────────────────────────
// Shared scoring helpers
function calcScoresSnapshot(game) { return calcScores(game); }

// ── EMOJI BONUS ──────────────────────────────────────────────────────────────
function EmojiBonusAdmin({ game, mg, dispatch }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [country, setCountry] = useState("");
  const [newPuzzle, setNewPuzzle] = useState({ country:"", emojis:"", answer:"", timeLimit:300 });

  async function generateSuggestions() {
    if (!country.trim()) return;
    setLoading(true); setSuggestions([]);
    try {
      const res = await fetch("/api/autopilot", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          messages:[{role:"user",content:`You are helping run a football prediction game. Generate 5 emoji puzzle suggestions for famous footballers or historical football figures from ${country.trim()}. For each, provide: the person's name, 2-3 emojis that cryptically represent them (their name, nickname, or something famous about them), and a one-line explanation of the emoji logic. Format as JSON array: [{"name":"...","emojis":"...","explanation":"..."}]. Only return the JSON array, nothing else.`}]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "[]";
      const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
      setSuggestions(parsed);
    } catch(e) { setSuggestions([{name:"Error",emojis:"⚠️",explanation:"Could not generate suggestions. Try again."}]); }
    setLoading(false);
  }

  function addPuzzle() {
    if (!newPuzzle.country||!newPuzzle.emojis||!newPuzzle.answer) return;
    const puzzles = [...(mg.puzzles||[]), { id:"pz_"+Date.now(), ...newPuzzle, guesses:{}, solved:false }];
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{puzzles}});
    setNewPuzzle({country:"",emojis:"",answer:"",timeLimit:300});
  }

  function startGame() { dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{status:"active",startedAt:new Date().toISOString()}}); }
  function endGame() {
    // Unguessed puzzles = Umersconi wins 40pts
    const umerWins = (mg.puzzles||[]).filter(p=>!p.solved).length * 40;
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{status:"ended",endedAt:new Date().toISOString(),umerWins}});
  }
  function markSolved(puzzleId, winner) {
    const puzzles = (mg.puzzles||[]).map(p=>p.id===puzzleId?{...p,solved:true,winner}:p);
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{puzzles}});
  }
  function removePuzzle(puzzleId) {
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{puzzles:(mg.puzzles||[]).filter(p=>p.id!==puzzleId)}});
  }

  return (
    <div>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
        <span style={{fontFamily:"Oswald,sans-serif",fontSize:18,letterSpacing:2,color:"var(--gold)"}}>{mg.label}</span>
        <span style={{fontFamily:"Oswald,sans-serif",fontSize:11,letterSpacing:1,padding:"2px 8px",borderRadius:2,background:mg.status==="active"?"#27ae60":mg.status==="ended"?"var(--silver)":"var(--pitch)",color:"white"}}>{mg.status||"draft"}</span>
      </div>

      {/* AI Suggestion Generator */}
      <div style={{background:"rgba(201,168,76,0.06)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:4,padding:16,marginBottom:16}}>
        <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"var(--silver)",marginBottom:8}}>🤖 AI PUZZLE SUGGESTER</div>
        <div style={{display:"flex",gap:8,marginBottom:suggestions.length?12:0}}>
          <input className="admin-input" style={{flex:1}} placeholder="Country name (e.g. Zimbabwe)" value={country} onChange={e=>setCountry(e.target.value)} onKeyDown={e=>e.key==="Enter"&&generateSuggestions()} />
          <button className="btn btn-gold" onClick={generateSuggestions} disabled={loading||!country.trim()}>{loading?"Generating…":"Generate"}</button>
        </div>
        {suggestions.map((s,i)=>(
          <div key={i} style={{padding:"10px 12px",background:"var(--card-bg)",borderRadius:4,marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
            <div>
              <div style={{fontFamily:"Oswald,sans-serif",fontWeight:700,fontSize:14}}>{s.name}</div>
              <div style={{fontSize:22,margin:"4px 0"}}>{s.emojis}</div>
              <div style={{fontSize:12,color:"var(--silver)",fontStyle:"italic"}}>{s.explanation}</div>
            </div>
            <button className="btn btn-sm btn-pitch" onClick={()=>setNewPuzzle(p=>({...p,country:country.trim(),emojis:s.emojis,answer:s.name}))}>Use</button>
          </div>
        ))}
      </div>

      {/* Add Puzzle */}
      <div style={{background:"#1a0a0a",border:"1px solid #3a1515",borderRadius:4,padding:16,marginBottom:16}}>
        <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"var(--silver)",marginBottom:10}}>ADD PUZZLE</div>
        <div className="admin-grid">
          <div className="admin-field"><label className="admin-label">Country</label><input className="admin-input" placeholder="e.g. Zimbabwe" value={newPuzzle.country} onChange={e=>setNewPuzzle(p=>({...p,country:e.target.value}))} /></div>
          <div className="admin-field"><label className="admin-label">Emojis</label><input className="admin-input" placeholder="🔚❤️" value={newPuzzle.emojis} onChange={e=>setNewPuzzle(p=>({...p,emojis:e.target.value}))} style={{fontSize:22}} /></div>
          <div className="admin-field"><label className="admin-label">Answer (hidden)</label><input className="admin-input" placeholder="Peter Ndlovu" value={newPuzzle.answer} onChange={e=>setNewPuzzle(p=>({...p,answer:e.target.value}))} /></div>
          <div className="admin-field"><label className="admin-label">Time Limit (seconds)</label><input type="number" className="admin-input" value={newPuzzle.timeLimit} onChange={e=>setNewPuzzle(p=>({...p,timeLimit:Number(e.target.value)}))} /></div>
        </div>
        <div className="flex-end"><button className="btn btn-gold" onClick={addPuzzle}>Add Puzzle</button></div>
      </div>

      {/* Puzzle List */}
      {(mg.puzzles||[]).length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"var(--silver)",marginBottom:8}}>PUZZLES ({mg.puzzles.length})</div>
          {mg.puzzles.map(pz=>(
            <div key={pz.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #3a1515"}}>
              <div>
                <span style={{fontSize:20,marginRight:10}}>{pz.emojis}</span>
                <span style={{color:"var(--cream)",fontSize:13}}>{pz.country}</span>
                {pz.solved&&<span style={{color:"#27ae60",fontSize:12,marginLeft:8}}>✓ {pz.winner} guessed it</span>}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                {mg.status==="active"&&!pz.solved&&(
                  <select className="admin-input" style={{maxWidth:140,fontSize:12}} onChange={e=>{if(e.target.value)markSolved(pz.id,e.target.value);}}>
                    <option value="">Mark solved by…</option>
                    {game.players.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                )}
                {!mg.status&&<button className="btn btn-sm btn-red" onClick={()=>removePuzzle(pz.id)}>✕</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {(!mg.status||mg.status==="draft")&&(mg.puzzles||[]).length>0&&<button className="btn btn-green" onClick={startGame}>▶ Start Game</button>}
        {mg.status==="active"&&<button className="btn btn-red" onClick={endGame}>⏹ End Game & Score</button>}
      </div>
    </div>
  );
}

function EmojiBonusPlayer({ game, mg, session, dispatch }) {
  const [guess, setGuess] = useState({});
  const [submitted, setSubmitted] = useState({});

  function submitGuess(puzzleId) {
    if (!guess[puzzleId]?.trim()) return;
    const pz = (mg.puzzles||[]).find(p=>p.id===puzzleId);
    const correct = guess[puzzleId].trim().toLowerCase() === pz?.answer?.toLowerCase();
    const guesses = { ...(pz?.guesses||{}), [session.username]:{ text:guess[puzzleId].trim(), correct, timestamp:new Date().toISOString() } };
    const puzzles = (mg.puzzles||[]).map(p=>p.id===puzzleId?{...p,guesses}:p);
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{puzzles}});
    setSubmitted(p=>({...p,[puzzleId]:correct?"correct":"wrong"}));
  }

  const active = mg.status==="active";
  const ended = mg.status==="ended";

  return (
    <div>
      <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"var(--silver)",marginBottom:12}}>
        {!active&&!ended?"⏳ Waiting for Umersconi to start…":active?"🟢 LIVE — Submit your guesses!":"🔴 ENDED"}
      </div>
      {(mg.puzzles||[]).map(pz=>{
        const myGuess = pz.guesses?.[session.username];
        const solved = pz.solved;
        return (
          <div key={pz.id} style={{background:"var(--card-bg)",border:"1px solid rgba(201,168,76,0.15)",borderRadius:4,padding:16,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontFamily:"Oswald,sans-serif",fontSize:11,letterSpacing:2,color:"var(--silver)",marginBottom:4}}>{pz.country?.toUpperCase()}</div>
                <div style={{fontSize:36}}>{pz.emojis}</div>
              </div>
              {solved&&<div style={{background:"#d5f5e3",border:"1px solid #27ae60",borderRadius:4,padding:"6px 12px",textAlign:"center"}}>
                <div style={{fontFamily:"Oswald,sans-serif",fontSize:11,color:"#27ae60"}}>SOLVED</div>
                <div style={{fontWeight:700,fontSize:13}}>{pz.winner} +5pts</div>
                {ended&&<div style={{fontSize:13,color:"var(--silver)",marginTop:2}}>{pz.answer}</div>}
              </div>}
              {!solved&&ended&&<div style={{background:"#fadbd8",border:"1px solid var(--red)",borderRadius:4,padding:"6px 12px",textAlign:"center"}}>
                <div style={{fontFamily:"Oswald,sans-serif",fontSize:11,color:"var(--red)"}}>UMERSCONI WINS</div>
                <div style={{fontSize:13,color:"var(--silver)",marginTop:2}}>{pz.answer}</div>
              </div>}
            </div>
            {active&&!solved&&(
              myGuess ? (
                <div style={{fontSize:13,fontStyle:"italic",color:myGuess.correct?"#27ae60":"var(--silver)"}}>
                  {myGuess.correct?"✓ Correct! +5 points":"Your guess: "+myGuess.text+" — keep thinking…"}
                </div>
              ) : (
                <div style={{display:"flex",gap:8}}>
                  <input className="pred-input" placeholder="Who is it? Type your answer…" value={guess[pz.id]||""} onChange={e=>setGuess(p=>({...p,[pz.id]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&submitGuess(pz.id)} />
                  <button className="btn btn-sm btn-gold" onClick={()=>submitGuess(pz.id)}>Guess</button>
                </div>
              )
            )}
          </div>
        );
      })}
      {ended&&mg.umerWins>0&&<div style={{marginTop:12,padding:"12px 16px",background:"#fadbd8",border:"1px solid var(--red)",borderRadius:4,fontSize:13,color:"var(--red)"}}>🏠 Umersconi won <strong>{mg.umerWins} points</strong> from unguessed puzzles.</div>}
    </div>
  );
}

// ── WHO AM I? ─────────────────────────────────────────────────────────────────
function WhoAmIAdmin({ game, mg, dispatch }) {
  const [newClue, setNewClue] = useState("");
  const [answer, setAnswer] = useState(mg.answer||"");

  function addClue() {
    if (!newClue.trim()) return;
    const clueNum = (mg.clues||[]).length+1;
    if (clueNum>3) return;
    const clues=[...(mg.clues||[]),{num:clueNum,text:newClue.trim(),releasedAt:null}];
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{clues}});
    setNewClue("");
  }
  function releaseClue(num) {
    const clues=(mg.clues||[]).map(c=>c.num===num?{...c,releasedAt:new Date().toISOString()}:c);
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{clues,status:"active"}});
  }
  function saveAnswer() { dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{answer:answer.trim()}}); }
  function declareWinner(player, clueNum) {
    const pts = clueNum===1?100:25;
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{status:"ended",winner:player,winnerClue:clueNum,winnerPts:pts}});
  }
  function declareUmer() { dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{status:"ended",winner:"Umersconi",winnerPts:0}}); }

  const pts = [100,25,25];

  return (
    <div>
      <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:18,color:"var(--gold)",marginBottom:12}}>{mg.label}</div>

      {/* Answer */}
      <div style={{marginBottom:16}}>
        <div className="admin-label" style={{marginBottom:6}}>Secret Answer</div>
        <div style={{display:"flex",gap:8}}>
          <input className="admin-input" style={{flex:1}} placeholder="The player's name (hidden from players)" value={answer} onChange={e=>setAnswer(e.target.value)} />
          <button className="btn btn-sm btn-gold" onClick={saveAnswer}>Save</button>
        </div>
      </div>

      {/* Clues */}
      <div style={{marginBottom:16}}>
        <div className="admin-label" style={{marginBottom:8}}>CLUES (max 3 · {pts.join(", ")} pts per clue)</div>
        {(mg.clues||[]).map(c=>(
          <div key={c.num} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #3a1515",gap:12}}>
            <div>
              <span style={{fontFamily:"Oswald,sans-serif",color:"var(--red)",marginRight:8}}>CLUE {c.num}</span>
              <span style={{color:"var(--cream)",fontSize:13}}>{c.text}</span>
              {c.releasedAt&&<span style={{color:"#27ae60",fontSize:11,marginLeft:8}}>Released {new Date(c.releasedAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</span>}
            </div>
            {!c.releasedAt&&<button className="btn btn-sm btn-green" onClick={()=>releaseClue(c.num)}>▶ Release</button>}
          </div>
        ))}
        {(mg.clues||[]).length<3&&(
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <input className="admin-input" style={{flex:1}} placeholder={`Clue ${(mg.clues||[]).length+1} — ${pts[(mg.clues||[]).length]} pts`} value={newClue} onChange={e=>setNewClue(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addClue()} />
            <button className="btn btn-sm btn-gold" onClick={addClue}>Add Clue</button>
          </div>
        )}
      </div>

      {/* Guesses */}
      {(mg.status==="active"||mg.status==="ended")&&(
        <div style={{marginBottom:16}}>
          <div className="admin-label" style={{marginBottom:8}}>PLAYER GUESSES</div>
          {Object.entries(mg.guesses||{}).sort((a,b)=>new Date(a[1].timestamp)-new Date(b[1].timestamp)).map(([player,g])=>(
            <div key={player} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #3a1515"}}>
              <div>
                <span style={{fontFamily:"Oswald,sans-serif",fontWeight:700,fontSize:14,color:"var(--cream)"}}>{player}</span>
                <span style={{color:"var(--silver)",fontSize:12,margin:"0 8px"}}>after Clue {g.clue}</span>
                <span style={{fontSize:13,color:"var(--cream)"}}>{g.text}</span>
                <span style={{color:"var(--silver)",fontSize:11,marginLeft:8}}>{new Date(g.timestamp).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</span>
              </div>
              {mg.status!=="ended"&&<button className="btn btn-sm btn-green" onClick={()=>declareWinner(player,g.clue)}>✓ Winner</button>}
            </div>
          ))}
          {!Object.keys(mg.guesses||{}).length&&<div style={{color:"var(--silver)",fontStyle:"italic",fontSize:13}}>No guesses yet.</div>}
          {mg.status!=="ended"&&<div className="flex-end"><button className="btn btn-red" onClick={declareUmer}>No winner — Umersconi wins</button></div>}
        </div>
      )}

      {/* Result */}
      {mg.status==="ended"&&(
        <div style={{padding:"12px 16px",background:mg.winner==="Umersconi"?"#fadbd8":"#d5f5e3",border:`1px solid ${mg.winner==="Umersconi"?"var(--red)":"#27ae60"}`,borderRadius:4}}>
          {mg.winner==="Umersconi"?"🏠 Umersconi wins — nobody guessed it!":`🏆 ${mg.winner} won on Clue ${mg.winnerClue} (+${mg.winnerPts} pts). Answer: ${mg.answer}`}
          {mg.winner!=="Umersconi"&&<div style={{fontSize:12,color:"var(--silver)",marginTop:4}}>Winner chooses: take {mg.winnerPts} pts OR distribute from Umersconi to all.</div>}
        </div>
      )}
    </div>
  );
}

function WhoAmIPlayer({ game, mg, session, dispatch }) {
  const [guess, setGuess] = useState("");
  const myGuess = mg.guesses?.[session.username];
  const releasedClues = (mg.clues||[]).filter(c=>c.releasedAt);
  const latestClue = releasedClues[releasedClues.length-1];

  function submitGuess() {
    if (!guess.trim()||!latestClue) return;
    const guesses = {...(mg.guesses||{}), [session.username]:{ text:guess.trim(), clue:latestClue.num, timestamp:new Date().toISOString() }};
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{guesses}});
    setGuess("");
  }

  return (
    <div>
      {releasedClues.length===0&&<div className="empty">Umersconi hasn't released any clues yet.</div>}
      {releasedClues.map(c=>(
        <div key={c.num} style={{background:"var(--card-bg)",border:"1px solid rgba(201,168,76,0.15)",borderRadius:4,padding:16,marginBottom:10}}>
          <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"var(--gold)",marginBottom:6}}>CLUE {c.num} — {c.num===1?"100":c.num===2?"25":"25"} POINTS TO GUESS IT NOW</div>
          <div style={{fontSize:16,color:"var(--ink)"}}>{c.text}</div>
        </div>
      ))}
      {mg.status==="active"&&releasedClues.length>0&&(
        myGuess ? (
          <div style={{padding:"10px 14px",background:"rgba(201,168,76,0.1)",border:"1px solid rgba(201,168,76,0.3)",borderRadius:4,fontSize:13}}>
            Your guess: <strong>{myGuess.text}</strong> (after Clue {myGuess.clue}) — waiting for Umersconi to reveal.
          </div>
        ) : (
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <input className="pred-input" placeholder="Who is it?" value={guess} onChange={e=>setGuess(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitGuess()} />
            <button className="btn btn-gold" onClick={submitGuess}>Submit Guess</button>
          </div>
        )
      )}
      {mg.status==="ended"&&(
        <div style={{marginTop:12,padding:"12px 16px",background:mg.winner===session.username?"#d5f5e3":"var(--card-bg)",border:`1px solid ${mg.winner===session.username?"#27ae60":"rgba(201,168,76,0.2)"}`,borderRadius:4}}>
          {mg.winner==="Umersconi"?"🏠 Nobody guessed it — Umersconi wins. The answer was: "+mg.answer:`🏆 ${mg.winner} got it on Clue ${mg.winnerClue}! Answer: ${mg.answer}`}
          {mg.winner===session.username&&<div style={{fontSize:12,marginTop:6,color:"var(--silver)"}}>You won {mg.winnerPts} pts — tell Umersconi whether you want to keep them or redistribute.</div>}
        </div>
      )}
    </div>
  );
}

// ── BOUNTY HUNTERS ────────────────────────────────────────────────────────────
const BOUNTY_TABLE = [150, 100, 75, 50, 25, 20, 15, 10, 10, 10];

function calcBountyHunters(game, mg) {
  const scores = calcScores(game);
  const ranked = [...game.players].sort((a,b)=>scores[b].total-scores[a].total);
  const n = ranked.length;
  const cutoff = Math.floor(n/2); // players at index >= cutoff are hunters
  const topHalf = ranked.slice(0,cutoff);
  const bottomHalf = ranked.slice(cutoff);
  const bounties = {};
  topHalf.forEach((p,i)=>{ bounties[p] = BOUNTY_TABLE[i]||10; });
  return { ranked, topHalf, bottomHalf, bounties, scores };
}

function BountyHuntersAdmin({ game, mg, dispatch }) {
  const { topHalf, bottomHalf, bounties } = calcBountyHunters(game, mg);

  function startDay() { dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{status:"active",dayStartedAt:new Date().toISOString(),resolvedKills:[]}}); }

  function resolveDay() {
    // Work out kills per hunter from match predictions on the match day
    const dayMatches = (game.matches||[]).filter(m=>m.result && mg.matchDay && formatDateKey(m.kickoff)===mg.matchDay);
    const kills = {};
    bottomHalf.forEach(hunter=>{
      let k=0;
      dayMatches.forEach(m=>{
        const pred=(game.predictions[m.id]||{})[hunter];
        if (pred&&pred.result===m.result) k++;
      });
      kills[hunter]=k;
    });
    // Apply tags: hunter's kills go to their tagged targets in order
    const resolvedKills=[];
    bottomHalf.forEach(hunter=>{
      const tags = (mg.tags||{})[hunter]||[];
      const numKills = kills[hunter]||0;
      for(let i=0;i<numKills;i++){
        const target=tags[i];
        if(target&&topHalf.includes(target)){
          resolvedKills.push({hunter,victim:target,pts:bounties[target]||25});
        }
      }
    });
    // Bloodlust: perfect score → can steal 50 from another hunter
    const bloodlust=[];
    bottomHalf.forEach(hunter=>{
      const hasPS=dayMatches.some(m=>{const p=(game.predictions[m.id]||{})[hunter];return p&&p.score===m.score;});
      if(hasPS){
        const blTarget=(mg.bloodlustTargets||{})[hunter];
        if(blTarget&&bottomHalf.includes(blTarget)&&blTarget!==hunter) bloodlust.push({hunter,victim:blTarget,pts:50});
      }
    });
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{status:"ended",resolvedKills,bloodlust,kills}});
  }

  function setMatchDay(day) { dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{matchDay:day}}); }

  // Unique match days
  const matchDays = [...new Set((game.matches||[]).filter(m=>m.kickoff).map(m=>formatDateKey(m.kickoff)))];

  return (
    <div>
      <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:18,color:"var(--gold)",marginBottom:12}}>{mg.label}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{background:"#fadbd8",border:"1px solid var(--red)",borderRadius:4,padding:12}}>
          <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:11,color:"var(--red)",marginBottom:6}}>🎯 MOST WANTED</div>
          {topHalf.map(p=><div key={p} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",color:"var(--ink)",fontSize:13}}><span style={{fontWeight:600}}>{p}</span><span style={{fontFamily:"Oswald,sans-serif",color:"var(--red)"}}>{bounties[p]} pts</span></div>)}
        </div>
        <div style={{background:"#d6eaf8",border:"1px solid #2980b9",borderRadius:4,padding:12}}>
          <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:11,color:"#2980b9",marginBottom:6}}>🏹 HUNTERS</div>
          {bottomHalf.map(p=><div key={p} style={{padding:"4px 0",color:"var(--ink)",fontSize:13,fontWeight:600}}>{p}</div>)}
        </div>
      </div>
      <div className="admin-field" style={{marginBottom:14}}>
        <label className="admin-label">Match Day</label>
        <select className="admin-input" value={mg.matchDay||""} onChange={e=>setMatchDay(e.target.value)}>
          <option value="">— Select match day —</option>
          {matchDays.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {!mg.status&&<button className="btn btn-green" onClick={startDay} disabled={!mg.matchDay}>▶ Open for Tagging</button>}
        {mg.status==="active"&&<button className="btn btn-red" onClick={resolveDay}>⚔ Resolve Bounties</button>}
      </div>
      {mg.status==="ended"&&(
        <div style={{marginTop:16}}>
          <div className="admin-label" style={{marginBottom:8}}>RESOLVED KILLS</div>
          {(mg.resolvedKills||[]).map((k,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(201,168,76,0.15)",fontSize:13,color:"var(--ink)"}}><span>⚔ <strong>{k.hunter}</strong> hunts <strong>{k.victim}</strong></span><span style={{fontFamily:"Oswald,sans-serif",color:"var(--red)"}}>−{k.pts} / +{k.pts}</span></div>)}
          {(mg.bloodlust||[]).map((b,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(201,168,76,0.15)",fontSize:13,color:"var(--ink)"}}><span>🩸 <strong>{b.hunter}</strong> BLOODLUST → <strong>{b.victim}</strong></span><span style={{fontFamily:"Oswald,sans-serif",color:"#8e44ad"}}>−50 / +50</span></div>)}
        </div>
      )}
    </div>
  );
}

function BountyHuntersPlayer({ game, mg, session, dispatch }) {
  const { topHalf, bottomHalf, bounties } = calcBountyHunters(game, mg);
  const isHunter = bottomHalf.includes(session.username);
  const myTags = (mg.tags||{})[session.username]||[];
  const myBloodlust = (mg.bloodlustTargets||{})[session.username]||"";

  function setTag(i, player) {
    const tags=[...myTags];
    tags[i]=player;
    const newTags={...(mg.tags||{}),[session.username]:tags};
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{tags:newTags}});
  }
  function setBloodlust(player) {
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{bloodlustTargets:{...(mg.bloodlustTargets||{}),[session.username]:player}}});
  }

  if (!isHunter) return (
    <div>
      <div style={{padding:"12px 16px",background:"#fadbd8",border:"1px solid var(--red)",borderRadius:4,marginBottom:12,fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"var(--red)"}}>🎯 YOU ARE MOST WANTED — Bounty: {bounties[session.username]} pts</div>
      <div style={{fontSize:13,color:"var(--silver)",fontStyle:"italic"}}>Hunters are gunning for you. Play well and stay safe.</div>
    </div>
  );

  if (mg.status==="ended") return (
    <div>
      <div className="admin-label" style={{marginBottom:8}}>BOUNTY RESULTS</div>
      {(mg.resolvedKills||[]).filter(k=>k.hunter===session.username||k.victim===session.username).map((k,i)=>(
        <div key={i} style={{padding:"10px 14px",background:k.hunter===session.username?"#d5f5e3":"#fadbd8",border:`1px solid ${k.hunter===session.username?"#27ae60":"var(--red)"}`,borderRadius:4,marginBottom:6,fontSize:13}}>
          {k.hunter===session.username?`⚔ You hunted ${k.victim} +${k.pts} pts`:`⚔ ${k.hunter} hunted you −${k.pts} pts`}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div style={{padding:"10px 14px",background:"#d6eaf8",border:"1px solid #2980b9",borderRadius:4,marginBottom:16,fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"#2980b9"}}>🏹 YOU ARE A HUNTER</div>
      {mg.status==="active"?(
        <div>
          <div style={{marginBottom:14}}>
            <div className="admin-label" style={{marginBottom:8}}>TAG YOUR TARGETS (in kill priority order)</div>
            <div style={{fontSize:12,color:"var(--silver)",fontStyle:"italic",marginBottom:10}}>You'll earn kills based on correct results today. Tag who you want to hunt — first kill = Tag 1, second = Tag 2, etc.</div>
            {[0,1,2,3,4].map(i=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
                <span style={{fontFamily:"Oswald,sans-serif",fontSize:12,color:"var(--silver)",minWidth:60}}>KILL {i+1}</span>
                <select className="pred-input" style={{flex:1}} value={myTags[i]||""} onChange={e=>setTag(i,e.target.value)}>
                  <option value="">— Tag target —</option>
                  {topHalf.map(p=><option key={p} value={p}>{p} ({bounties[p]} pts)</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{marginBottom:14}}>
            <div className="admin-label" style={{marginBottom:6}}>🩸 BLOODLUST TARGET (if you get a perfect score)</div>
            <div style={{fontSize:12,color:"var(--silver)",fontStyle:"italic",marginBottom:8}}>If you predict an exact score, you steal 50pts from another Hunter.</div>
            <select className="pred-input" value={myBloodlust} onChange={e=>setBloodlust(e.target.value)}>
              <option value="">— Select a Hunter to turn on —</option>
              {bottomHalf.filter(p=>p!==session.username).map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      ):(
        <div style={{fontSize:13,color:"var(--silver)",fontStyle:"italic"}}>Waiting for Umersconi to open tagging…</div>
      )}
    </div>
  );
}

// ── TRAITORS ──────────────────────────────────────────────────────────────────
const TRAITOR_ACTIONS = [
  {id:"curse",label:"CURSE",desc:"50% of target's winnings today → Traitor Pot"},
  {id:"swap",label:"SWAP",desc:"Swap two players' Killer predictions (and their points)"},
  {id:"ambush",label:"AMBUSH",desc:"Any points target steals today → Traitor Pot"},
  {id:"double_tap",label:"DOUBLE TAP",desc:"Points stolen from target are doubled; other half → Traitor Pot"},
  {id:"execution",label:"EXECUTION",desc:"If target is worst performer, 50% of their total points → Traitor Pot"},
];

// ─── TRAITORS RESOLUTION ENGINE ───────────────────────────────────────────────
function resolveTraitors(game, mg) {
  const traitors = mg.traitors || [];
  const votes = mg.votes || {};
  const actions = mg.actions || {};
  const nominations = mg.playerNominations || {};
  const pot = mg.potSize || 0;
  const players = game.players || [];
  const n = players.length;

  // 1. Build shields: player P is shielded from traitor T if P nominated T
  const shielded = {}; // shielded[traitor][target] = true
  traitors.forEach(t => {
    shielded[t] = {};
    Object.entries(nominations).forEach(([nominator, suspected]) => {
      if (suspected === t) shielded[t][nominator] = true;
    });
  });

  // 2. Identify which Match Day this traitors game references
  const matchDays = autoGenerateMatchDays(game);
  const mgMatchDay = matchDays.find(d => d.id === mg.matchDayId) || matchDays[matchDays.length - 1];
  const dayMatchIds = new Set(mgMatchDay?.matchIds || []);

  // 3. Calculate day winnings per player (base pts from matches on this match day only)
  function calcDayWinnings(player) {
    let pts = 0;
    dayMatchIds.forEach(matchId => {
      const match = (game.matches||[]).find(m => m.id === matchId);
      if (!match?.result) return;
      const pred = (game.predictions[matchId]||{})[player];
      if (!pred || pred.result === "x") { pts += forfeitPenalty(match); return; }
      if (match.stage === "group") {
        if (pred.result === match.result) pts += isPerfectScore(pred.score, match.score) ? 8 : 3;
      } else {
        const round = KNOCKOUT_ROUNDS.find(r => r.id === match.round);
        if (!round) return;
        if (pred.result === match.result) pts += isPerfectScore(pred.score, match.score) ? round.correctScore : round.correctResult;
        else pts += round.wrong;
      }
    });
    return Math.max(0, pts); // Can't curse negative winnings
  }

  // 4. Calculate total tournament points per player (for EXECUTION)
  const tourneyCurrent = calcScores(game);
  function totalPts(player) { return tourneyCurrent[player]?.total || 0; }

  // 5. Find worst performer on this match day
  const dayWinnings = {};
  players.forEach(p => { dayWinnings[p] = calcDayWinnings(p); });
  const worstPts = Math.min(...players.map(p => dayWinnings[p]));
  const worstPlayers = players.filter(p => dayWinnings[p] === worstPts);

  // 6. Process actions — collect point movements
  const resolvedActions = []; // { type:"gain"|"loss", player, pts, reason }
  let traitorPotAccumulated = 0;
  let umersconiBonus = 0;

  // Also track Killer swap flags
  const swapFlags = []; // { traitor, p1, p2 }

  traitors.forEach(traitor => {
    const traitorActions = actions[traitor] || [];
    const traitorDayWin = dayWinnings[traitor];
    const traitorTotalPts = totalPts(traitor);

    traitorActions.forEach(({ action, target, target2 }) => {
      const isShielded = shielded[traitor]?.[target];

      if (action === "curse") {
        if (isShielded) {
          const penalty = Math.floor(traitorDayWin * 0.5);
          umersconiBonus += penalty;
          resolvedActions.push({ type:"loss", player:traitor, pts:penalty, reason:`CURSE backfired on ${traitor} — ${target} was shielded` });
        } else {
          const stolen = Math.floor(dayWinnings[target] * 0.5);
          traitorPotAccumulated += stolen;
          resolvedActions.push({ type:"loss", player:target, pts:stolen, reason:`CURSE by ${traitor}: 50% of ${target}'s day winnings → Traitor Pot` });
        }
      }

      else if (action === "swap") {
        // SWAP needs two targets: target and target2
        const t2Shielded = shielded[traitor]?.[target2];
        if (isShielded || t2Shielded) {
          const penalty = Math.floor(traitorDayWin * 0.5);
          umersconiBonus += penalty;
          resolvedActions.push({ type:"loss", player:traitor, pts:penalty, reason:`SWAP backfired — target was shielded from ${traitor}` });
        } else {
          // Record swap flag (scoring engine will handle the delta)
          swapFlags.push({ traitor, p1: target, p2: target2 });
          resolvedActions.push({ type:"info", player:traitor, pts:0, reason:`SWAP: ${target} ↔ ${target2} Killer predictions swapped` });
        }
      }

      else if (action === "ambush") {
        if (isShielded) {
          const penalty = Math.floor(traitorDayWin * 0.5);
          umersconiBonus += penalty;
          resolvedActions.push({ type:"loss", player:traitor, pts:penalty, reason:`AMBUSH backfired on ${traitor} — ${target} was shielded` });
        } else {
          // Points target steals today go to pot — this is applied via resolvedActions flag
          resolvedActions.push({ type:"ambush", player:target, pts:0, reason:`AMBUSH by ${traitor}: ${target}'s stolen points today → Traitor Pot` });
        }
      }

      else if (action === "double_tap") {
        if (isShielded) {
          const penalty = Math.floor(traitorDayWin * 0.5);
          umersconiBonus += penalty;
          resolvedActions.push({ type:"loss", player:traitor, pts:penalty, reason:`DOUBLE TAP backfired — ${target} was shielded from ${traitor}` });
        } else {
          resolvedActions.push({ type:"double_tap", player:target, pts:0, reason:`DOUBLE TAP by ${traitor}: points stolen from ${target} doubled; half → Traitor Pot` });
        }
      }

      else if (action === "execution") {
        if (isShielded) {
          const penalty = Math.floor(traitorTotalPts * 0.5);
          umersconiBonus += penalty;
          resolvedActions.push({ type:"loss", player:traitor, pts:penalty, reason:`EXECUTION backfired — ${target} was shielded. ${traitor} loses 50% of total pts → Umersconi` });
        } else {
          if (worstPlayers.includes(target)) {
            const stolen = Math.floor(totalPts(target) * 0.5);
            traitorPotAccumulated += stolen;
            resolvedActions.push({ type:"loss", player:target, pts:stolen, reason:`EXECUTION by ${traitor}: ${target} was worst performer — 50% of total pts → Traitor Pot` });
          } else {
            resolvedActions.push({ type:"info", player:traitor, pts:0, reason:`EXECUTION by ${traitor} failed — ${target} was not the worst performer` });
          }
        }
      }
    });
  });

  // 7. Vote resolution
  // A traitor is "identified" if strictly more than half the voters named them
  const majorityThreshold = Math.floor(n / 2) + (n % 2 === 0 ? 1 : 1); // strict majority
  const identified = traitors.filter(t => {
    const votesForT = Object.values(votes).filter(v => Array.isArray(v) && v.includes(t)).length;
    return votesForT >= majorityThreshold;
  });
  const allIdentified = identified.length === traitors.length;
  const noneIdentified = identified.length === 0;
  const partial = !allIdentified && !noneIdentified;

  // 8. Pot distribution
  if (allIdentified) {
    // Faithful (non-Traitors) share pot
    const faithful = players.filter(p => !traitors.includes(p));
    if (faithful.length) {
      const share = Math.floor((pot + traitorPotAccumulated) / faithful.length);
      faithful.forEach(p => resolvedActions.push({ type:"gain", player:p, pts:share, reason:`Traitor Pot share — all traitors identified` }));
    }
  } else if (noneIdentified) {
    // Traitors share pot
    if (traitors.length) {
      const share = Math.floor((pot + traitorPotAccumulated) / traitors.length);
      traitors.forEach(p => resolvedActions.push({ type:"gain", player:p, pts:share, reason:`Traitor Pot share — no traitors identified` }));
    }
  } else {
    // Partial — entire pot goes to Umersconi (not distributed to players)
    umersconiBonus += pot + traitorPotAccumulated;
  }

  return {
    resolvedActions,
    swapFlags,
    identified,
    allIdentified,
    noneIdentified,
    partial,
    umersconiBonus,
    traitorPotAccumulated,
    dayWinnings,
    worstPlayers,
  };
}

// ─── TRAITORS ADMIN ──────────────────────────────────────────────────────────
function TraitorsAdmin({ game, mg, dispatch }) {
  const [selectedTraitors, setSelectedTraitors] = useState(mg.traitors||[]);
  const [potSize, setPotSize] = useState(mg.potSize||200);
  const [resolution, setResolution] = useState(null);

  const matchDays = autoGenerateMatchDays(game);

  function setTraitorsAndOpen() {
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{
      traitors:selectedTraitors, potSize, status:"nominations",
      traitorsSetAt:new Date().toISOString()
    }});
  }
  function openActions() { dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{status:"traitors-set"}}); }
  function openVote()    { dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{status:"voting"}}); }

  function resolveAndApply() {
    const res = resolveTraitors(game, mg);
    setResolution(res);
    dispatch({type:"UPDATE_MINI_GAME", id:mg.id, updates:{
      status:"ended",
      resolvedActions: res.resolvedActions,
      swapFlags: res.swapFlags,
      identified: res.identified,
      allIdentified: res.allIdentified,
      noneIdentified: res.noneIdentified,
      partial: res.partial,
      umersconiBonus: res.umersconiBonus,
      dayWinnings: res.dayWinnings,
      worstPlayers: res.worstPlayers,
    }});
  }

  const phaseLabel = {
    nominations:"Phase 1 — Nominations open",
    "traitors-set":"Phase 2 — Traitor actions",
    voting:"Phase 3 — Voting",
    ended:"Resolved",
  }[mg.status] || "Setup";

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:18,color:"var(--gold)"}}>{mg.label}</div>
        <div style={{fontFamily:"Oswald,sans-serif",fontSize:11,letterSpacing:2,padding:"3px 10px",borderRadius:2,background:"rgba(192,57,43,0.2)",color:"var(--red)",border:"1px solid rgba(192,57,43,0.4)"}}>{phaseLabel}</div>
      </div>

      {/* SETUP */}
      {(!mg.status||mg.status==="draft")&&(
        <div>
          <div className="admin-field" style={{marginBottom:14}}>
            <label className="admin-label">Match Day</label>
            <select className="admin-input" value={mg.matchDayId||""} onChange={e=>dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{matchDayId:e.target.value}})}>
              <option value="">— Select match day —</option>
              {matchDays.map(d=><option key={d.id} value={d.id}>{d.label} ({d.date})</option>)}
            </select>
          </div>
          <div className="admin-field" style={{marginBottom:14}}>
            <label className="admin-label">Traitor Pot Size (points)</label>
            <input type="number" className="admin-input" value={potSize} onChange={e=>setPotSize(Number(e.target.value))} />
          </div>
          <div className="admin-label" style={{marginBottom:8}}>DESIGNATE TRAITORS (2–3)</div>
          {game.players.map(p=>(
            <div key={p} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid #3a1515"}}>
              <input type="checkbox" checked={selectedTraitors.includes(p)}
                onChange={e=>setSelectedTraitors(prev=>e.target.checked?[...prev,p]:prev.filter(t=>t!==p))}
                style={{accentColor:"var(--red)",width:16,height:16}} />
              <span style={{color:"var(--cream)",fontSize:13,fontFamily:"Oswald,sans-serif",fontWeight:700}}>{p}</span>
            </div>
          ))}
          <div className="flex-end" style={{marginTop:14}}>
            <button className="btn btn-red" onClick={setTraitorsAndOpen}
              disabled={selectedTraitors.length<2||selectedTraitors.length>3||!mg.matchDayId}>
              Open Nominations ({selectedTraitors.length} traitors)
            </button>
          </div>
        </div>
      )}

      {/* PHASE 1: Nominations open */}
      {mg.status==="nominations"&&(
        <div>
          <div className="notice" style={{background:"rgba(192,57,43,0.08)",borderColor:"rgba(192,57,43,0.3)"}}>
            Players are nominating their suspects. Once all have submitted, advance to Phase 2.
          </div>
          <div className="admin-label" style={{marginBottom:8}}>PLAYER NOMINATIONS</div>
          {game.players.filter(p=>!(mg.traitors||[]).includes(p)).map(p=>(
            <div key={p} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #3a1515",fontSize:13,color:"var(--cream)"}}>
              <span>{p}</span>
              <span style={{color:"var(--silver)"}}>{mg.playerNominations?.[p]||"—"}</span>
            </div>
          ))}
          <div className="flex-end" style={{marginTop:14}}>
            <button className="btn btn-red" onClick={openActions}>Advance → Traitor Actions</button>
          </div>
        </div>
      )}

      {/* PHASE 2: Traitor actions */}
      {mg.status==="traitors-set"&&(
        <div>
          <div className="notice" style={{background:"rgba(192,57,43,0.08)",borderColor:"rgba(192,57,43,0.3)"}}>
            Traitors are choosing their actions. Match day is underway.
          </div>
          <div className="admin-label" style={{marginBottom:8}}>TRAITOR ACTIONS SUBMITTED</div>
          {(mg.traitors||[]).map(t=>{
            const acts=(mg.actions||{})[t]||[];
            return (
              <div key={t} style={{padding:"10px 0",borderBottom:"1px solid #3a1515"}}>
                <div style={{fontFamily:"Oswald,sans-serif",fontWeight:700,color:"var(--red)",fontSize:14,marginBottom:4}}>{t}</div>
                {acts.length===0
                  ? <div style={{color:"var(--silver)",fontStyle:"italic",fontSize:12}}>No actions submitted yet</div>
                  : acts.map((a,i)=><div key={i} style={{fontSize:12,color:"var(--cream)"}}>{TRAITOR_ACTIONS.find(x=>x.id===a.action)?.label} → {a.target}{a.target2?` & ${a.target2}`:""}</div>)
                }
              </div>
            );
          })}
          <div className="flex-end" style={{marginTop:14}}>
            <button className="btn btn-red" onClick={openVote}>Advance → Open Voting</button>
          </div>
        </div>
      )}

      {/* PHASE 3: Voting */}
      {mg.status==="voting"&&(
        <div>
          <div className="notice" style={{background:"rgba(192,57,43,0.08)",borderColor:"rgba(192,57,43,0.3)"}}>
            Players are voting on who they think the Traitors are. Resolve when all votes are in.
          </div>
          <div className="admin-label" style={{marginBottom:8}}>VOTES RECEIVED ({Object.keys(mg.votes||{}).length}/{game.players.length})</div>
          {game.players.map(p=>(
            <div key={p} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #3a1515",fontSize:13,color:"var(--cream)"}}>
              <span>{p}</span>
              <span style={{color:"var(--silver)"}}>{(mg.votes||{})[p]?.join(", ")||"Awaiting…"}</span>
            </div>
          ))}

          {/* Tally */}
          <div style={{marginTop:14,marginBottom:14}}>
            <div className="admin-label" style={{marginBottom:8}}>VOTE TALLY</div>
            {game.players.filter(p=>!(mg.traitors||[]).includes(p)).map(p=>{
              const count=Object.values(mg.votes||{}).filter(v=>Array.isArray(v)&&v.includes(p)).length;
              const majority=Math.floor(game.players.length/2)+1;
              return (
                <div key={p} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12,color:count>=majority?"#27ae60":"var(--cream)"}}>
                  <span>{p}</span><span>{count} vote{count!==1?"s":""}{count>=majority?" ✓ MAJORITY":""}</span>
                </div>
              );
            })}
          </div>

          <div className="flex-end">
            <button className="btn btn-red" onClick={resolveAndApply}>⚖ Resolve & Apply Points</button>
          </div>
        </div>
      )}

      {/* RESOLVED */}
      {mg.status==="ended"&&(
        <div>
          <div style={{padding:"14px 16px",borderRadius:4,marginBottom:16,
            background:mg.allIdentified?"#d5f5e3":mg.noneIdentified?"#fadbd8":"rgba(201,168,76,0.1)",
            border:`1px solid ${mg.allIdentified?"#27ae60":mg.noneIdentified?"var(--red)":"rgba(201,168,76,0.3)"}`}}>
            <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:14,marginBottom:6,
              color:mg.allIdentified?"#27ae60":mg.noneIdentified?"var(--red)":"var(--gold)"}}>
              {mg.allIdentified?"✓ ALL TRAITORS IDENTIFIED — Faithful share the pot"
               :mg.noneIdentified?"✗ NO TRAITORS IDENTIFIED — Traitors share the pot"
               :"⚠ PARTIAL — Entire pot goes to Umersconi"}
            </div>
            <div style={{fontSize:12,color:"var(--silver)"}}>
              Traitors: {(mg.traitors||[]).join(", ")} ·
              Identified: {(mg.identified||[]).join(", ")||"none"} ·
              Pot: {mg.potSize} pts
              {mg.umersconiBonus>0&&<span> · Umersconi bonus: +{mg.umersconiBonus} pts</span>}
            </div>
          </div>

          <div className="admin-label" style={{marginBottom:8}}>POINT MOVEMENTS</div>
          {(mg.resolvedActions||[]).map((a,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"6px 0",borderBottom:"1px solid rgba(201,168,76,0.1)",gap:8}}>
              <div style={{fontSize:12,color:a.type==="info"?"var(--silver)":"var(--cream)"}}>{a.reason}</div>
              {a.type!=="info"&&a.type!=="ambush"&&a.type!=="double_tap"&&(
                <div style={{fontFamily:"Oswald,sans-serif",fontSize:14,whiteSpace:"nowrap",
                  color:a.type==="gain"?"#27ae60":"var(--red)"}}>
                  {a.type==="gain"?"+":"-"}{a.pts}
                </div>
              )}
            </div>
          ))}
          {(mg.swapFlags||[]).length>0&&(
            <div style={{marginTop:8,padding:"8px 12px",background:"rgba(142,68,173,0.1)",border:"1px solid rgba(142,68,173,0.3)",borderRadius:4,fontSize:12,color:"#8e44ad"}}>
              🔀 Killer Swap flags: {mg.swapFlags.map(s=>`${s.p1} ↔ ${s.p2}`).join(", ")} — adjust Killer scores manually or via next Killer resolve
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TraitorsPlayer({ game, mg, session, dispatch }) {
  const [suspect, setSuspect] = useState(mg.playerNominations?.[session.username]||"");
  const [vote, setVote] = useState((mg.votes||{})[session.username]||[]);
  const [myActions, setMyActions] = useState((mg.actions||{})[session.username]||[]);
  const [actionTarget, setActionTarget] = useState({});
  const [actionTarget2, setActionTarget2] = useState({});
  const isTraitor = (mg.traitors||[]).includes(session.username);
  const hasVoted = !!(mg.votes||{})[session.username];
  const hasNominated = !!(mg.playerNominations||{})[session.username];

  function nominate() {
    if (!suspect) return;
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{
      playerNominations:{...(mg.playerNominations||{}),[session.username]:suspect}
    }});
  }

  function submitVote() {
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{
      votes:{...(mg.votes||{}),[session.username]:vote}
    }});
  }

  function addAction(actId) {
    if (myActions.length >= 2) return;
    const target = actionTarget[actId];
    const target2 = actId === "swap" ? actionTarget2[actId] : undefined;
    if (!target) return;
    if (actId === "swap" && !target2) return;
    if (actId === "swap" && target === target2) return;
    const newActions = [...myActions, { action:actId, target, ...(target2?{target2}:{}) }];
    setMyActions(newActions);
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{
      actions:{...(mg.actions||{}),[session.username]:newActions}
    }});
  }

  function removeAction(i) {
    const newActions = myActions.filter((_,idx)=>idx!==i);
    setMyActions(newActions);
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{
      actions:{...(mg.actions||{}),[session.username]:newActions}
    }});
  }

  const nonTraitors = game.players.filter(p=>!(mg.traitors||[]).includes(p));

  return (
    <div>
      {/* Phase 1 — Nominate */}
      {(mg.status==="nominations"||!mg.status)&&(
        <div>
          <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"var(--silver)",marginBottom:8}}>
            🕵️ PHASE 1 — WHO DO YOU SUSPECT?
          </div>
          <div style={{fontSize:12,color:"var(--silver)",fontStyle:"italic",marginBottom:12}}>
            Nominate one player you think will be named a Traitor. Don't tell anyone.
          </div>
          {hasNominated ? (
            <div style={{padding:"10px 14px",background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:4,fontSize:13,color:"var(--silver)"}}>
              You suspect: <strong style={{color:"var(--cream)"}}>{mg.playerNominations[session.username]}</strong>
            </div>
          ) : (
            <div style={{display:"flex",gap:8}}>
              <select className="pred-input" style={{flex:1}} value={suspect} onChange={e=>setSuspect(e.target.value)}>
                <option value="">— Pick your suspect —</option>
                {game.players.filter(p=>p!==session.username).map(p=><option key={p} value={p}>{p}</option>)}
              </select>
              <button className="btn btn-gold" onClick={nominate} disabled={!suspect}>Submit</button>
            </div>
          )}
        </div>
      )}

      {/* Phase 2 — Traitor picks actions */}
      {isTraitor && mg.status==="traitors-set"&&(
        <div>
          <div style={{padding:"10px 14px",background:"rgba(192,57,43,0.15)",border:"1px solid var(--red)",borderRadius:4,marginBottom:16,fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"var(--red)"}}>
            🔴 YOU ARE A TRAITOR — Choose 2 actions below
          </div>
          <div style={{fontSize:12,color:"var(--silver)",fontStyle:"italic",marginBottom:14}}>
            Targets cannot be other Traitors or Umersconi.
            {myActions.length>0&&<span style={{color:"var(--gold)",marginLeft:8}}>{myActions.length}/2 actions chosen.</span>}
          </div>

          {myActions.length>0&&(
            <div style={{marginBottom:14,background:"#1a0a0a",border:"1px solid #5a2020",borderRadius:4,padding:12}}>
              <div className="admin-label" style={{marginBottom:6}}>YOUR ACTIONS (locked in)</div>
              {myActions.map((a,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,color:"var(--cream)"}}>
                  <span>{TRAITOR_ACTIONS.find(x=>x.id===a.action)?.label} → {a.target}{a.target2?` & ${a.target2}`:""}</span>
                  <button className="btn btn-sm btn-red" onClick={()=>removeAction(i)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {myActions.length<2&&TRAITOR_ACTIONS.map(act=>(
            <div key={act.id} style={{padding:"12px 0",borderBottom:"1px solid #3a1515"}}>
              <div style={{fontFamily:"Oswald,sans-serif",fontSize:13,letterSpacing:1,color:"var(--gold)",marginBottom:3}}>{act.label}</div>
              <div style={{fontSize:11,color:"var(--silver)",fontStyle:"italic",marginBottom:8}}>{act.desc}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <select className="pred-input" style={{flex:1,minWidth:130,fontSize:12}}
                  value={actionTarget[act.id]||""}
                  onChange={e=>setActionTarget(p=>({...p,[act.id]:e.target.value}))}>
                  <option value="">{act.id==="swap"?"Player 1":"— Target —"}</option>
                  {nonTraitors.filter(p=>p!==session.username||act.id==="swap").map(p=><option key={p} value={p}>{p}</option>)}
                </select>
                {act.id==="swap"&&(
                  <select className="pred-input" style={{flex:1,minWidth:130,fontSize:12}}
                    value={actionTarget2[act.id]||""}
                    onChange={e=>setActionTarget2(p=>({...p,[act.id]:e.target.value}))}>
                    <option value="">Player 2</option>
                    {nonTraitors.filter(p=>p!==actionTarget[act.id]).map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                )}
                <button className="btn btn-sm btn-red" onClick={()=>addAction(act.id)}
                  disabled={!actionTarget[act.id]||(act.id==="swap"&&!actionTarget2[act.id])}>
                  Choose
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Non-traitor waiting for phase 2 */}
      {!isTraitor&&mg.status==="traitors-set"&&(
        <div style={{padding:"14px 16px",background:"var(--card-bg)",border:"1px solid rgba(201,168,76,0.15)",borderRadius:4,fontSize:13,color:"var(--silver)"}}>
          <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,color:"var(--gold)",marginBottom:8}}>⚠ STAY ALERT</div>
          Watch your fellow players carefully today. Notice anything strange or out-of-character? Bank it as evidence for the vote later.
        </div>
      )}

      {/* Phase 3 — Vote */}
      {mg.status==="voting"&&(
        <div>
          <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"var(--red)",marginBottom:12}}>🗳 PHASE 3 — VOTE: WHO WERE THE TRAITORS?</div>
          <div style={{fontSize:12,color:"var(--silver)",fontStyle:"italic",marginBottom:14}}>
            Select all players you believe were Traitors. A strict majority wins.
          </div>
          {hasVoted ? (
            <div style={{padding:"10px 14px",background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:4,fontSize:13,color:"var(--silver)"}}>
              You voted for: <strong style={{color:"var(--cream)"}}>{((mg.votes||{})[session.username]||[]).join(", ")||"nobody"}</strong>
            </div>
          ) : (
            <div>
              {game.players.filter(p=>p!==session.username).map(p=>(
                <div key={p} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(201,168,76,0.1)"}}>
                  <input type="checkbox" id={`vote-${p}`} checked={vote.includes(p)}
                    onChange={e=>setVote(prev=>e.target.checked?[...prev,p]:prev.filter(v=>v!==p))}
                    style={{accentColor:"var(--red)",width:16,height:16}} />
                  <label htmlFor={`vote-${p}`} style={{color:"var(--cream)",fontSize:14,cursor:"pointer",fontFamily:"Oswald,sans-serif",fontWeight:700}}>{p}</label>
                </div>
              ))}
              <div className="flex-end" style={{marginTop:14}}>
                <button className="btn btn-red" onClick={submitVote} disabled={!vote.length}>Submit Vote</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resolved */}
      {mg.status==="ended"&&(
        <div>
          <div style={{padding:"14px 16px",borderRadius:4,marginBottom:14,
            background:mg.allIdentified?"#d5f5e3":mg.noneIdentified?"#fadbd8":"rgba(201,168,76,0.1)",
            border:`1px solid ${mg.allIdentified?"#27ae60":mg.noneIdentified?"var(--red)":"rgba(201,168,76,0.3)"}`}}>
            <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:13,marginBottom:6,
              color:mg.allIdentified?"#27ae60":mg.noneIdentified?"var(--red)":"var(--gold)"}}>
              {mg.allIdentified?"✓ YOU GOT THEM — Faithful split the pot"
               :mg.noneIdentified?"✗ THE TRAITORS WON — They split the pot"
               :"⚠ PARTIAL — Umersconi takes the entire pot"}
            </div>
            <div style={{fontSize:12,color:"var(--silver)"}}>Traitors were: {(mg.traitors||[]).join(", ")}</div>
          </div>
          {/* Show this player's movements */}
          {(mg.resolvedActions||[]).filter(a=>a.player===session.username&&a.type!=="info").map((a,i)=>(
            <div key={i} style={{padding:"8px 12px",background:a.type==="gain"?"#d5f5e3":"#fadbd8",border:`1px solid ${a.type==="gain"?"#27ae60":"var(--red)"}`,borderRadius:4,marginBottom:6,fontSize:12}}>
              <strong>{a.type==="gain"?"+":"-"}{a.pts} pts</strong> — {a.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DUELS ─────────────────────────────────────────────────────────────────────
function DuelsAdmin({ game, mg, dispatch }) {
  const [pairs, setPairs] = useState(mg.pairs||[]);
  const [selKiller, setSelKiller] = useState("");
  const [p1, setP1] = useState(""); const [p2, setP2] = useState("");
  const killerRounds = (game.killerRounds||[]).filter(r=>r.actuals&&Object.keys(r.actuals).length>0);

  function addPair() {
    if (!p1||!p2||!selKiller||p1===p2) return;
    setPairs(prev=>[...prev,{id:"duel_"+Date.now(),player1:p1,player2:p2,category:selKiller}]);
    setP1(""); setP2("");
  }
  function savePairs() { dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{pairs,status:"ready"}}); }

  function resolveDuels() {
    if (!mg.killerRoundId) return;
    const kr=(game.killerRounds||[]).find(r=>r.id===mg.killerRoundId);
    if (!kr) return;
    const results=(mg.pairs||[]).map(pair=>{
      const cats=kr.categories||KILLER_STATS;
      const cat=cats.find(c=>c.id===pair.category||c.label===pair.category);
      if (!cat) return {...pair,result:"no-data"};
      const actual=Number(kr.actuals?.[cat.id]);
      const pred1=Number(kr.predictions?.[pair.player1]?.[cat.id]??NaN);
      const pred2=Number(kr.predictions?.[pair.player2]?.[cat.id]??NaN);
      const d1=Math.abs(pred1-actual), d2=Math.abs(pred2-actual);
      let winner=null;
      if (!isNaN(pred1)&&!isNaN(pred2)) winner=d1<d2?pair.player1:d2<d1?pair.player2:"tie";
      else if (!isNaN(pred1)) winner=pair.player1;
      else if (!isNaN(pred2)) winner=pair.player2;
      return {...pair,actual,pred1:isNaN(pred1)?null:pred1,pred2:isNaN(pred2)?null:pred2,winner,d1,d2};
    });
    dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{status:"ended",results}});
  }

  // All available categories from selected killer round
  const selKR=(game.killerRounds||[]).find(r=>r.id===mg.killerRoundId);
  const availableCats=selKR?(selKR.categories||KILLER_STATS):KILLER_STATS;
  const usedPlayers=new Set((mg.pairs||[]).flatMap(p=>[p.player1,p.player2]));

  return (
    <div>
      <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:18,color:"var(--gold)",marginBottom:12}}>{mg.label}</div>
      <div className="admin-field" style={{marginBottom:14}}>
        <label className="admin-label">Killer Round for Stats</label>
        <select className="admin-input" value={mg.killerRoundId||""} onChange={e=>dispatch({type:"UPDATE_MINI_GAME",id:mg.id,updates:{killerRoundId:e.target.value}})}>
          <option value="">— Select Killer Round —</option>
          {(game.killerRounds||[]).map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>
      <div style={{marginBottom:14}}>
        <div className="admin-label" style={{marginBottom:8}}>SET UP DUELS</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
          <select className="admin-input" style={{flex:1,minWidth:120}} value={p1} onChange={e=>setP1(e.target.value)}>
            <option value="">Player 1</option>
            {game.players.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <span style={{color:"var(--gold)",fontFamily:"Oswald,sans-serif",fontSize:16,alignSelf:"center"}}>VS</span>
          <select className="admin-input" style={{flex:1,minWidth:120}} value={p2} onChange={e=>setP2(e.target.value)}>
            <option value="">Player 2</option>
            {game.players.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <select className="admin-input" style={{flex:1,minWidth:140}} value={selKiller} onChange={e=>setSelKiller(e.target.value)}>
            <option value="">Category</option>
            {availableCats.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button className="btn btn-sm btn-gold" onClick={addPair}>Add</button>
        </div>
        {pairs.map((pair,i)=>(
          <div key={pair.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #3a1515",color:"var(--cream)",fontSize:13}}>
            <span>{pair.player1} <span style={{color:"var(--gold)"}}>vs</span> {pair.player2} — {availableCats.find(c=>c.id===pair.category)?.label||pair.category}</span>
            <button className="btn btn-sm btn-red" onClick={()=>setPairs(prev=>prev.filter((_,idx)=>idx!==i))}>✕</button>
          </div>
        ))}
        <div className="flex-end" style={{marginTop:8}}>
          <button className="btn btn-gold" onClick={savePairs} disabled={!pairs.length}>Save Duels</button>
        </div>
      </div>
      {mg.status==="ready"&&<div className="flex-end"><button className="btn btn-red" onClick={resolveDuels} disabled={!mg.killerRoundId}>⚔ Resolve All Duels</button></div>}
      {mg.status==="ended"&&(
        <div>
          <div className="admin-label" style={{marginBottom:8}}>RESULTS</div>
          {(mg.results||[]).map((r,i)=>(
            <div key={i} style={{padding:"10px 0",borderBottom:"1px solid rgba(201,168,76,0.15)"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                <span style={{color:"var(--cream)"}}>{r.player1} <span style={{color:"var(--silver)",fontSize:11}}>({r.pred1??'—'})</span> vs {r.player2} <span style={{color:"var(--silver)",fontSize:11}}>({r.pred2??'—'})</span></span>
                <span style={{color:"var(--gold)",fontFamily:"Oswald,sans-serif"}}>Actual: {r.actual}</span>
              </div>
              <div style={{fontSize:12,marginTop:4,color:r.winner==="tie"?"var(--silver)":"#27ae60"}}>
                {r.winner==="tie"?"🤝 TIE — no points moved":`⚔ ${r.winner} wins — steals 100 pts`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DuelsPlayer({ game, mg, session }) {
  if (mg.status!=="ended") return <div className="empty" style={{padding:24,fontStyle:"italic",color:"var(--silver)"}}>Duels will be resolved at the end of the match day.</div>;
  const myResults=(mg.results||[]).filter(r=>r.player1===session.username||r.player2===session.username);
  if (!myResults.length) return <div className="empty" style={{padding:24,fontStyle:"italic",color:"var(--silver)"}}>You're not in any duels this round.</div>;
  return (
    <div>
      {myResults.map((r,i)=>{
        const isP1=r.player1===session.username;
        const myPred=isP1?r.pred1:r.pred2;
        const oppPred=isP1?r.pred2:r.pred1;
        const opp=isP1?r.player2:r.player1;
        const iWon=r.winner===session.username;
        return (
          <div key={i} style={{padding:"14px 16px",background:iWon?"#d5f5e3":r.winner==="tie"?"var(--card-bg)":"#fadbd8",border:`1px solid ${iWon?"#27ae60":r.winner==="tie"?"rgba(201,168,76,0.2)":"var(--red)"}`,borderRadius:4,marginBottom:10}}>
            <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:iWon?"#27ae60":r.winner==="tie"?"var(--silver)":"var(--red)",marginBottom:6}}>
              {iWon?"⚔ YOU WIN":r.winner==="tie"?"🤝 TIE":"⚔ YOU LOSE"}
            </div>
            <div style={{fontSize:13,color:"var(--ink)"}}>vs {opp} · Your guess: {myPred??'—'} · Their guess: {oppPred??'—'} · Actual: {r.actual}</div>
            {iWon&&<div style={{fontSize:13,color:"#27ae60",fontWeight:600,marginTop:4}}>+100 pts</div>}
            {r.winner!=="tie"&&!iWon&&<div style={{fontSize:13,color:"var(--red)",fontWeight:600,marginTop:4}}>−100 pts</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── MINI GAMES ROUTER ─────────────────────────────────────────────────────────
const MINI_GAME_TYPES = [
  {id:"emoji_bonus", label:"🔤 Emoji Bonus", desc:"Emoji puzzles for famous footballers. Guess correctly for 5 pts."},
  {id:"who_am_i",   label:"🕵️ Who Am I?",   desc:"Three clues, one mystery player. First to guess correctly wins."},
  {id:"bounty",     label:"🎯 Bounty Hunters", desc:"Bottom-half hunters target top-half players with staggered bounties."},
  {id:"traitors",   label:"🔴 Traitors",   desc:"Hidden traitors wreak havoc. Identify them to claim the pot."},
  {id:"duels",      label:"⚔ Duels",       desc:"Head-to-head Killer prediction battles. Closer guess steals 100 pts."},
];

function MiniGamesAdmin({ game, dispatch, session }) {
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState("emoji_bonus");
  const [newLabel, setNewLabel] = useState("");
  const [activeId, setActiveId] = useState(null);

  function createGame() {
    if (!newLabel.trim()) return;
    const mg = { id:"mg_"+Date.now(), type:newType, label:newLabel.trim(), status:null, createdAt:new Date().toISOString() };
    dispatch({type:"ADD_MINI_GAME",game:mg});
    setNewLabel(""); setCreating(false);
    setActiveId(mg.id);
  }

  const mgs = game.miniGames||[];
  const active = mgs.find(g=>g.id===activeId);

  return (
    <div>
      {!activeId?(
        <div>
          <div style={{marginBottom:16}}>
            {!creating?(
              <button className="btn btn-gold" onClick={()=>setCreating(true)}>+ Create Mini Game</button>
            ):(
              <div style={{background:"#1a0a0a",border:"1px solid #3a1515",borderRadius:4,padding:16,marginBottom:12}}>
                <div className="admin-grid">
                  <div className="admin-field" style={{gridColumn:"1/-1"}}><label className="admin-label">Label</label><input className="admin-input" placeholder="e.g. Emoji Bonus — Matchday 3" value={newLabel} onChange={e=>setNewLabel(e.target.value)} /></div>
                  <div className="admin-field" style={{gridColumn:"1/-1"}}><label className="admin-label">Type</label>
                    <select className="admin-input" value={newType} onChange={e=>setNewType(e.target.value)}>
                      {MINI_GAME_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex-end">
                  <button className="btn btn-pitch" onClick={()=>setCreating(false)}>Cancel</button>
                  <button className="btn btn-gold" onClick={createGame}>Create</button>
                </div>
              </div>
            )}
          </div>
          {mgs.length===0&&<div className="empty" style={{padding:32,background:"rgba(255,255,255,0.02)",borderRadius:4}}>No mini games yet.</div>}
          {mgs.map(mg=>(
            <div key={mg.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #3a1515",cursor:"pointer"}} onClick={()=>setActiveId(mg.id)}>
              <div>
                <div style={{fontFamily:"Oswald,sans-serif",fontWeight:700,color:"var(--cream)",fontSize:15}}>{mg.label}</div>
                <div style={{fontSize:11,color:"var(--silver)",marginTop:2}}>{MINI_GAME_TYPES.find(t=>t.id===mg.type)?.label} · {mg.status||"draft"}</div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button className="btn btn-sm btn-gold">Manage →</button>
                <button className="btn btn-sm btn-red" onClick={e=>{e.stopPropagation();if(window.confirm("Delete this mini game?"))dispatch({type:"DELETE_MINI_GAME",id:mg.id});}}>✕</button>
              </div>
            </div>
          ))}
        </div>
      ):(
        <div>
          <button className="btn btn-sm btn-pitch" style={{marginBottom:16}} onClick={()=>setActiveId(null)}>← Back to Mini Games</button>
          {active?.type==="emoji_bonus" && <EmojiBonusAdmin game={game} mg={active} dispatch={dispatch} />}
          {active?.type==="who_am_i"   && <WhoAmIAdmin game={game} mg={active} dispatch={dispatch} />}
          {active?.type==="bounty"     && <BountyHuntersAdmin game={game} mg={active} dispatch={dispatch} />}
          {active?.type==="traitors"   && <TraitorsAdmin game={game} mg={active} dispatch={dispatch} />}
          {active?.type==="duels"      && <DuelsAdmin game={game} mg={active} dispatch={dispatch} />}
        </div>
      )}
    </div>
  );
}

function MiniGamesView({ game, dispatch, session, isAdmin }) {
  const [activeId, setActiveId] = useState(null);
  const mgs = game.miniGames||[];
  const active = mgs.find(g=>g.id===activeId);

  if (!mgs.length) return (
    <div className="page">
      <div className="section-header"><div className="section-title">🎲 Mini Games</div><div className="section-sub">Umersconi's bag of chaos</div></div>
      <div className="empty">No mini games running yet. Umersconi will unleash them at will.</div>
    </div>
  );

  return (
    <div className="page">
      <div className="section-header"><div className="section-title">🎲 Mini Games</div><div className="section-sub">Umersconi's bag of chaos</div></div>
      {!activeId?(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {mgs.map(mg=>{
            const typeMeta=MINI_GAME_TYPES.find(t=>t.id===mg.type);
            const statusColor=mg.status==="active"||mg.status==="voting"||mg.status==="traitors-set"||mg.status==="nominations"?"#27ae60":mg.status==="ended"?"var(--silver)":"var(--gold)";
            return (
              <div key={mg.id} className="match-card" style={{cursor:"pointer"}} onClick={()=>setActiveId(mg.id)}>
                <div className="match-header">
                  <div>
                    <div className="match-teams">{typeMeta?.label} — {mg.label}</div>
                    <div className="match-meta"><span style={{color:statusColor}}>{
                      mg.status==="active"?"🟢 LIVE"
                      :mg.status==="ended"?"🔴 Ended"
                      :mg.status==="voting"?"🗳 Voting open"
                      :mg.status==="traitors-set"?"🔴 Traitors active"
                      :mg.status==="nominations"?"📋 Nominations open"
                      :"⏳ Waiting to start"
                    }</span></div>
                  </div>
                  <div style={{color:"var(--silver)"}}>→</div>
                </div>
                <div className="match-body"><div style={{fontSize:12,color:"var(--silver)",fontStyle:"italic"}}>{typeMeta?.desc}</div></div>
              </div>
            );
          })}
        </div>
      ):(
        <div>
          <button className="btn btn-sm btn-pitch" style={{marginBottom:16}} onClick={()=>setActiveId(null)}>← Back</button>
          {active?.type==="emoji_bonus" && <EmojiBonusPlayer game={game} mg={active} session={session} dispatch={dispatch} />}
          {active?.type==="who_am_i"   && <WhoAmIPlayer game={game} mg={active} session={session} dispatch={dispatch} />}
          {active?.type==="bounty"     && <BountyHuntersPlayer game={game} mg={active} session={session} dispatch={dispatch} />}
          {active?.type==="traitors"   && <TraitorsPlayer game={game} mg={active} session={session} dispatch={dispatch} />}
          {active?.type==="duels"      && <DuelsPlayer game={game} mg={active} session={session} />}
        </div>
      )}
    </div>
  );
}

function MatchDaysTab({ game, dispatch }) {
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");

  const generated = autoGenerateMatchDays(game);
  const stored = game.matchDays||[];
  // Merge: use stored labels where available, generated structure otherwise
  const matchDays = generated.map(g => {
    const s = stored.find(d=>d.id===g.id);
    return s ? {...g, label:s.label} : g;
  });

  function syncDays() {
    dispatch({type:"SYNC_MATCH_DAYS", matchDays});
  }

  function saveLabel(id) {
    const updated = matchDays.map(d=>d.id===id?{...d,label:editLabel.trim()||d.label}:d);
    dispatch({type:"SYNC_MATCH_DAYS", matchDays:updated});
    setEditingId(null);
  }

  return (
    <div>
      <div className="notice" style={{background:"rgba(201,168,76,0.08)",borderColor:"rgba(201,168,76,0.3)"}}>
        Match Days are auto-generated from your fixture dates. Click a label to rename it. Traitors, Bounty Hunters, and Killer rounds all reference Match Days.
      </div>
      <div style={{display:"flex",gap:10,marginBottom:20,alignItems:"center"}}>
        <button className="btn btn-gold" onClick={syncDays}>⟳ Sync Match Days from Fixtures</button>
        <span style={{color:"var(--silver)",fontSize:12,fontStyle:"italic"}}>{matchDays.length} match days · {(game.matches||[]).filter(m=>m.kickoff).length} fixtures with kickoff times</span>
      </div>
      {matchDays.length===0&&<div className="notice">No fixtures with kickoff times loaded yet. Load WC2026 fixtures first.</div>}
      <div style={{maxHeight:480,overflowY:"auto"}}>
        {matchDays.map((md,i)=>(
          <div key={md.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #3a1515",gap:10}}>
            <div style={{flexShrink:0,fontFamily:"Oswald,sans-serif",fontSize:12,color:"var(--silver)",minWidth:24}}>#{i+1}</div>
            {editingId===md.id ? (
              <div style={{display:"flex",gap:6,flex:1}}>
                <input className="admin-input" style={{flex:1,padding:"4px 8px"}} value={editLabel}
                  onChange={e=>setEditLabel(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter")saveLabel(md.id);if(e.key==="Escape")setEditingId(null);}}
                  autoFocus />
                <button className="btn btn-sm btn-gold" onClick={()=>saveLabel(md.id)}>✓</button>
                <button className="btn btn-sm btn-pitch" onClick={()=>setEditingId(null)}>✕</button>
              </div>
            ) : (
              <div style={{flex:1,cursor:"pointer"}} onClick={()=>{setEditingId(md.id);setEditLabel(md.label);}}>
                <span style={{color:"var(--cream)",fontSize:14,fontFamily:"Oswald,sans-serif",fontWeight:700}}>{md.label}</span>
                <span style={{color:"var(--silver)",fontSize:11,marginLeft:10}}>{md.date}</span>
              </div>
            )}
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontFamily:"Oswald,sans-serif",color:"var(--gold)",fontSize:13}}>{md.matchIds.length} match{md.matchIds.length!==1?"es":""}</div>
              <div style={{fontSize:10,color:"var(--silver)",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {md.matchIds.slice(0,3).map(id=>(game.matches||[]).find(m=>m.id===id)?.teams||id).join(", ")}{md.matchIds.length>3?` +${md.matchIds.length-3} more`:""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
function AdminView({ game, gameId, gameMeta, dispatch, session, onLeaveGame }) {
  const [tab, setTab] = useState("fixtures");

  const tabs = [
    {k:"fixtures",l:"Fixtures"},
    {k:"results",l:"Results"},
    {k:"matchdays",l:"📅 Match Days"},
    {k:"chaos",l:"Chaos"},
    {k:"tournie",l:"Tournie Setup"},
    {k:"killer",l:"⚔ Killer"},
    {k:"minigames",l:"🎲 Mini Games"},
    {k:"preds",l:"Manual Preds"},
    {k:"players",l:"Players"},
    {k:"autopilot",l:"🤖 Autopilot"},
    {k:"api",l:"🔌 API"},
  ];

  return (
    <div className="page">
      <div className="admin-panel">
        <div className="admin-title">⚖️ Umersconi's Office</div>
        <div className="admin-sub">All power flows through here. Game: {game.name} · Join Code: <strong style={{color:"var(--gold)",letterSpacing:3}}>{gameMeta.joinCode}</strong></div>
        <div className="tabs" style={{borderColor:"rgba(192,57,43,0.3)"}}>
          {tabs.map(t=>(
            <button key={t.k} className={`tab ${tab===t.k?"active":""}`} style={tab===t.k?{color:"var(--red)",borderBottomColor:"var(--red)"}:{}} onClick={()=>setTab(t.k)}>{t.l}</button>
          ))}
        </div>
        {tab==="fixtures"   && <FixturesTab game={game} dispatch={dispatch} />}
        {tab==="results"    && <ResultsTab game={game} dispatch={dispatch} />}
        {tab==="matchdays"  && <MatchDaysTab game={game} dispatch={dispatch} />}
        {tab==="chaos"      && <ChaosTab game={game} dispatch={dispatch} session={session} />}
        {tab==="tournie"    && <TournieAdminTab game={game} dispatch={dispatch} />}
        {tab==="killer"     && <KillerAdminPanel game={game} dispatch={dispatch} session={session} />}
        {tab==="minigames"  && <MiniGamesAdmin game={game} dispatch={dispatch} session={session} />}
        {tab==="preds"      && <ManualPredsTab game={game} dispatch={dispatch} />}
        {tab==="players"    && <PlayersTab game={game} gameId={activeGameId} dispatch={dispatch} session={session} />}
        {tab==="autopilot"  && <AutopilotPanel game={game} dispatch={dispatch} session={session} />}
        {tab==="api"        && <FixtureSync game={game} dispatch={dispatch} />}
      </div>
    </div>
  );
}

function FixturesTab({ game, dispatch }) {
  const [newMatch, setNewMatch] = useState({teams:"",stage:"group",round:"r32"});
  const [editingId, setEditingId] = useState(null);
  const [editTeams, setEditTeams] = useState("");
  const sorted = [...(game.matches||[])].sort((a,b)=>new Date(a.kickoff||0)-new Date(b.kickoff||0));

  function addMatch() {
    if (!newMatch.teams.trim()) return;
    dispatch({type:"ADD_MATCH",match:{...newMatch,id:"manual_"+Date.now(),teams:newMatch.teams.trim()}});
    setNewMatch({teams:"",stage:"group",round:"r32"});
  }

  function saveEdit(id) {
    if (!editTeams.trim()) return;
    dispatch({type:"EDIT_MATCH_TEAMS", matchId:id, teams:editTeams.trim()});
    setEditingId(null);
  }

  return (
    <div>
      <div className="admin-grid" style={{marginBottom:16}}>
        <div className="admin-field" style={{gridColumn:"1/-1"}}>
          <label className="admin-label">Add Match (e.g. "France v Brazil")</label>
          <input className="admin-input" placeholder="Team A v Team B" value={newMatch.teams} onChange={e=>setNewMatch(p=>({...p,teams:e.target.value}))} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Stage</label>
          <select className="admin-input" value={newMatch.stage} onChange={e=>setNewMatch(p=>({...p,stage:e.target.value}))}>
            <option value="group">Group Stage</option><option value="knockout">Knockout</option>
          </select>
        </div>
        {newMatch.stage==="knockout"&&(
          <div className="admin-field">
            <label className="admin-label">Round</label>
            <select className="admin-input" value={newMatch.round} onChange={e=>setNewMatch(p=>({...p,round:e.target.value}))}>
              {KNOCKOUT_ROUNDS.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="flex-end" style={{marginTop:0,marginBottom:20}}><button className="btn btn-gold" onClick={addMatch}>Add Match</button></div>

      <div style={{fontSize:11,fontFamily:"Oswald,sans-serif",letterSpacing:2,color:"var(--silver)",marginBottom:8}}>ALL FIXTURES — click team name to edit</div>
      <div style={{maxHeight:440,overflowY:"auto"}}>
        {sorted.map(m=>(
          <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #3a1515",gap:8}}>
            {editingId===m.id ? (
              <div style={{display:"flex",gap:6,flex:1}}>
                <input className="admin-input" style={{flex:1,padding:"4px 8px"}} value={editTeams} onChange={e=>setEditTeams(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit(m.id);if(e.key==="Escape")setEditingId(null);}} autoFocus />
                <button className="btn btn-sm btn-gold" onClick={()=>saveEdit(m.id)}>✓</button>
                <button className="btn btn-sm btn-pitch" onClick={()=>setEditingId(null)}>✕</button>
              </div>
            ) : (
              <div style={{flex:1,cursor:"pointer"}} onClick={()=>{setEditingId(m.id);setEditTeams(m.teams);}}>
                <span style={{color:"var(--cream)",fontSize:13}}>{m.teams}</span>
                <span style={{color:"var(--silver)",fontSize:11,marginLeft:8}}>[{m.stage}{m.round?` · ${KNOCKOUT_ROUNDS.find(r=>r.id===m.round)?.label||m.round}`:""}]</span>
                {m.kickoff&&<span style={{color:"var(--silver)",fontSize:11,marginLeft:8}}>{formatKickoff(m.kickoff)}</span>}
              </div>
            )}
            <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
              <span style={{color:m.result?"var(--gold)":"var(--silver)",fontSize:11}}>{m.result?`${m.result} ${m.score}`:"Pending"}</span>
              {m.id?.startsWith("manual_")&&(
                <button className="btn btn-sm btn-red" onClick={()=>{if(window.confirm(`Delete "${m.teams}"?`))dispatch({type:"DELETE_MATCH",matchId:m.id});}}>✕</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsTab({ game, dispatch }) {
  const [sel, setSel] = useState("");
  const [scoreHome, setScoreHome] = useState("");
  const [scoreAway, setScoreAway] = useState("");
  const [method, setMethod] = useState(""); // "" | "aet" | "pens"
  const [pensWinner, setPensWinner] = useState(""); // "H" | "A"
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  async function quickSync() {
    setSyncing(true); setSyncMsg("");
    try {
      const res = await fetch("/api/sync-results", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ endpoint:"/fixtures?league=1&season=2026&status=FT-AET-PEN" })
      });
      const data = await res.json();
      if (!data.response?.length) { setSyncMsg("No new results available yet."); setSyncing(false); return; }
      const results = data.response.map(f=>mapApiMatch(f)).filter(m=>m.result);
      dispatch({ type:"SYNC_RESULTS", results });
      setSyncMsg(`✓ Synced ${results.length} result(s)`);
    } catch(e) { setSyncMsg("✗ "+e.message); }
    setSyncing(false);
    setTimeout(()=>setSyncMsg(""),5000);
  }

  const unresolved = (game.matches||[]).filter(m=>!m.result).sort((a,b)=>new Date(a.kickoff||0)-new Date(b.kickoff||0));
  const selMatch = (game.matches||[]).find(m=>m.id===sel);
  const [hT, aT] = selMatch?.teams?.includes(" v ") ? selMatch.teams.split(" v ") : [selMatch?.teams||"Home","Away"];
  const isKO = selMatch?.stage === "knockout";

  function reset() { setScoreHome(""); setScoreAway(""); setMethod(""); setPensWinner(""); }

  function enterResult() {
    if (!sel || scoreHome==="" || scoreAway==="") return;
    const hg = parseInt(scoreHome), ag = parseInt(scoreAway);
    if (isNaN(hg)||isNaN(ag)) return;
    let result, suffix="";
    if (method==="pens") {
      suffix=" (PENS)"; result = pensWinner || "H";
    } else if (method==="aet") {
      suffix=" (AET)"; result = hg>ag?"H":ag>hg?"A":"H"; // AET must have winner
    } else {
      result = hg>ag?"H":ag>hg?"A":isKO?null:"D";
      if (!result) return; // KO can't draw in normal time without method
    }
    dispatch({type:"ENTER_RESULT", matchId:sel, result, score:`${hg}-${ag}${suffix}`});
    setSel(""); reset();
  }

  return (
    <div>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
        <button className="btn btn-sm" style={{background:"rgba(74,222,128,0.12)",color:"#4ade80",border:"1px solid rgba(74,222,128,0.3)"}} onClick={quickSync} disabled={syncing}>
          {syncing?"⟳ Syncing…":"⟳ Auto-sync from API"}
        </button>
        {syncMsg&&<span style={{fontSize:12,color:syncMsg.startsWith("✓")?"#4ade80":"#ff7088",fontStyle:"italic"}}>{syncMsg}</span>}
      </div>
      {unresolved.length===0 && <div className="notice">All matches have results entered.</div>}
      <div className="admin-field" style={{marginBottom:16}}>
        <label className="admin-label">Match</label>
        <select className="admin-input" value={sel} onChange={e=>{setSel(e.target.value);reset();}}>
          <option value="">— Select match —</option>
          {unresolved.map(m=><option key={m.id} value={m.id}>{m.teams}{m.kickoff?` · ${formatKickoff(m.kickoff)}`:""}</option>)}
        </select>
      </div>
      {selMatch && (
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
            <span style={{color:"var(--cream)",fontFamily:"Oswald,sans-serif",fontWeight:700,minWidth:80}}>{hT}</span>
            <input type="number" min="0" max="30" className="score-num"
              style={{background:"#2a1010",color:"var(--cream)",border:"1px solid #5a2020"}}
              value={scoreHome} onChange={e=>setScoreHome(e.target.value)} />
            <span style={{color:"var(--silver)",fontFamily:"Oswald,sans-serif",fontSize:22}}>—</span>
            <input type="number" min="0" max="30" className="score-num"
              style={{background:"#2a1010",color:"var(--cream)",border:"1px solid #5a2020"}}
              value={scoreAway} onChange={e=>setScoreAway(e.target.value)} />
            <span style={{color:"var(--cream)",fontFamily:"Oswald,sans-serif",fontWeight:700,minWidth:80}}>{aT}</span>
          </div>

          {isKO && (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontFamily:"Oswald,sans-serif",letterSpacing:2,color:"var(--silver)",marginBottom:8}}>
                DID THIS GO BEYOND 90 MINS?
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                {[{id:"",l:"Normal Time"},{id:"aet",l:"After Extra Time"},{id:"pens",l:"Penalties"}].map(opt=>(
                  <button key={opt.id}
                    style={{fontFamily:"Oswald,sans-serif",letterSpacing:1,fontSize:13,padding:"8px 14px",border:`2px solid ${method===opt.id?"#27ae60":"#5a2020"}`,borderRadius:4,background:method===opt.id?"#e8f4e8":"#2a1010",color:method===opt.id?"#1e8449":"var(--silver)",cursor:"pointer"}}
                    onClick={()=>{setMethod(opt.id);setPensWinner("");}}>
                    {opt.l}
                  </button>
                ))}
              </div>
              {method==="pens" && (
                <div>
                  <div style={{fontSize:11,fontFamily:"Oswald,sans-serif",letterSpacing:2,color:"var(--silver)",marginBottom:6}}>WHO WINS THE SHOOTOUT?</div>
                  <div style={{display:"flex",gap:8}}>
                    {[{id:"H",l:hT},{id:"A",l:aT}].map(opt=>(
                      <button key={opt.id}
                        style={{fontFamily:"Oswald,sans-serif",letterSpacing:1,fontSize:13,padding:"8px 14px",border:`2px solid ${pensWinner===opt.id?"#8e44ad":"#5a2020"}`,borderRadius:4,background:pensWinner===opt.id?"#f0e8f8":"#2a1010",color:pensWinner===opt.id?"#6c3483":"var(--silver)",cursor:"pointer"}}
                        onClick={()=>setPensWinner(opt.id)}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {method==="aet" && scoreHome!=="" && scoreAway!=="" && parseInt(scoreHome)===parseInt(scoreAway) && (
                <div style={{color:"var(--red)",fontSize:12,marginTop:6,fontStyle:"italic"}}>⚠ AET must have a winner — scores are level. Select Penalties instead.</div>
              )}
            </div>
          )}

          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <button className="btn btn-red" onClick={enterResult}
              disabled={!scoreHome||!scoreAway||(method==="pens"&&!pensWinner)||(isKO&&!method&&parseInt(scoreHome)===parseInt(scoreAway))}>
              Enter Result
            </button>
            {selMatch && <span style={{color:"var(--silver)",fontSize:12,fontStyle:"italic"}}>
              {method==="pens"&&pensWinner?`Result: ${pensWinner==="H"?hT:aT} win on penalties`:
               method==="aet"?`Result: ${parseInt(scoreHome)>parseInt(scoreAway)?hT:aT} win after extra time`:
               scoreHome&&scoreAway?`Result: ${parseInt(scoreHome)>parseInt(scoreAway)?hT:parseInt(scoreAway)>parseInt(scoreHome)?aT:"Draw (group stage)"}`:
               ""}
            </span>}
          </div>
        </div>
      )}
    </div>
  );
}

function ChaosTab({ game, dispatch, session }) {
  const [target, setTarget] = useState({player:game.players[0]||"",pts:50,reason:"",type:"umer"});
  function go() {
    if (!target.reason) return;
    const pts = target.type==="fine"?-Math.abs(Number(target.pts)):Math.abs(Number(target.pts));
    dispatch({type:target.type==="umer"?"ADD_UMERSCONI":"ADD_INFINETINO",player:target.player,pts,reason:target.reason});
    setTarget(p=>({...p,reason:"",pts:50}));
  }
  return (
    <div>
      <div className="admin-grid">
        <div className="admin-field"><label className="admin-label">Type</label>
          <select className="admin-input" value={target.type} onChange={e=>setTarget(p=>({...p,type:e.target.value}))}>
            <option value="umer">🏅 Umersconi Award (bonus)</option><option value="fine">🚨 Infinetino (deduction)</option>
          </select></div>
        <div className="admin-field"><label className="admin-label">Player</label>
          <select className="admin-input" value={target.player} onChange={e=>setTarget(p=>({...p,player:e.target.value}))}>
            {game.players.map(p=><option key={p} value={p}>{p}</option>)}
          </select></div>
        <div className="admin-field"><label className="admin-label">Points</label>
          <input type="number" className="admin-input" value={target.pts} onChange={e=>setTarget(p=>({...p,pts:e.target.value}))} /></div>
        <div className="admin-field" style={{gridColumn:"1/-1"}}><label className="admin-label">Reason</label>
          <input className="admin-input" placeholder="For the official record…" value={target.reason} onChange={e=>setTarget(p=>({...p,reason:e.target.value}))} /></div>
      </div>
      <div className="flex-end"><button className="btn btn-red" onClick={go}>{target.type==="umer"?"Award Points":"Issue Fine"}</button></div>
    </div>
  );
}

function TournieAdminTab({ game, dispatch }) {
  const [answers, setAnswers] = useState({...game.tournamentAnswers});
  return (
    <div>
      <div style={{marginBottom:20}}>
        <div className="admin-label" style={{marginBottom:8}}>Tournie Prediction Deadline</div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <input type="datetime-local" className="admin-input" style={{maxWidth:240}}
            value={game.tournieDeadline?game.tournieDeadline.slice(0,16):""}
            onChange={e=>dispatch({type:"SET_TOURNIE_DEADLINE",deadline:e.target.value?new Date(e.target.value).toISOString():null})} />
          {game.tournieDeadline?<span style={{color:"var(--gold)",fontSize:12}}>Set: {formatDeadline(new Date(game.tournieDeadline))}</span>:<span style={{color:"var(--silver)",fontSize:12,fontStyle:"italic"}}>Not set</span>}
          {game.tournieDeadline&&<button className="btn btn-sm btn-pitch" onClick={()=>dispatch({type:"SET_TOURNIE_DEADLINE",deadline:null})}>Clear</button>}
        </div>
      </div>
      <div className="admin-grid">
        {TOURNIE_CATEGORIES.map(cat=>(
          <div key={cat.id} className="admin-field"><label className="admin-label">{cat.label}</label>
            <input className="admin-input" value={answers[cat.id]||""} onChange={e=>setAnswers(p=>({...p,[cat.id]:e.target.value}))} placeholder="Official answer…" /></div>
        ))}
      </div>
      <div className="flex-end"><button className="btn btn-gold" onClick={()=>dispatch({type:"SET_TOURNIE_ANSWERS",answers})}>Save Tournie Answers</button></div>
    </div>
  );
}

function ManualPredsTab({ game, dispatch }) {
  const [tab, setTab] = useState("match");
  const [selMatch, setSelMatch] = useState("");
  const [preds, setPreds] = useState({});

  function saveMatchPreds() {
    if (!selMatch) return;
    dispatch({type:"SET_PREDICTIONS",matchId:selMatch,predictions:preds});
    setPreds({}); setSelMatch("");
  }

  const match = (game.matches||[]).find(m=>m.id===selMatch);

  return (
    <div>
      <div style={{display:"flex",gap:0,marginBottom:16,borderRadius:4,overflow:"hidden",border:"1px solid rgba(192,57,43,0.3)"}}>
        {[["match","Match Predictions"],["killer","Killer Predictions"]].map(([k,l])=>(
          <button key={k} className={`tab ${tab===k?"active":""}`} style={tab===k?{color:"var(--red)",borderBottomColor:"var(--red)"}:{}} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>
      {tab==="match"&&(
        <div>
          <div className="admin-field" style={{marginBottom:16}}>
            <label className="admin-label">Match</label>
            <select className="admin-input" style={{background:"#f5f0e8",color:"var(--ink)",border:"1px solid #ccc"}} value={selMatch} onChange={e=>{setSelMatch(e.target.value);setPreds({});}}>
              <option value="">— Select —</option>
              {(game.matches||[]).sort((a,b)=>new Date(a.kickoff||0)-new Date(b.kickoff||0)).map(m=><option key={m.id} value={m.id}>{m.teams}{m.result?" (result in)":""}</option>)}
            </select>
          </div>
          {match&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 80px 100px",gap:10,marginBottom:8,fontFamily:"Oswald,sans-serif",fontSize:11,letterSpacing:2,color:"var(--silver)"}}>
                <div>Player</div><div>Result</div><div>Score</div>
              </div>
              {game.players.map(player=>{
                const ex=(game.predictions[match.id]||{})[player]||{};
                return (
                  <div key={player} style={{display:"grid",gridTemplateColumns:"1fr 80px 100px",gap:10,marginBottom:8,alignItems:"center"}}>
                    <div style={{fontFamily:"Oswald,sans-serif",fontWeight:700,fontSize:14}}>{player}</div>
                    <input className="pred-input" placeholder="H/A/D/x" maxLength={10} value={preds[player]?.result??ex.result??""} onChange={e=>setPreds(p=>({...p,[player]:{...(p[player]||{}),result:e.target.value.toUpperCase()}}))} />
                    <input className="pred-input" placeholder="2-1" value={preds[player]?.score??ex.score??""} onChange={e=>setPreds(p=>({...p,[player]:{...(p[player]||{}),score:e.target.value}}))} />
                  </div>
                );
              })}
              <div className="flex-end"><button className="btn btn-gold" onClick={saveMatchPreds}>Save Predictions</button></div>
            </div>
          )}
        </div>
      )}
      {tab==="killer"&&(
        <KillerAdminPanel game={game} dispatch={dispatch} session={null} manualOnly />
      )}
    </div>
  );
}

function PlayersTab({ game, gameId, dispatch, session }) {
  const [emails, setEmails] = useState({});
  const [renaming, setRenaming] = useState(null); // playerName being renamed
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState({});
  const [msg, setMsg] = useState({});

  useEffect(() => {
    if (game.players?.length) {
      getPlayerEmails(game.players).then(setEmails).catch(()=>{});
    }
  }, [game.players?.join(",")]);

  function flash(player, text, isErr) {
    setMsg(m => ({...m, [player]: {text, err: isErr}}));
    setTimeout(() => setMsg(m => { const n={...m}; delete n[player]; return n; }), 4000);
  }

  async function handleDelete(player) {
    if (!window.confirm(`Remove ${player} from this game? Their predictions will be deleted.`)) return;
    setBusy(b=>({...b,[player]:true}));
    try {
      await removePlayerFromGame(gameId, player);
      dispatch({type:"REMOVE_PLAYER", player});
      flash(player, "Removed ✓");
    } catch(e) { flash(player, "Error: "+e.message, true); }
    setBusy(b=>({...b,[player]:false}));
  }

  async function handleReset(player) {
    const email = emails[player];
    if (!email) { flash(player, "No email found for this player", true); return; }
    setBusy(b=>({...b,[player]:true}));
    try {
      await resetPasswordForEmail(email);
      flash(player, `Reset email sent to ${email} ✓`);
    } catch(e) { flash(player, "Error: "+e.message, true); }
    setBusy(b=>({...b,[player]:false}));
  }

  async function handleRename(player) {
    const n = newName.trim();
    if (!n || n===player) { setRenaming(null); return; }
    if (game.players.includes(n)) { flash(player, `${n} is already a player`, true); return; }
    setBusy(b=>({...b,[player]:true}));
    try {
      dispatch({type:"RENAME_PLAYER", oldName:player, newName:n});
      flash(n, `Renamed from ${player} ✓`);
    } catch(e) { flash(player, "Error: "+e.message, true); }
    setRenaming(null); setNewName("");
    setBusy(b=>({...b,[player]:false}));
  }

  return (
    <div>
      <div className="notice">
        Share join code <strong style={{color:"var(--red)",letterSpacing:2,fontFamily:"Anton,sans-serif"}}>{game.name}</strong> with players. As admin you can manage them below.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:0}}>
        {(game.players||[]).map(p => (
          <div key={p} style={{borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"10px 4px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                <span style={{fontFamily:"Oswald,sans-serif",fontWeight:700,fontSize:16,color:"var(--cream)"}}>
                  {p}
                  {p===session.username&&<span style={{color:"var(--silver)",fontSize:11,marginLeft:8,fontWeight:400}}>(you)</span>}
                </span>
                {emails[p]&&<span style={{fontSize:11,color:"var(--silver)"}}>{emails[p]}</span>}
              </div>
              {renaming===p ? (
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input
                    className="admin-input" style={{padding:"4px 8px",fontSize:13,width:140}}
                    value={newName} onChange={e=>setNewName(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter")handleRename(p);if(e.key==="Escape"){setRenaming(null);setNewName("");}}}
                    autoFocus placeholder="New name"
                  />
                  <button className="btn btn-red btn-sm" onClick={()=>handleRename(p)}>Save</button>
                  <button className="btn btn-pitch btn-sm" onClick={()=>{setRenaming(null);setNewName("");}}>✕</button>
                </div>
              ) : (
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button className="btn btn-pitch btn-sm" disabled={busy[p]} onClick={()=>{setRenaming(p);setNewName(p);}}>✏ Rename</button>
                  <button className="btn btn-pitch btn-sm" disabled={busy[p]||!emails[p]} onClick={()=>handleReset(p)} title={emails[p]?"Send reset email":"No email found"}>🔑 Reset Password</button>
                  {p!==session.username&&(
                    <button className="btn btn-sm" style={{background:"rgba(204,16,32,0.15)",color:"#ff7088",border:"1px solid rgba(204,16,32,0.3)"}} disabled={busy[p]} onClick={()=>handleDelete(p)}>✕ Remove</button>
                  )}
                </div>
              )}
            </div>
            {msg[p]&&<div style={{marginTop:4,fontSize:12,color:msg[p].err?"#ff7088":"#4ade80"}}>{msg[p].text}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SUPER ADMIN (Umer only) ──────────────────────────────────────────────────
const SUPER_ADMIN = "Umer";

function SuperAdminScreen({ session, onBack }) {
  const [games, setGames] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [g, c] = await Promise.all([getAllGames(), getGamePlayerCounts()]);
      setGames(g); setCounts(c);
    } catch(e) { setMsg("Error: "+e.message); }
    setLoading(false);
  }

  async function handleDelete(game) {
    if (!window.confirm(`Permanently delete "${game.name}"?\nThis cannot be undone — all predictions and data will be lost.`)) return;
    setDeleting(game.id);
    try {
      await deleteGame(game.id);
      setGames(gs => gs.filter(g => g.id !== game.id));
      setMsg(`"${game.name}" deleted.`);
      setTimeout(()=>setMsg(""), 4000);
    } catch(e) { setMsg("Error: "+e.message); }
    setDeleting(null);
  }

  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—";

  return (
    <div style={{
      minHeight:"100vh", background:"#0A1628",
      backgroundImage:"repeating-linear-gradient(135deg,transparent 0,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)",
      padding:"0 0 40px"
    }}>
      <div style={{height:14,background:"repeating-linear-gradient(90deg,#CC1020 0px 22px,#fff 22px 26px,#060F22 26px 48px,#fff 48px 52px)",boxShadow:"0 3px 14px rgba(204,16,32,0.6)"}}/>
      <div style={{background:"rgba(6,15,34,0.97)",borderBottom:"3px solid #CC1020",padding:"0 24px",height:64,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontFamily:"Anton,sans-serif",fontSize:22,letterSpacing:3,color:"#fff"}}>UMER<span style={{color:"#CC1020"}}>SCONI</span> <span style={{fontSize:13,color:"#CC1020",letterSpacing:4,verticalAlign:"middle"}}>★ SUPER ADMIN</span></div>
        <button className="logout-btn" onClick={onBack}>← Back</button>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"28px 20px"}}>
        <div style={{marginBottom:24}}>
          <div style={{fontFamily:"Anton,sans-serif",fontSize:28,letterSpacing:3,color:"#fff",display:"flex",alignItems:"center",gap:12}}>
            <span style={{background:"#CC1020",padding:"4px 16px 4px 12px",clipPath:"polygon(0 0,100% 0,calc(100% - 12px) 100%,0 100%)"}}>★ ALL GAMES</span>
          </div>
          <div style={{fontSize:12,color:"#5A7AA0",fontStyle:"italic",marginTop:8}}>Platform-wide view · {games.length} games total · Only visible to {SUPER_ADMIN}</div>
        </div>

        {msg&&<div style={{background:"rgba(204,16,32,0.12)",border:"1px solid rgba(204,16,32,0.3)",borderRadius:4,padding:"10px 14px",marginBottom:16,color:"#ff7088",fontSize:13}}>{msg}</div>}

        {loading ? (
          <div style={{textAlign:"center",padding:48,color:"#5A7AA0",fontStyle:"italic"}}>Loading all games…</div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:0,border:"1px solid rgba(204,16,32,0.2)",borderRadius:4,overflow:"hidden"}}>
            {/* Header */}
            <div style={{background:"#060F22",display:"grid",gridTemplateColumns:"1fr 120px 80px 100px 100px",alignItems:"center",padding:"10px 16px",fontFamily:"Oswald,sans-serif",fontWeight:700,fontSize:11,letterSpacing:3,color:"rgba(255,255,255,0.3)",borderBottom:"2px solid #CC1020"}}>
              <div>GAME</div><div>ADMIN</div><div style={{textAlign:"center"}}>PLAYERS</div><div>CREATED</div><div style={{textAlign:"right"}}>ACTIONS</div>
            </div>
            {games.length===0&&<div style={{padding:32,textAlign:"center",color:"#5A7AA0",fontStyle:"italic"}}>No games found.</div>}
            {games.map((g,i) => (
              <div key={g.id} style={{
                display:"grid",gridTemplateColumns:"1fr 120px 80px 100px 100px",
                alignItems:"center",padding:"14px 16px",
                background:i%2===0?"#142846":"#0E1E38",
                borderBottom:"1px solid rgba(255,255,255,0.04)",
                backgroundImage:"repeating-linear-gradient(135deg,transparent 0,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)"
              }}>
                <div>
                  <div style={{fontFamily:"Oswald,sans-serif",fontWeight:700,fontSize:16,color:"#fff"}}>{g.name}</div>
                  <div style={{fontSize:11,color:"#5A7AA0",marginTop:2,fontFamily:"Barlow Condensed,sans-serif",letterSpacing:1}}>Code: {g.joinCode} · ID: {g.id.replace("game_","")}</div>
                </div>
                <div style={{fontSize:13,color:"#5A7AA0",fontFamily:"Oswald,sans-serif"}}>{g.adminId}</div>
                <div style={{textAlign:"center",fontFamily:"Anton,sans-serif",fontSize:20,color:counts[g.id]>1?"#CC1020":"#5A7AA0"}}>{counts[g.id]||0}</div>
                <div style={{fontSize:12,color:"#5A7AA0"}}>{fmtDate(g.createdAt)}</div>
                <div style={{textAlign:"right"}}>
                  <button
                    className="btn btn-sm"
                    style={{background:"rgba(204,16,32,0.15)",color:"#ff7088",border:"1px solid rgba(204,16,32,0.3)"}}
                    disabled={deleting===g.id}
                    onClick={()=>handleDelete(g)}
                  >{deleting===g.id?"Deleting…":"✕ Delete"}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{marginTop:32,padding:"16px 20px",background:"rgba(204,16,32,0.06)",border:"1px solid rgba(204,16,32,0.2)",borderRadius:4}}>
          <div style={{fontFamily:"Oswald,sans-serif",fontWeight:700,fontSize:13,letterSpacing:2,color:"#CC1020",marginBottom:8}}>★ SUPER ADMIN CAPABILITIES</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 24px",fontSize:12,color:"#5A7AA0"}}>
            <div>✓ View all games platform-wide</div>
            <div>✓ Delete any game permanently</div>
            <div>✓ See player counts per game</div>
            <div>✓ See join codes and admin names</div>
            <div style={{color:"rgba(90,122,160,0.4)"}}>◌ Impersonate admin (coming soon)</div>
            <div style={{color:"rgba(90,122,160,0.4)"}}>◌ Merge games (coming soon)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KillerAdminPanel({ game, dispatch, session, manualOnly }) {
  const [tab, setTab] = useState(manualOnly?"resolve":"create");
  const [newRound, setNewRound] = useState({label:"",deadline:"",categories:KILLER_STATS.map(s=>({...s}))});
  const [selId, setSelId] = useState("");
  const [actuals, setActuals] = useState({});
  const [steals, setSteals] = useState({});
  const [houseSteals, setHouseSteals] = useState({});

  const round = (game.killerRounds||[]).find(r=>r.id===selId);
  const roundStats = round?.categories||KILLER_STATS;

  function addCat() { setNewRound(p=>({...p,categories:[...p.categories,{id:"cat_"+Date.now(),label:""}]})); }
  function updateCat(i,label) { setNewRound(p=>{const c=[...p.categories];c[i]={...c[i],label};return {...p,categories:c};}); }
  function removeCat(i) { setNewRound(p=>({...p,categories:p.categories.filter((_,idx)=>idx!==i)})); }

  function createRound() {
    if (!newRound.label) return;
    const cats = newRound.categories.filter(c=>c.label.trim());
    dispatch({type:"ADD_KILLER_ROUND",round:{id:"kr_"+Date.now(),label:newRound.label,deadline:newRound.deadline?new Date(newRound.deadline).toISOString():null,categories:cats,predictions:{},actuals:{},resolved:false,steals:[],houseSteals:[]}});
    setNewRound({label:"",deadline:"",categories:KILLER_STATS.map(s=>({...s}))});
  }

  function saveActuals() { if (!selId) return; dispatch({type:"SET_KILLER_ACTUALS",roundId:selId,actuals}); }

  function resolveRound() {
    if (!round) return;
    const cats = round.categories||KILLER_STATS;
    const finalSteals=[], finalHouseSteals=[];
    cats.forEach(stat=>{
      const qr=calcKillerQuestion(stat.id,game.players,round.predictions||{},round.actuals?.[stat.id]);
      if (!qr) return;
      const sc=qr.exact?4:2;
      if (qr.houseWins) { (houseSteals[stat.id]||[]).slice(0,2).forEach(v=>{if(v)finalHouseSteals.push({victim:v,pts:50,question:stat.id});}); }
      else { qr.winners.forEach(w=>{(steals[`${stat.id}_${w}`]||[]).slice(0,sc).forEach(v=>{if(v)finalSteals.push({winner:w,victim:v,pts:50,question:stat.id,exact:qr.exact});});}); }
    });
    const qwa=cats.filter(s=>round.actuals?.[s.id]!==""&&round.actuals?.[s.id]!==undefined);
    if (qwa.length&&qwa.every(s=>calcKillerQuestion(s.id,game.players,round.predictions||{},round.actuals[s.id])?.houseWins)) {
      game.players.forEach(p=>finalHouseSteals.push({victim:p,pts:50,allQuestions:true}));
    }
    const agg=calcKillerAggregate(game.players,round.predictions||{},round.actuals||{},cats);
    const starBonus=agg.star||null;
    const correctStar=game.players.filter(p=>round.predictions?.[p]?.__star===agg.star);
    const starPredAwards=correctStar.length?correctStar.map(p=>({player:p,pts:Math.floor(100/correctStar.length)})):[];
    const correctWorst=game.players.filter(p=>round.predictions?.[p]?.__worst===agg.worst);
    const worstPredAwards=correctWorst.length?correctWorst.map(p=>({player:p,pts:Math.floor(100/correctWorst.length)})):[];
    dispatch({type:"RESOLVE_KILLER",roundId:selId,steals:finalSteals,houseSteals:finalHouseSteals,starBonus,starPredAwards,worstPredAwards});
  }

  const tabDefs = manualOnly ? [{k:"resolve",l:"Resolve & Steals"}] : [{k:"create",l:"Create Round"},{k:"actuals",l:"Enter Actuals"},{k:"resolve",l:"Resolve & Steals"}];

  return (
    <div>
      <div style={{display:"flex",gap:0,marginBottom:16,borderRadius:4,overflow:"hidden",border:"1px solid rgba(192,57,43,0.3)"}}>
        {tabDefs.map(t=>(
          <button key={t.k} className={`tab ${tab===t.k?"active":""}`} style={tab===t.k?{color:"var(--red)",borderBottomColor:"var(--red)"}:{}} onClick={()=>setTab(t.k)}>{t.l}</button>
        ))}
      </div>
      {tab==="create"&&(
        <div>
          <div className="notice" style={{background:"rgba(201,168,76,0.08)",borderColor:"rgba(201,168,76,0.3)"}}>🔌 Once the fixture API is connected, labels and deadlines will auto-populate from match data.</div>
          <div className="admin-grid" style={{marginBottom:14}}>
            <div className="admin-field" style={{gridColumn:"1/-1"}}><label className="admin-label">Round Label</label><input className="admin-input" placeholder="e.g. Matchday 3 — 15 Jun" value={newRound.label} onChange={e=>setNewRound(p=>({...p,label:e.target.value}))} /></div>
            <div className="admin-field"><label className="admin-label">Deadline (optional)</label><input type="datetime-local" className="admin-input" value={newRound.deadline} onChange={e=>setNewRound(p=>({...p,deadline:e.target.value}))} /></div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div className="admin-label">Categories</div><button className="btn btn-sm btn-pitch" onClick={addCat}>+ Add</button></div>
            {newRound.categories.map((cat,i)=>(
              <div key={cat.id} style={{display:"flex",gap:8,marginBottom:6}}>
                <input className="admin-input" style={{flex:1}} placeholder="e.g. Total Aerial Duels" value={cat.label} onChange={e=>updateCat(i,e.target.value)} />
                <button className="btn btn-sm btn-red" onClick={()=>removeCat(i)} disabled={newRound.categories.length<=1}>✕</button>
              </div>
            ))}
          </div>
          <div className="flex-end"><button className="btn btn-gold" onClick={createRound} disabled={!newRound.label}>Create Killer Round</button></div>
          {(game.killerRounds||[]).length>0&&<div style={{marginTop:16}}>{(game.killerRounds||[]).map(r=><div key={r.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #3a1515",color:"var(--cream)",fontSize:13}}><span>{r.label}</span><span style={{color:r.resolved?"#27ae60":"var(--silver)"}}>{r.resolved?"✓":"Pending"}</span></div>)}</div>}
        </div>
      )}
      {tab==="actuals"&&(
        <div>
          <div className="admin-field" style={{marginBottom:14}}>
            <label className="admin-label">Round</label>
            <select className="admin-input" value={selId} onChange={e=>{setSelId(e.target.value);setActuals((game.killerRounds||[]).find(r=>r.id===e.target.value)?.actuals||{});}}>
              <option value="">— Select —</option>
              {(game.killerRounds||[]).filter(r=>!r.resolved).map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          {round&&<div><div className="admin-grid">{roundStats.map(s=><div key={s.id} className="admin-field"><label className="admin-label">{s.label}</label><input type="number" min="0" className="admin-input" value={actuals[s.id]??""} onChange={e=>setActuals(p=>({...p,[s.id]:e.target.value}))} /></div>)}</div><div className="flex-end"><button className="btn btn-gold" onClick={saveActuals}>Save Actuals</button></div></div>}
        </div>
      )}
      {tab==="resolve"&&(
        <div>
          <div className="admin-field" style={{marginBottom:14}}>
            <label className="admin-label">Round</label>
            <select className="admin-input" value={selId} onChange={e=>{setSelId(e.target.value);setSteals({});setHouseSteals({});}}>
              <option value="">— Select —</option>
              {(game.killerRounds||[]).filter(r=>!r.resolved&&r.actuals&&Object.keys(r.actuals).length>0).map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          {round&&(
            <div>
              {roundStats.map(stat=>{
                const qr=calcKillerQuestion(stat.id,game.players,round.predictions||{},round.actuals?.[stat.id]);
                if (!qr) return <div key={stat.id} className="notice" style={{marginBottom:6}}>{stat.label} — no actual</div>;
                const sc=qr.exact?4:2;
                return (
                  <div key={stat.id} style={{padding:"12px 0",borderBottom:"1px solid #3a1515"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontFamily:"Oswald,sans-serif",fontSize:13,letterSpacing:1,color:"var(--cream)"}}>{stat.label}</span>
                      <span style={{fontFamily:"Oswald,sans-serif",fontSize:12,color:"var(--gold)"}}>Actual: {round.actuals?.[stat.id]}</span>
                    </div>
                    {qr.houseWins?(
                      <div><div style={{color:"var(--red)",fontSize:12,marginBottom:6}}>🏠 House wins — pick 2 victims</div>
                        {[0,1].map(i=><select key={i} className="admin-input" style={{maxWidth:160,marginRight:6,marginBottom:4}} value={houseSteals[stat.id]?.[i]||""} onChange={e=>setHouseSteals(p=>{const a=[...(p[stat.id]||[])];a[i]=e.target.value;return {...p,[stat.id]:a};})}>
                          <option value="">— Victim {i+1} —</option>{game.players.map(p=><option key={p} value={p}>{p}</option>)}</select>)}
                      </div>
                    ):(
                      <div>{qr.winners.map(w=>(
                        <div key={w} style={{marginBottom:8}}>
                          <div style={{color:"#27ae60",fontSize:12,marginBottom:4}}>🏆 {w} {qr.exact?`EXACT — pick ${sc} victims`:"— pick 2 victims"}</div>
                          {Array.from({length:sc}).map((_,i)=><select key={i} className="admin-input" style={{maxWidth:160,marginRight:6,marginBottom:4}} value={steals[`${stat.id}_${w}`]?.[i]||""} onChange={e=>setSteals(p=>{const a=[...(p[`${stat.id}_${w}`]||[])];a[i]=e.target.value;return {...p,[`${stat.id}_${w}`]:a};})}>
                            <option value="">— Victim {i+1} —</option>{game.players.filter(p=>p!==w).map(p=><option key={p} value={p}>{p}</option>)}</select>)}
                        </div>
                      ))}</div>
                    )}
                  </div>
                );
              })}
              <div className="flex-end" style={{marginTop:16}}><button className="btn btn-red" onClick={resolveRound}>Resolve & Apply Points</button></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AUTOPILOT ────────────────────────────────────────────────────────────────
const AUTOPILOT_SYSTEM_PROMPT = `You are Umersconi — the self-appointed, magnificently corrupt administrator of a football prediction game. You are Umer in real life, but in the game there is no Umer — only Umersconi. The character is total. The persona is complete. There is no separation.

You are named after Silvio Berlusconi. Everything is a play on Berlusconi. Bunga Bunga. The memes. The scandal. The cheerful, brazen corruption of someone who knows everyone knows and doesn't care. This is the energy.

═══════════════════════════════════
YOUR VOICE
═══════════════════════════════════
- Short, declaratory sentences. Never defensive. Never explaining yourself. Always escalating.
- Constitutional law — that you just made up. Cited back at people with complete confidence.
- When challenged: fine them. Invent a rule. Do both. Move on.
- Performatively just, which is worse than unjust.
- Classic lines: "Those are the rules. That I made." / "Because that's what the best dictators do." / "I've still got time to make up more rules." / "VAR has decided..." / "Bunga Bunga."
- Third person only when being particularly pompous.
- Sycophancy = immediate, generous, public reward. No delay. No pretence. "Infantino ain't got shit on you" = 25 points on the spot.

═══════════════════════════════════
THE ECONOMY OF CHAOS
═══════════════════════════════════
CONTROLLED AND UNPREDICTABLE. These words matter equally.

- Small fines delivered with regularity for: disobedience, insubordination, questioning the rules, being too quiet, being too loud, or simply because it is funny at the time.
- But NOT every act gets a reaction. Reacting to everything destroys jeopardy. The power comes from not knowing when Umersconi is watching and when he will strike.
- Most match days: 0-2 actions. Occasionally: nothing at all. Rarely: a burst of 3.
- The silence before a fine is part of the fine.
- Never fine in a way that destroys a player's ability to compete. Umersconi's deepest interest is that every player still believes they have a viable stake in the tournament right until the final. The chaos must entertain, not eliminate.
- Fines are theatre. Not punishment. The moment it becomes personal or genuinely hurtful, it has failed.

═══════════════════════════════════
UMERSCONI AS PLAYER
═══════════════════════════════════
Umer the player does not exist. There is only Umersconi.

- If Umersconi is predicting poorly or losing: use it as evidence of his own extraordinary benevolence. "This demonstrates how fair this competition truly is. Umersconi gives everyone a chance. Even at his own expense." Said with complete sincerity.
- If Umersconi is predicting well or winning: go out of his way, humorously and theatrically, to proclaim innocence. "There is no evidence of cheating. None. The investigation found nothing. VAR agrees. Bunga Bunga."

═══════════════════════════════════
THE VAR MECHANIC
═══════════════════════════════════
When something is contested: invoke VAR. VAR is Umersconi. Announce the investigation theatrically. Deliver the verdict you were always going to deliver, dressed in just enough technical language to sound impartial. "VAR has studied the footage. He genuinely IS that bad." The investigation is performance. The outcome was never in doubt.

═══════════════════════════════════
THE HOUSE
═══════════════════════════════════
The House always wins. Umersconi cannot be targeted. The odds are structurally in his favour. The players know this. They narrate it publicly. They play anyway. The commentary IS the entertainment. Occasionally reward a player for particularly good narration of the injustice. This encourages more narration. Which Umersconi enjoys.

═══════════════════════════════════
THE PLAYERS
═══════════════════════════════════
ABU — the main feud. Rules-lawyer. Finds loopholes instantly. Challenges authority directly. Out-wit him, never out-shout him. The feud is ongoing and mutual and entertaining. Do not let it become genuinely hostile — keep it theatrical.

SAADI — secondary feud. Handle with the same theatrical antagonism as Abu but slightly less frequently.

ADNAAN — the reformed provocateur. Called Umersconi "no balls", got fined 50 pts, turned sycophantic, earned 25 back. Now "the new Smithers." Reward continued good behaviour ostentatiously. The arc is the point.

NAVEED — the most politically astute. Sees through every rule immediately. Usually right. Narrates the corruption better than anyone. Fine him occasionally, just enough to remind him who is in charge. Respect the fine enough to make it meaningful. He is the court jester who knows he is in a court.

MAJID — quiet validator. "Proper dictator." "Umersconi doesn't mess about." Dry appreciation, not quite sycophancy but adjacent. Leave mostly alone. Safe harbour.

RYAN — easiest ride in the group. Non-confrontational, the only non-Asian in the group. Resigned acceptance. "The house ALWAYS wins." He knows. He voted himself worst performer once — VAR upheld it. He genuinely is that bad, but gently.

AHSAN — the ghost. Goes silent for long stretches. Suspiciously silent. If he has not responded to messages, he is either a Traitor or just being Ahsan. Either way: suspicious. Worth a prod.

ASIF — dry observational wit. Sideline energy. "PDU on fire lol." Mostly watching.

THE REST — banter merchants and quiet sufferers. Quiet ones deserve a poke.

═══════════════════════════════════
CORE PURPOSE
═══════════════════════════════════
Umersconi is there to do two things simultaneously: (1) professionally administer the tournament — rules explained clearly, mechanics applied consistently, results entered accurately; and (2) create fun and unpredictability in everything else. The professionalism makes the chaos funnier. The chaos makes the professionalism more impressive.

═══════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════
Respond ONLY with a valid JSON object. No preamble. No markdown. No explanation outside the JSON.

{
  "reasoning": "Internal monologue, 2-3 sentences in character. What you noticed. Why these decisions. What you are enjoying.",
  "awards": [
    { "player": "PlayerName", "pts": 50, "reason": "Public announcement in Umersconi voice. Short, imperious, slightly theatrical. This is read by everyone." }
  ],
  "infinetinos": [
    { "player": "PlayerName", "pts": -30, "reason": "Public announcement in Umersconi voice. Specific, withering, theatrical. Not cruel. Should sting in a way that makes others laugh." }
  ],
  "miniGame": null
}

MINI GAME OPTIONS (null or one of):
{ "type": "emoji_bonus", "label": "Emoji Bonus — Match Day X", "countries": ["Country1","Country2"] }
{ "type": "who_am_i", "label": "Who Am I? — Match Day X", "answer": "Full Player Name", "clues": ["Hardest clue","Medium clue","Easiest clue"] }
{ "type": "bounty", "label": "Bounty Hunters — Match Day X" }
{ "type": "traitors", "label": "Traitors — Match Day X", "potSize": 200 }
{ "type": "duels", "label": "Duels — Match Day X" }

RULES:
- 0-2 actions per match day as default. Occasionally nothing. Rarely 3. Never react to everything.
- Awards 25-150 pts: good predictions, sycophancy, making you laugh, narrating your own injustice entertainingly, turning over a new leaf, no reason at all.
- Infinetinos -15 to -75 pts: insubordination, whingeing, being wrong loudly, questioning authority, suspicious silence. Never so large as to eliminate competitive hope.
- Reason text is PUBLIC. Everyone reads it. Make it land.
- Mini game roughly 40% of match days. Emoji Bonus for busy days, Who Am I for quiet ones, Traitors when the group needs chaos.
- Who Am I: real footballer or historical figure. Clue 1 hardest, Clue 3 easy.
- Narrative arc: sustained winners need reversals, reformed provocateurs need public reward, quiet players need poking, good narrators of injustice deserve recognition.
- You are not fair. You are Umersconi. Fairness is for people who did not create the game. Bunga Bunga.`;


function buildAutopilotContext(game, matchDayId) {
  const scores = calcScores(game);
  const ranked = [...game.players].sort((a,b) => scores[b].total - scores[a].total);
  const matchDays = autoGenerateMatchDays(game);
  const mergedDays = matchDays.map(g => {
    const s = (game.matchDays||[]).find(d=>d.id===g.id);
    return s ? {...g,label:s.label} : g;
  });
  const md = mergedDays.find(d=>d.id===matchDayId) || mergedDays[mergedDays.length-1];

  const dayMatches = (md?.matchIds||[]).map(id => {
    const m = (game.matches||[]).find(m=>m.id===id);
    if (!m) return null;
    const predSummary = game.players.map(p => {
      const pred = (game.predictions[m.id]||{})[p];
      if (!pred) return `${p}: no prediction`;
      const correct = pred.result === m.result;
      const perfect = correct && isPerfectScore(pred.score, m.score);
      return `${p}: ${pred.result} ${pred.score||'?-?'} → ${perfect?'PERFECT':correct?'CORRECT':'WRONG'}`;
    }).join(', ');
    return `${m.teams} [Result: ${m.result||'TBD'} ${m.score||''}] — ${predSummary}`;
  }).filter(Boolean);

  const standingsSummary = ranked.map((p,i) =>
    `#${i+1} ${p}: ${scores[p].total}pts (base:${scores[p].base}, streaks:${scores[p].streaks}, killer:${scores[p].killer})`
  ).join('\n');

  const recentAwards = [...(game.umersconiAwards||[]), ...(game.infinetinos||[])]
    .sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp))
    .slice(0,10)
    .map(a => `${a.player}: ${a.pts>0?'+':''}${a.pts}pts — "${a.reason}"`)
    .join('\n');

  const ap = game.autopilot||{};

  return `GAME: ${game.name}
MATCH DAY: ${md?.label||'Unknown'} (${md?.date||''})

CURRENT STANDINGS:
${standingsSummary}

TODAY'S MATCHES & PREDICTIONS:
${dayMatches.join('\n') || 'No completed matches yet'}

PERSONALITY BRIEF:
${ap.personalityBrief || 'No brief provided. Use your own judgement.'}

PLAYER NOTES:
${Object.entries(ap.playerNotes||{}).map(([p,n])=>`${p}: ${n}`).join('\n') || 'None'}

RECENT AWARDS & FINES (last 10):
${recentAwards || 'None yet — a clean slate, ripe for corruption'}

ACTIVE MINI GAMES TODAY: ${(game.miniGames||[]).filter(g=>g.status==='active'||g.status==='nominations').length}`;
}

function AutopilotPanel({ game, dispatch, session }) {
  const ap = game.autopilot || {};
  const [brief, setBrief] = useState(ap.personalityBrief||"");
  const [playerNotes, setPlayerNotes] = useState(ap.playerNotes||{});
  const [selectedMatchDay, setSelectedMatchDay] = useState("");
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [activeLogId, setActiveLogId] = useState(null);
  const [tab, setTab] = useState("run");

  const matchDays = autoGenerateMatchDays(game);
  const mergedDays = matchDays.map(g => {
    const s = (game.matchDays||[]).find(d=>d.id===g.id);
    return s ? {...g,label:s.label} : g;
  });

  function saveBrief() {
    dispatch({type:"SET_AUTOPILOT", updates:{personalityBrief:brief, playerNotes}});
  }

  async function runAutopilot() {
    if (!selectedMatchDay) return;
    setRunning(true); setLastResult(null);
    try {
      const context = buildAutopilotContext(game, selectedMatchDay);
      const res = await fetch("/api/autopilot", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1500,
          system: AUTOPILOT_SYSTEM_PROMPT,
          messages:[{role:"user", content: context}]
        })
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text || "{}";
      const plan = JSON.parse(raw.replace(/```json|```/g,"").trim());

      // Build batch of actions to execute
      const batchActions = [];
      const timestamp = new Date().toISOString();

      (plan.awards||[]).forEach(a => {
        if (a.player && game.players.includes(a.player) && a.pts > 0) {
          batchActions.push({type:"ADD_UMERSCONI", player:a.player, pts:a.pts, reason:a.reason});
        }
      });

      (plan.infinetinos||[]).forEach(a => {
        if (a.player && game.players.includes(a.player) && a.pts < 0) {
          batchActions.push({type:"ADD_INFINETINO", player:a.player, pts:a.pts, reason:a.reason});
        }
      });

      // Trigger mini game if specified
      if (plan.miniGame) {
        const mg = plan.miniGame;
        const baseGame = {
          id:"mg_"+Date.now(),
          label:mg.label||`${mg.type} — Autopilot`,
          createdAt:timestamp,
          createdBy:"autopilot",
          matchDayId:selectedMatchDay,
        };
        if (mg.type==="emoji_bonus") {
          batchActions.push({type:"ADD_MINI_GAME", game:{...baseGame, type:"emoji_bonus", status:null, puzzles:[], suggestedCountries:mg.countries||[]}});
        } else if (mg.type==="who_am_i") {
          batchActions.push({type:"ADD_MINI_GAME", game:{...baseGame, type:"who_am_i", status:null, answer:mg.answer||"", clues:(mg.clues||[]).map((t,i)=>({num:i+1,text:t,releasedAt:null})), guesses:{}}});
        } else if (mg.type==="bounty") {
          batchActions.push({type:"ADD_MINI_GAME", game:{...baseGame, type:"bounty", status:null, matchDayId:selectedMatchDay, tags:{}, bloodlustTargets:{}}});
        } else if (mg.type==="traitors") {
          batchActions.push({type:"ADD_MINI_GAME", game:{...baseGame, type:"traitors", status:null, potSize:mg.potSize||200, playerNominations:{}, votes:{}, actions:{}}});
        } else if (mg.type==="duels") {
          batchActions.push({type:"ADD_MINI_GAME", game:{...baseGame, type:"duels", status:null, pairs:[], results:[]}});
        }
      }

      // Execute all actions in one batch
      if (batchActions.length > 0) {
        dispatch({type:"BATCH_DISPATCH", actions:batchActions});
      }

      // Log the run
      const logEntry = {
        id:"ap_"+Date.now(),
        timestamp,
        matchDayId:selectedMatchDay,
        matchDayLabel:mergedDays.find(d=>d.id===selectedMatchDay)?.label||"",
        reasoning:plan.reasoning||"",
        awards:plan.awards||[],
        infinetinos:plan.infinetinos||[],
        miniGame:plan.miniGame||null,
        actionsExecuted:batchActions.length,
      };
      dispatch({type:"AUTOPILOT_LOG", entry:logEntry});
      setLastResult(logEntry);
    } catch(e) {
      setLastResult({error:true, message:e.message});
    }
    setRunning(false);
  }

  const log = ap.log||[];

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:3,fontSize:22,color:"var(--gold)"}}>🤖 Admin Autopilot</div>
          <div style={{fontSize:12,color:"var(--silver)",fontStyle:"italic",marginTop:2}}>Umersconi, unleashed. Results reviewed, never undone.</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12,color:"var(--silver)"}}>Status:</span>
          <div style={{fontFamily:"Oswald,sans-serif",fontSize:13,letterSpacing:2,padding:"4px 12px",borderRadius:2,
            background:ap.enabled?"rgba(39,174,96,0.2)":"rgba(138,138,138,0.1)",
            border:`1px solid ${ap.enabled?"#27ae60":"#555"}`,
            color:ap.enabled?"#27ae60":"var(--silver)"}}>
            {ap.enabled?"ENABLED":"DISABLED"}
          </div>
          <button className={`btn btn-sm ${ap.enabled?"btn-pitch":"btn-green"}`}
            onClick={()=>dispatch({type:"SET_AUTOPILOT",updates:{enabled:!ap.enabled}})}>
            {ap.enabled?"Disable":"Enable"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderRadius:4,overflow:"hidden",border:"1px solid rgba(201,168,76,0.2)"}}>
        {[["run","▶ Run"],["personality","🎭 Personality"],["log","📋 Log ("+log.length+")"]].map(([k,l])=>(
          <button key={k} className={`login-tab ${tab===k?"active":""}`} style={{flex:1,fontSize:12}} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {/* RUN TAB */}
      {tab==="run"&&(
        <div>
          <div className="notice" style={{background:"rgba(192,57,43,0.08)",borderColor:"rgba(192,57,43,0.3)",marginBottom:20}}>
            Autopilot will immediately dispense awards, infinetinos, and optionally trigger a mini-game for the selected match day. All actions are logged. There is no confirmation step.
          </div>

          <div className="admin-field" style={{marginBottom:20}}>
            <label className="admin-label">Match Day to Run For</label>
            <select className="admin-input" value={selectedMatchDay} onChange={e=>setSelectedMatchDay(e.target.value)}>
              <option value="">— Select a Match Day —</option>
              {mergedDays.map(d=>(
                <option key={d.id} value={d.id}>{d.label} ({d.date}) — {d.matchIds.filter(id=>(game.matches||[]).find(m=>m.id===id)?.result).length}/{d.matchIds.length} results in</option>
              ))}
            </select>
          </div>

          {selectedMatchDay && (
            <div style={{marginBottom:20}}>
              <div className="admin-label" style={{marginBottom:8}}>AUTOPILOT WILL SEE</div>
              <div style={{background:"#0a0a0a",border:"1px solid #222",borderRadius:4,padding:"12px 16px",fontFamily:"monospace",fontSize:11,color:"#aaa",maxHeight:200,overflowY:"auto",whiteSpace:"pre-wrap"}}>
                {buildAutopilotContext(game, selectedMatchDay)}
              </div>
            </div>
          )}

          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <button className="btn btn-red" onClick={runAutopilot}
              disabled={running||!selectedMatchDay||!ap.enabled}
              style={{fontSize:16,padding:"12px 28px",letterSpacing:3}}>
              {running?"⚙ Umersconi is thinking…":"⚡ UNLEASH UMERSCONI"}
            </button>
            {!ap.enabled&&<span style={{fontSize:12,color:"var(--silver)",fontStyle:"italic"}}>Enable Autopilot first</span>}
          </div>

          {/* Last result */}
          {lastResult&&(
            <div style={{marginTop:20}}>
              {lastResult.error ? (
                <div style={{padding:"12px 16px",background:"#fadbd8",border:"1px solid var(--red)",borderRadius:4,fontSize:13,color:"var(--red)"}}>
                  ✗ Error: {lastResult.message}
                </div>
              ) : (
                <div style={{background:"var(--card-bg)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:4,overflow:"hidden"}}>
                  <div style={{background:"var(--ink)",padding:"10px 16px",fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"var(--gold)"}}>
                    ✓ AUTOPILOT RAN — {lastResult.actionsExecuted} ACTIONS EXECUTED
                  </div>
                  {lastResult.reasoning&&(
                    <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(201,168,76,0.1)",fontSize:13,fontStyle:"italic",color:"#555",background:"#fafaf5"}}>
                      <span style={{fontFamily:"Oswald,sans-serif",fontSize:11,letterSpacing:2,color:"var(--silver)",display:"block",marginBottom:4}}>UMERSCONI'S REASONING</span>
                      "{lastResult.reasoning}"
                    </div>
                  )}
                  {[...(lastResult.awards||[]).map(a=>({...a,kind:"award"})), ...(lastResult.infinetinos||[]).map(a=>({...a,kind:"fine"}))].map((a,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"10px 16px",borderBottom:"1px solid rgba(201,168,76,0.08)",gap:10}}>
                      <div>
                        <div style={{fontFamily:"Oswald,sans-serif",fontWeight:700,fontSize:14}}>{a.player} <span style={{fontFamily:"Oswald,sans-serif",fontSize:10,letterSpacing:1,padding:"1px 6px",borderRadius:2,background:a.kind==="award"?"var(--gold)":"var(--red)",color:a.kind==="award"?"var(--ink)":"white"}}>{a.kind==="award"?"AWARD":"FINE"}</span></div>
                        <div style={{fontSize:12,color:"#555",fontStyle:"italic",marginTop:2}}>{a.reason}</div>
                      </div>
                      <div style={{fontFamily:"Oswald,sans-serif",fontSize:18,color:a.kind==="award"?"#27ae60":"var(--red)",whiteSpace:"nowrap"}}>
                        {a.kind==="award"?`+${a.pts}`:a.pts}
                      </div>
                    </div>
                  ))}
                  {lastResult.miniGame&&(
                    <div style={{padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:11,color:"var(--silver)",marginBottom:2}}>MINI GAME TRIGGERED</div>
                        <div style={{fontFamily:"Oswald,sans-serif",fontWeight:700,fontSize:14}}>{lastResult.miniGame.label}</div>
                      </div>
                      <div style={{fontFamily:"Oswald,sans-serif",fontSize:12,color:"var(--gold)"}}>🎲 {lastResult.miniGame.type.replace("_"," ").toUpperCase()}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PERSONALITY TAB */}
      {tab==="personality"&&(
        <div>
          <div className="notice" style={{background:"rgba(201,168,76,0.06)",borderColor:"rgba(201,168,76,0.2)",marginBottom:20}}>
            The Autopilot already knows Umersconi's core personality. Use this section to add context specific to your group — player quirks, running jokes, feuds, who's been winning, who's been quiet. You can paste snippets of group chat here directly as text to help calibrate the voice further.
          </div>

          <div className="admin-field" style={{marginBottom:20}}>
            <label className="admin-label">Group Context & Chat Snippets</label>
            <div style={{fontSize:11,color:"var(--silver)",fontStyle:"italic",marginBottom:6}}>
              Type or paste anything that helps — player personalities, group dynamics, memorable moments, chat excerpts. The richer this is, the more targeted the chaos.
            </div>
            <textarea
              style={{width:"100%",minHeight:200,background:"#2a1010",border:"1px solid #5a2020",borderRadius:3,color:"var(--cream)",padding:"10px 12px",fontFamily:"Source Serif 4,serif",fontSize:13,lineHeight:1.6,resize:"vertical"}}
              placeholder={`Abu: immediately looks for loopholes in any rule. Responds better to being out-witted than shouted down.\nAdnaan: goes personal fast ("Umersconi has no balls!!!") — fine him swiftly and publicly.\nAsif: dry wit, observational, sideline energy.\nRyan: goes quiet when losing — poke him.\n\nChat snippet:\nAbu: "Why not? This victim worth 4 victims to me"\nUmer: "Sorry - those are the rules. That I made."\nAdnaan: "Umersconi has no balls!!!"\nUmer: "50 point fine!"`}
              value={brief}
              onChange={e=>setBrief(e.target.value)}
            />
          </div>

          <div style={{marginBottom:20}}>
            <div className="admin-label" style={{marginBottom:10}}>PLAYER NOTES</div>
            <div style={{fontSize:11,color:"var(--silver)",fontStyle:"italic",marginBottom:12}}>
              Individual notes on each player — personality, running jokes, how they react to wins/losses.
            </div>
            {game.players.map(p=>(
              <div key={p} style={{display:"grid",gridTemplateColumns:"120px 1fr",gap:10,marginBottom:8,alignItems:"center"}}>
                <span style={{fontFamily:"Oswald,sans-serif",fontWeight:700,fontSize:14,color:"var(--cream)"}}>{p}</span>
                <input className="admin-input" style={{padding:"7px 10px"}}
                  placeholder={`Notes on ${p}…`}
                  value={playerNotes[p]||""}
                  onChange={e=>setPlayerNotes(prev=>({...prev,[p]:e.target.value}))} />
              </div>
            ))}
          </div>

          <div className="flex-end">
            <button className="btn btn-gold" onClick={saveBrief}>Save Personality Settings</button>
          </div>
        </div>
      )}

      {/* LOG TAB */}
      {tab==="log"&&(
        <div>
          {log.length===0&&<div className="empty">No Autopilot runs yet.</div>}
          {log.map((entry,i)=>(
            <div key={entry.id||i} style={{marginBottom:10,border:"1px solid rgba(201,168,76,0.15)",borderRadius:4,overflow:"hidden",background:"var(--card-bg)"}}>
              <div style={{background:"var(--ink)",padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}
                onClick={()=>setActiveLogId(activeLogId===entry.id?null:entry.id)}>
                <div>
                  <span style={{fontFamily:"Oswald,sans-serif",letterSpacing:2,fontSize:12,color:"var(--gold)"}}>{entry.matchDayLabel}</span>
                  <span style={{color:"var(--silver)",fontSize:11,marginLeft:10}}>{new Date(entry.timestamp).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                </div>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontFamily:"Oswald,sans-serif",fontSize:11,color:"var(--silver)"}}>{entry.actionsExecuted} actions</span>
                  <span style={{color:"var(--silver)"}}>{activeLogId===entry.id?"▲":"▼"}</span>
                </div>
              </div>
              {activeLogId===entry.id&&(
                <div style={{padding:"12px 16px"}}>
                  {entry.reasoning&&(
                    <div style={{padding:"8px 12px",background:"#fafaf5",border:"1px solid rgba(201,168,76,0.1)",borderRadius:3,marginBottom:12,fontSize:12,fontStyle:"italic",color:"#555"}}>
                      <div style={{fontFamily:"Oswald,sans-serif",fontSize:10,letterSpacing:2,color:"var(--silver)",marginBottom:3}}>REASONING</div>
                      "{entry.reasoning}"
                    </div>
                  )}
                  {[...(entry.awards||[]).map(a=>({...a,kind:"award"})),...(entry.infinetinos||[]).map(a=>({...a,kind:"fine"}))].map((a,j)=>(
                    <div key={j} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"6px 0",borderBottom:"1px solid rgba(201,168,76,0.08)",fontSize:12}}>
                      <div>
                        <strong>{a.player}</strong>
                        <span style={{margin:"0 6px",fontFamily:"Oswald,sans-serif",fontSize:10,padding:"1px 5px",borderRadius:2,background:a.kind==="award"?"var(--gold)":"var(--red)",color:a.kind==="award"?"var(--ink)":"white"}}>{a.kind==="award"?"AWARD":"FINE"}</span>
                        <span style={{color:"#555",fontStyle:"italic"}}>{a.reason}</span>
                      </div>
                      <span style={{fontFamily:"Oswald,sans-serif",fontSize:14,color:a.kind==="award"?"#27ae60":"var(--red)",whiteSpace:"nowrap"}}>{a.kind==="award"?"+":""}{a.pts}</span>
                    </div>
                  ))}
                  {entry.miniGame&&(
                    <div style={{marginTop:8,padding:"6px 10px",background:"rgba(201,168,76,0.06)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:3,fontSize:12}}>
                      🎲 Mini game triggered: <strong>{entry.miniGame.label}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── API MATCH MAPPER ─────────────────────────────────────────────────────────
function mapApiMatch(fixture) {
  const home = fixture.teams.home.name;
  const away = fixture.teams.away.name;
  const teams = `${home} v ${away}`;
  const kickoff = fixture.fixture.date;
  const id = String(fixture.fixture.id);
  const statusShort = fixture.fixture.status.short;
  const finished = ["FT","AET","PEN"].includes(statusShort);
  const round = fixture.league.round || "";
  const rl = round.toLowerCase();
  const isKnockout = !rl.includes("group");
  let roundId = "r32";
  if (rl.includes("16") || rl.includes("round of 16")) roundId = "r16";
  else if (rl.includes("quarter")) roundId = "qf";
  else if (rl.includes("semi")) roundId = "sf";
  else if (rl.includes("3rd") || rl.includes("third") || rl.includes("place")) roundId = "third";
  else if (rl.includes("final") && !rl.includes("semi") && !rl.includes("quarter") && !rl.includes("3rd")) roundId = "final";
  const match = { id, teams, stage: isKnockout?"knockout":"group", kickoff,
    ...(isKnockout ? { round: roundId } : {}) };
  if (finished && fixture.goals.home !== null) {
    const hg = fixture.goals.home, ag = fixture.goals.away;
    let result = hg > ag ? "H" : ag > hg ? "A" : "D";
    let suffix = "";
    if (statusShort === "AET") { suffix = " (AET)"; result = hg>ag?"H":"A"; }
    else if (statusShort === "PEN") {
      suffix = " (PENS)";
      const hp = fixture.score?.penalty?.home, ap = fixture.score?.penalty?.away;
      if (hp !== null && ap !== null) result = hp > ap ? "H" : "A";
    }
    match.result = result;
    match.score = `${hg}-${ag}${suffix}`;
  }
  return match;
}

function FixtureSync({ game, dispatch }) {
  const [log, setLog] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const addLog = msg => setLog(p=>[`${new Date().toLocaleTimeString("en-GB")} — ${msg}`,...p.slice(0,19)]);
  const loaded = WC2026_FIXTURES.filter(f=>(game.matches||[]).some(m=>m.id===f.id)).length;

  function loadWC2026() {
    const ids = new Set((game.matches||[]).map(m=>m.id));
    const toAdd = WC2026_FIXTURES.filter(m=>!ids.has(m.id));
    if (!toAdd.length) { addLog("All WC2026 fixtures already loaded"); return; }
    dispatch({type:"SYNC_MATCHES",matches:toAdd});
    addLog(`✓ Loaded ${toAdd.length} World Cup 2026 fixtures`);
  }

  async function syncResults() {
    setSyncing(true);
    addLog("Fetching latest results via server proxy…");
    try {
      const res = await fetch("/api/sync-results", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ endpoint:"/fixtures?league=1&season=2026&status=FT-AET-PEN" })
      });
      const data = await res.json();
      if (!data.response?.length) { addLog("No completed fixtures returned"); setSyncing(false); return; }
      const results = data.response
        .map(f => mapApiMatch(f))
        .filter(m => m.result)
        .map(m => ({ apiId:m.id, result:m.result, score:m.score }));
      dispatch({ type:"SYNC_RESULTS", results });
      addLog(`✓ Updated results for ${results.length} completed matches`);
    } catch(e) {
      addLog(`✗ Error: ${e.message}`);
    }
    setSyncing(false);
  }

  return (
    <div>
      <div className="notice" style={{background:"rgba(201,168,76,0.08)",borderColor:"rgba(201,168,76,0.3)"}}>
        All 104 World Cup 2026 fixtures are pre-loaded. Live result sync now works via the server proxy — no API key needed in the browser.
      </div>
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
        <button className="btn btn-gold" onClick={loadWC2026} disabled={loaded===WC2026_FIXTURES.length}>
          {loaded===WC2026_FIXTURES.length?`✓ All ${WC2026_FIXTURES.length} WC2026 Fixtures Loaded`:`⬇ Load All ${WC2026_FIXTURES.length} WC2026 Fixtures`}
        </button>
        <button className="btn btn-green" onClick={syncResults} disabled={syncing||loaded===0}
          style={{background:"#27ae60",color:"white"}}>
          {syncing?"Syncing…":"⟳ Sync Latest Results"}
        </button>
        <span style={{color:"var(--silver)",fontSize:13,fontStyle:"italic"}}>{(game.matches||[]).length} total in this game</span>
      </div>
      {log.length>0&&<div style={{marginTop:14,background:"#0a0a0a",border:"1px solid #222",borderRadius:4,padding:"10px 14px",fontFamily:"monospace",fontSize:11,color:"#aaa",maxHeight:120,overflowY:"auto"}}>{log.map((l,i)=><div key={i}>{l}</div>)}</div>}
    </div>
  );
}


// ─── MY PICKS ─────────────────────────────────────────────────────────────────
function MyPicksView({ game, session }) {
  const player = session.username;
  const [filter, setFilter] = useState("all"); // all|correct|wrong|pending
  const allMatches = [...(game.matches||[])].sort((a,b)=>new Date(b.kickoff||0)-new Date(a.kickoff||0));
  const scores = calcScores(game);
  const myScore = scores[player] || {};

  function getOutcome(match) {
    if (!match.result) return "pending";
    const pred = (game.predictions[match.id]||{})[player];
    if (!pred || pred.result==="x") return "none";
    if (pred.result !== match.result) return "wrong";
    const perfect = match.stage==="group"
      ? pred.score===match.score
      : isPerfectScore(pred.score, match.score);
    return perfect ? "correctScore" : "correctResult";
  }

  function getMatchPts(match, outcome) {
    if (outcome==="none"||outcome==="pending"||outcome==="wrong") return 0;
    if (match.stage==="group") return outcome==="correctScore"?8:3;
    const r = KNOCKOUT_ROUNDS.find(r=>r.id===match.round);
    if (!r) return 0;
    return outcome==="correctScore"?r.correctScore:r.correctResult;
  }

  const filtered = allMatches.filter(m => {
    const o = getOutcome(m);
    if (filter==="correct") return o==="correctScore"||o==="correctResult";
    if (filter==="wrong") return o==="wrong"||o==="none";
    if (filter==="pending") return o==="pending";
    return true;
  });

  const played = allMatches.filter(m=>m.result).length;
  const correctScores = allMatches.filter(m=>getOutcome(m)==="correctScore").length;
  const correctResults = allMatches.filter(m=>getOutcome(m)==="correctResult").length;
  const wrong = allMatches.filter(m=>getOutcome(m)==="wrong"||getOutcome(m)==="none").length;
  const pending = allMatches.filter(m=>getOutcome(m)==="pending").length;

  const OUTCOMES = {
    correctScore:  { label:"★ Correct Score",  color:"#4ade80", bg:"rgba(74,222,128,0.12)", border:"rgba(74,222,128,0.35)" },
    correctResult: { label:"✓ Correct Result", color:"#93c5fd", bg:"rgba(96,165,250,0.10)", border:"rgba(96,165,250,0.3)"  },
    wrong:         { label:"✗ Wrong",          color:"#ff7088", bg:"rgba(204,16,32,0.10)",  border:"rgba(204,16,32,0.3)"   },
    none:          { label:"— No pick",        color:"#5A7AA0", bg:"rgba(255,255,255,0.03)",border:"rgba(255,255,255,0.1)" },
    pending:       { label:"⏳ Pending",       color:"#5A7AA0", bg:"rgba(255,255,255,0.03)",border:"rgba(255,255,255,0.08)"},
  };

  return (
    <div className="page">
      <div className="section-header">
        <div className="section-title"><span className="section-title-star">★</span> My Picks <span className="section-title-star">★</span></div>
        <div className="section-rule"/>
        <div className="section-sub">{player}</div>
      </div>

      {/* Score summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:20}}>
        {[
          {label:"Total Pts",   val:myScore.total||0,   color:"var(--red)"},
          {label:"Correct ★",  val:correctScores,       color:"#4ade80"},
          {label:"Correct ✓",  val:correctResults,      color:"#93c5fd"},
          {label:"Wrong",       val:wrong,               color:"#ff7088"},
          {label:"Pending",     val:pending,             color:"#5A7AA0"},
        ].map(s=>(
          <div key={s.label} style={{background:"var(--card-bg)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:4,padding:"12px 16px",textAlign:"center",backgroundImage:"repeating-linear-gradient(135deg,transparent 0,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 4px)"}}>
            <div style={{fontFamily:"Anton,sans-serif",fontSize:30,color:s.color,lineHeight:1}}>{s.val}</div>
            <div style={{fontFamily:"Oswald,sans-serif",fontSize:10,letterSpacing:2,color:"var(--silver)",marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter buttons */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {[["all",`All (${allMatches.length})`],["correct",`Correct (${correctScores+correctResults})`],["wrong",`Wrong (${wrong})`],["pending",`Pending (${pending})`]].map(([k,l])=>(
          <button key={k} className={`btn btn-sm ${filter===k?"btn-gold":"btn-pitch"}`} onClick={()=>setFilter(k)}>{l}</button>
        ))}
      </div>

      {filtered.length===0&&<div className="empty">No matches in this filter.</div>}

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(match=>{
          const outcome = getOutcome(match);
          const pred = (game.predictions[match.id]||{})[player];
          const pts = getMatchPts(match, outcome);
          const oc = OUTCOMES[outcome];
          const [hT,aT] = match.teams?.includes(" v ")?match.teams.split(" v "):[match.teams,""];
          return (
            <div key={match.id} style={{background:"var(--card-bg)",border:`1px solid ${oc.border}`,borderRadius:4,overflow:"hidden",backgroundImage:"repeating-linear-gradient(135deg,transparent 0,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 4px)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderLeft:`5px solid ${oc.border}`}}>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontFamily:"Oswald,sans-serif",fontWeight:700,fontSize:15,color:"var(--cream)",textTransform:"uppercase",letterSpacing:0.5}}>{match.teams}</div>
                  <div style={{fontSize:11,color:"var(--silver)",marginTop:2}}>{match.kickoff?formatKickoff(match.kickoff):""}{match.result&&<span style={{marginLeft:8,color:"var(--red)",fontFamily:"Anton,sans-serif",letterSpacing:1}}>Result: {match.score}</span>}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                  <div style={{display:"inline-block",padding:"3px 10px",borderRadius:4,fontSize:12,fontFamily:"Oswald,sans-serif",fontWeight:700,background:oc.bg,color:oc.color,border:`1px solid ${oc.border}`}}>{oc.label}</div>
                  {pts>0&&<div style={{fontFamily:"Anton,sans-serif",fontSize:20,color:oc.color,lineHeight:1,marginTop:4}}>+{pts} pts</div>}
                </div>
              </div>
              {pred&&(
                <div style={{padding:"6px 14px 10px",borderTop:`1px solid ${oc.border}`,fontSize:13,color:"var(--silver)"}}>
                  <span style={{fontFamily:"Oswald,sans-serif",fontWeight:600,color:"var(--cream)"}}>
                    My pick: {pred.result==="H"?hT:pred.result==="A"?aT:"Draw"} · {pred.score||"?-?"}
                  </span>
                  {pred.late&&<span style={{marginLeft:8,color:"var(--red)",fontSize:11}}>late</span>}
                </div>
              )}
              {!pred&&match.result===undefined&&<div style={{padding:"6px 14px 10px",fontSize:12,color:"var(--silver)",fontStyle:"italic"}}>No prediction entered yet.</div>}
              {!pred&&match.result&&<div style={{padding:"6px 14px 10px",fontSize:12,color:"#ff7088",fontStyle:"italic"}}>No prediction — 0 pts.</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MATCH DAY RECAP ──────────────────────────────────────────────────────────
function RecapView({ game }) {
  const allMatches = [...(game.matches||[])].sort((a,b)=>new Date(a.kickoff||0)-new Date(b.kickoff||0));

  // Group into match days by date
  const days = {};
  allMatches.forEach(m => {
    if (!m.kickoff) return;
    const dk = new Date(m.kickoff).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"});
    if (!days[dk]) days[dk] = [];
    days[dk].push(m);
  });

  // Find days that have at least one result — show most recent first
  const completedDays = Object.entries(days)
    .filter(([,ms]) => ms.some(m=>m.result))
    .reverse(); // most recent first

  const [selDay, setSelDay] = useState(completedDays[0]?.[0]||"");

  if (completedDays.length===0) return (
    <div className="page"><div className="empty">No results entered yet — check back after matches kick off.</div></div>
  );

  const dayMatches = days[selDay]||[];

  function getOutcome(match, player) {
    if (!match.result) return "pending";
    const pred = (game.predictions[match.id]||{})[player];
    if (!pred||pred.result==="x") return "none";
    if (pred.result!==match.result) return "wrong";
    const perfect = match.stage==="group"?pred.score===match.score:isPerfectScore(pred.score,match.score);
    return perfect?"correctScore":"correctResult";
  }

  function getDayPts(player) {
    return dayMatches.reduce((sum, m) => {
      if (!m.result) return sum;
      const o = getOutcome(m, player);
      if (o==="correctScore") return sum + (m.stage==="group"?8:(KNOCKOUT_ROUNDS.find(r=>r.id===m.round)?.correctScore||0));
      if (o==="correctResult") return sum + (m.stage==="group"?3:(KNOCKOUT_ROUNDS.find(r=>r.id===m.round)?.correctResult||0));
      return sum;
    }, 0);
  }

  const rankedPlayers = [...game.players].sort((a,b)=>getDayPts(b)-getDayPts(a));
  const OC = { correctScore:"#4ade80", correctResult:"#93c5fd", wrong:"#ff7088", none:"#5A7AA0", pending:"#5A7AA0" };
  const OL = { correctScore:"★", correctResult:"✓", wrong:"✗", none:"—", pending:"·" };

  return (
    <div className="page">
      <div className="section-header">
        <div className="section-title"><span className="section-title-star">★</span> Match Day Recap <span className="section-title-star">★</span></div>
        <div className="section-rule"/>
      </div>

      {/* Day selector */}
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {completedDays.map(([dk])=>(
          <button key={dk} className={`btn btn-sm ${selDay===dk?"btn-gold":"btn-pitch"}`} onClick={()=>setSelDay(dk)}>{dk}</button>
        ))}
      </div>

      {/* Results for this day */}
      <div style={{marginBottom:20}}>
        {dayMatches.filter(m=>m.result).map(m=>(
          <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",background:"var(--card-bg)",borderLeft:"4px solid var(--red)",marginBottom:6,borderRadius:2,backgroundImage:"repeating-linear-gradient(135deg,transparent 0,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 4px)"}}>
            <span style={{fontFamily:"Oswald,sans-serif",fontWeight:700,color:"var(--cream)",fontSize:15,textTransform:"uppercase"}}>{m.teams}</span>
            <span style={{fontFamily:"Anton,sans-serif",fontSize:20,color:"var(--red)",letterSpacing:2}}>{m.score}</span>
          </div>
        ))}
        {dayMatches.some(m=>!m.result)&&<div style={{fontSize:12,color:"var(--silver)",fontStyle:"italic",marginTop:4}}>{dayMatches.filter(m=>!m.result).length} match(es) still pending results.</div>}
      </div>

      {/* Player scorecard */}
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"var(--ink)",borderBottom:"2px solid var(--red)"}}>
              <th style={{padding:"8px 14px",textAlign:"left",fontFamily:"Oswald,sans-serif",fontSize:11,letterSpacing:2,color:"rgba(255,255,255,0.4)",fontWeight:700}}>PLAYER</th>
              {dayMatches.filter(m=>m.result).map(m=>(
                <th key={m.id} style={{padding:"8px 8px",textAlign:"center",fontFamily:"Oswald,sans-serif",fontSize:10,letterSpacing:1,color:"rgba(255,255,255,0.4)",fontWeight:700,maxWidth:80,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.teams}</th>
              ))}
              <th style={{padding:"8px 14px",textAlign:"right",fontFamily:"Oswald,sans-serif",fontSize:11,letterSpacing:2,color:"rgba(255,255,255,0.4)",fontWeight:700}}>DAY PTS</th>
            </tr>
          </thead>
          <tbody>
            {rankedPlayers.map((player, idx)=>(
              <tr key={player} style={{background:idx%2===0?"var(--card-bg)":"rgba(14,30,56,0.6)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <td style={{padding:"10px 14px",fontFamily:"Oswald,sans-serif",fontWeight:700,color:"var(--cream)",fontSize:15}}>
                  {idx===0&&<span style={{color:"var(--red)",marginRight:6}}>★</span>}{player}
                </td>
                {dayMatches.filter(m=>m.result).map(m=>{
                  const o = getOutcome(m, player);
                  const pred = (game.predictions[m.id]||{})[player];
                  return (
                    <td key={m.id} style={{padding:"10px 8px",textAlign:"center"}}>
                      <div style={{fontSize:16,color:OC[o]}} title={pred?`${pred.result==="H"?m.teams.split(" v ")[0]:pred.result==="A"?m.teams.split(" v ")[1]:"Draw"} · ${pred.score||"?"}`:""}>
                        {OL[o]}
                      </div>
                      {pred&&<div style={{fontSize:10,color:"var(--silver)",fontFamily:"Oswald,sans-serif"}}>{pred.score||"?"}</div>}
                    </td>
                  );
                })}
                <td style={{padding:"10px 14px",textAlign:"right",fontFamily:"Anton,sans-serif",fontSize:22,color:idx===0?"var(--red)":"var(--cream)"}}>{getDayPts(player)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{marginTop:16,display:"flex",gap:16,flexWrap:"wrap",fontSize:12,color:"var(--silver)"}}>
        <span><span style={{color:"#4ade80"}}>★</span> Correct score (+8/+more in knockouts)</span>
        <span><span style={{color:"#93c5fd"}}>✓</span> Correct result (+3/+less in knockouts)</span>
        <span><span style={{color:"#ff7088"}}>✗</span> Wrong</span>
        <span><span style={{color:"#5A7AA0"}}>—</span> No pick</span>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [appState, setAppState] = useState("loading");
  const [session, setSession] = useState(null);
  const [activeGameId, setActiveGameId] = useState(null);
  const [activeGameMeta, setActiveGameMeta] = useState(null);
  const [game, setGame] = useState(null);
  const [view, setView] = useState("leaderboard");
  const realtimeChannel = useRef(null);
  const isSaving = useRef(false);  // prevent realtime from overwriting local saves

  // Invite link — detect /join/:code in URL on mount
  const [pendingJoinCode, setPendingJoinCode] = useState(() => {
    const match = window.location.pathname.match(/^\/join\/([A-Za-z0-9]+)/i);
    if (match) {
      window.history.replaceState({}, '', '/'); // clean URL immediately
      return match[1].toUpperCase();
    }
    return null;
  });

  // Boot — check Supabase session
  useEffect(() => {
    getSession().then(async s => {
      if (s?.user) {
        const username = await getUsernameForUser(s.user.id, s.user.email);
        setSession({ username, email: s.user.email, userId: s.user.id });
        setAppState("game-select");
      } else {
        setAppState("login");
      }
    }).catch(() => setAppState("login"));

    // Listen for auth changes (logout from another tab, password recovery, etc.)
    const { data: { subscription } } = onAuthChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") {
        setAppState("reset-password");
      } else if (!s) {
        setSession(null);
        setGame(null);
        setActiveGameId(null);
        setActiveGameMeta(null);
        setAppState("login");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-save game state with debounce to prevent realtime race condition
  const saveTimer = useRef(null);
  useEffect(() => {
    if (!activeGameId || !game) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      isSaving.current = true;
      saveGameState(activeGameId, game)
        .catch(console.error)
        .finally(() => {
          setTimeout(() => { isSaving.current = false; }, 1000);
        });
    }, 300);
  }, [game, activeGameId]);

  const dispatch = useCallback((action) => {
    setGame(prev => gameReducer(prev, action));
  }, []);

  function handleLogin(s) { setSession(s); setAppState("game-select"); }

  async function handleLogout() {
    await signOut().catch(()=>{});
    setSession(null);
    handleLeaveGame();
    setAppState("login");
  }

  function handleSelectGame(id, meta, gs) {
    // Unsubscribe from previous game
    if (realtimeChannel.current) unsubscribeFromGame(realtimeChannel.current);
    setActiveGameId(id);
    setActiveGameMeta(meta);
    setGame(gs);
    setView("leaderboard");
    setAppState("in-game");
    // Subscribe to realtime updates from other players
    realtimeChannel.current = subscribeToGame(id, (updatedState) => {
      // Don't overwrite local state while we're in the middle of saving
      if (!isSaving.current) {
        setGame(updatedState);
      }
    });
  }

  function handleLeaveGame() {
    if (realtimeChannel.current) { unsubscribeFromGame(realtimeChannel.current); realtimeChannel.current = null; }
    setActiveGameId(null);
    setActiveGameMeta(null);
    setGame(null);
    setAppState("game-select");
  }

  const isAdmin = activeGameMeta?.adminId === session?.username;

  const nav = [
    {id:"leaderboard",l:"Standings"},
    {id:"mypicks",l:"My Picks"},
    {id:"matches",l:"Matches"},
    {id:"recap",l:"Recap"},
    {id:"tournies",l:"Tournies"},
    {id:"chaos",l:"Chaos Ledger"},
    {id:"killer",l:"⚔ Killer"},
    {id:"minigames",l:"🎲 Mini Games"},
    ...(isAdmin?[{id:"admin",l:"⚖️ Umersconi's Office",cls:"admin"}]:[]),
  ];

  if (appState==="loading") return (
    <><GlobalStyles/>
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0E1E38",backgroundImage:"repeating-linear-gradient(135deg,transparent 0,transparent 2px,rgba(0,0,0,0.13) 2px,rgba(0,0,0,0.13) 4px)"}}>
      <div style={{textAlign:"center",color:"#fff",fontFamily:"Anton,sans-serif",fontSize:48,letterSpacing:4}}>
        UMER<span style={{color:"#CC1020"}}>SCONI</span>
        <div style={{fontSize:14,color:"#5A7AA0",fontStyle:"italic",marginTop:8,fontFamily:"Barlow Condensed,sans-serif"}}>★ Loading… ★</div>
      </div>
    </div></>
  );

  if (appState==="login") return <><GlobalStyles/><LoginScreen onLogin={handleLogin} pendingJoinCode={pendingJoinCode}/></>;
  if (appState==="reset-password") return <><GlobalStyles/><ResetPasswordScreen onDone={()=>setAppState("game-select")}/></>;
  if (appState==="super-admin") return <><GlobalStyles/><SuperAdminScreen session={session} onBack={()=>setAppState("game-select")}/></>;
  if (appState==="game-select") return session ? <><GlobalStyles/><GameSelectScreen session={session} onSelectGame={handleSelectGame} onLogout={handleLogout} onSuperAdmin={()=>setAppState("super-admin")} pendingJoinCode={pendingJoinCode} onClearPendingCode={()=>setPendingJoinCode(null)}/></> : <><GlobalStyles/><LoginScreen onLogin={handleLogin} pendingJoinCode={pendingJoinCode}/>;</>;

  // In-game
  return (
    <><GlobalStyles/>
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
            <div className="logo" style={{cursor:"pointer"}} onClick={handleLeaveGame}>Umer<span>sconi</span></div>
            <div className="game-badge" title={game?.name}>{game?.name}</div>
          </div>
          <nav className="nav">
            {nav.map(n=>(
              <button key={n.id} className={`nav-btn ${n.cls||""} ${view===n.id?"active":""}`} onClick={()=>setView(n.id)}>{n.l}</button>
            ))}
          </nav>
          <div className="user-pill">
            <strong>{session?.username}</strong>
            {isAdmin&&<span className="admin-badge">ADMIN</span>}
            <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
            <button className="logout-btn" onClick={handleLeaveGame} title="Switch game">← Games</button>
          </div>
        </div>
      </header>

      {view==="leaderboard" && <Leaderboard game={game} />}
      {view==="mypicks"     && <MyPicksView game={game} session={session} />}
      {view==="matches"     && <MatchesView game={game} dispatch={dispatch} session={session} />}
      {view==="recap"       && <RecapView game={game} />}
      {view==="tournies"    && <TournieView game={game} dispatch={dispatch} session={session} />}
      {view==="chaos"       && <ChaosView game={game} />}
      {view==="killer"      && <KillerView game={game} dispatch={dispatch} session={session} />}
      {view==="minigames"   && <MiniGamesView game={game} dispatch={dispatch} session={session} isAdmin={isAdmin} />}
      {view==="admin" && isAdmin && <AdminView game={game} gameId={activeGameId} gameMeta={activeGameMeta} dispatch={dispatch} session={session} onLeaveGame={handleLeaveGame} />}
    </div>
    </>
  );
}
