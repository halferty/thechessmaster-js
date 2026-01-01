# Thechessmaster.js

## About

This is a reverse-engineered implementation of the chess engine from The Chessmaster (Game Boy, 1990). The original Game Boy assembly was disassembled, analyzed, and reimplemented first in C, then ported to JavaScript for the web.

### Features

- **Authentic 1990 AI**: Same evaluation logic as the original Game Boy game
- **5-Component Evaluation System**:
  1. Material + Position (piece-square tables)
  2. King Safety (pieces near king)
  3. Pawn Structure (advancement + passed pawns)
  4. Piece Mobility (legal move count)
  5. Strategic Bonuses (center control)
- **Minimax Search**: Alpha-beta pruned search (1-5 ply depth)
- **5 Difficulty Levels**: Beginner to Expert
- **Pure JavaScript**: No dependencies, runs in any modern browser

## 🚀 Quick Start

### Play Now

[![Play Online](https://img.shields.io/badge/Play-Online-blue)](https://halferty.github.io/thechessmaster-js/)

### Use as Library

```javascript
import { GBChessGame, GBDifficulty } from './gbchess.js';

// Create a new game
const game = new GBChessGame();

// Make a move (e2 to e4)
game.makeMove(6, 4, 4, 4);

// Get AI move
const aiMove = game.getBestMove(GBDifficulty.MEDIUM);
game.makeMove(aiMove.fromRow, aiMove.fromCol, aiMove.toRow, aiMove.toCol);

// Evaluate position
console.log('Score:', game.evaluate());
```

## API Reference

### GBChessGame

- `new GBChessGame()` - Create new game
- `makeMove(fromRow, fromCol, toRow, toCol)` - Make a move
- `getBestMove(depth)` - Get AI move
- `evaluate()` - Evaluate position
- `generateMoves()` - Get all legal moves
- `isGameOver()` - Check if game ended
- `clone()` - Deep copy game state

### GBDifficulty

```javascript
GBDifficulty.BEGINNER  // 1
GBDifficulty.EASY      // 2
GBDifficulty.MEDIUM    // 3
GBDifficulty.HARD      // 4
GBDifficulty.EXPERT    // 5
```

Note that unlike the original GameBoy game, which used execution time on a deterministic CPU (Z80 @ 1 MIPS), this engine uses search depth (ply) to control difficulty.

## 📜 License

Educational and research purposes. Original game © Ubisoft.
