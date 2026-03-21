# ZeroLango — MVP Specification

## Overview

A single-page web app: a timed matching game between Roman letters (romaji/English) and Japanese characters (hiragana, katakana, kanji). Uses localStorage for user management and progress. No server required, but structured for future SQLite migration.

---

## User Management

- Register with username only (no password)
- Usernames are unique per device, stored in localStorage
- Users can delete their profile
- App remembers the last active user across sessions

---

## Game Modes

| Setting | Options |
|---------|---------|
| **Script** | Mixed (all three), Hiragana only, Katakana only, Kanji only |
| **Direction** | Roman → Japanese, Japanese → Roman, Both (random per question) |
| **Duration** | 60s, 90s, 120s |

---

## Matching Logic

- **Kana:** matched by romaji reading (e.g. か → "ka")
- **Kanji:** matched by primary English meaning (e.g. 山 → "mountain")
- Each question presents 1 prompt + 4 multiple-choice options (1 correct, 3 random distractors from the same script)
- No skip button

---

## Scoring & Feedback

- **+10 points** per correct answer
- No penalty for wrong answers
- Stats tracked: correct count, wrong count, accuracy %, best streak
- **Correct answer:** green flash → 10ms delay → next question
- **Wrong answer:** red flash + correct answer revealed → brief pause → next question
- Streak counter displayed (no score multiplier)

---

## Post-Round Summary

- Score, correct count, wrong count, accuracy %, best streak
- List of missed items with correct answers shown

---

## Stored Data

> Stored in localStorage; schema designed for future SQLite migration.

| Field | Description |
|-------|-------------|
| `username` | User's chosen name |
| `totalGamesPlayed` | Lifetime game count |
| `bestScore` | Best score per duration per script |
| `missedItems` | Last 20 missed items |

---

## Controls

- **Mouse / Touch:** click option buttons
- **Keyboard:** `1`, `2`, `3`, `4` to select options

---

## Content Sets

| Script | Count |
|--------|-------|
| Hiragana | 46 basic characters + dakuten/handakuten variants |
| Katakana | 46 basic characters + dakuten/handakuten variants |
| Kanji | 50 basic kanji |
