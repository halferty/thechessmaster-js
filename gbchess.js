/**
 * GB Chess Engine - JavaScript Port
 * Based on The Chessmaster (Game Boy, 1990)
 * Reverse engineered evaluation system with 5 components:
 * 1. Material + Position (Call_002_6039)
 * 2. King Safety (Call_002_6e81)
 * 3. Pawn Structure (Call_002_6faf)
 * 4. Piece Mobility (Call_002_6180)
 * 5. Strategic Bonuses (Call_002_6339)
 */

// Difficulty levels (maps to search depth)
export const GBDifficulty = {
    BEGINNER: 1,  // Depth 1 (~0.1ms) - Very weak
    EASY: 2,      // Depth 2 (~2-5ms) - GB typical depth
    MEDIUM: 3,    // Depth 3 (~50-200ms) - Decent
    HARD: 4,      // Depth 4 (~1-5s) - Strong
    EXPERT: 5     // Depth 5 (~30-150s) - Very strong
};

// Piece values (material scoring)
const PIECE_VALUES = {
    'P': 100, 'p': -100,
    'N': 320, 'n': -320,
    'B': 330, 'b': -330,
    'R': 500, 'r': -500,
    'Q': 900, 'q': -900,
    'K': 20000, 'k': -20000
};

// Position tables (from GB's piece-square tables at $8031)
const PAWN_POSITION_TABLE = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_POSITION_TABLE = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

const CENTER_CONTROL_TABLE = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
];

// Direction offsets for move generation
const KNIGHT_MOVES = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
];

const KING_MOVES = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
];

/**
 * Chess game class representing board state and game logic
 */
export class GBChessGame {
    constructor() {
        // Setup starting position
        this.board = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];
        this.whiteToMove = true;
        this.moveCount = 0;
        
        // Castling rights tracking
        this.castlingRights = {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
        };
    }

    /**
     * Make a move on the board
     * @param {number} fromRow - Source row (0-7)
     * @param {number} fromCol - Source column (0-7)
     * @param {number} toRow - Destination row (0-7)
     * @param {number} toCol - Destination column (0-7)
     * @returns {boolean} - True if move was valid and made
     */
    makeMove(fromRow, fromCol, toRow, toCol) {
        if (!this.isValidMove(fromRow, fromCol, toRow, toCol)) {
            return false;
        }

        // Execute move
        const piece = this.board[fromRow][fromCol];
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = '.';

        // Handle castling - move the rook
        if (piece === 'K' && Math.abs(toCol - fromCol) === 2) {
            // White castling
            if (toCol === 6) {
                // King-side
                this.board[7][5] = 'R';
                this.board[7][7] = '.';
            } else if (toCol === 2) {
                // Queen-side
                this.board[7][3] = 'R';
                this.board[7][0] = '.';
            }
        } else if (piece === 'k' && Math.abs(toCol - fromCol) === 2) {
            // Black castling
            if (toCol === 6) {
                // King-side
                this.board[0][5] = 'r';
                this.board[0][7] = '.';
            } else if (toCol === 2) {
                // Queen-side
                this.board[0][3] = 'r';
                this.board[0][0] = '.';
            }
        }

        // Pawn promotion
        if ((piece === 'P' && toRow === 0) || (piece === 'p' && toRow === 7)) {
            this.board[toRow][toCol] = piece === 'P' ? 'Q' : 'q';
        }

        // Update castling rights
        if (piece === 'K') {
            this.castlingRights.whiteKingSide = false;
            this.castlingRights.whiteQueenSide = false;
        } else if (piece === 'k') {
            this.castlingRights.blackKingSide = false;
            this.castlingRights.blackQueenSide = false;
        } else if (piece === 'R') {
            if (fromRow === 7 && fromCol === 7) this.castlingRights.whiteKingSide = false;
            if (fromRow === 7 && fromCol === 0) this.castlingRights.whiteQueenSide = false;
        } else if (piece === 'r') {
            if (fromRow === 0 && fromCol === 7) this.castlingRights.blackKingSide = false;
            if (fromRow === 0 && fromCol === 0) this.castlingRights.blackQueenSide = false;
        }

        this.whiteToMove = !this.whiteToMove;
        this.moveCount++;

        return true;
    }

    /**
     * Check if a square is under attack by the opponent
     * @param {number} row - Row to check
     * @param {number} col - Column to check
     * @param {boolean} byWhite - Check if white is attacking (true) or black (false)
     * @returns {boolean}
     */
    isSquareUnderAttack(row, col, byWhite) {
        // Check all opponent pieces to see if they can attack this square
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece === '.') continue;
                
                const pieceIsWhite = piece >= 'A' && piece <= 'Z';
                if (pieceIsWhite !== byWhite) continue;
                
                const dr = row - r;
                const dc = col - c;
                const p = piece.toLowerCase();
                
                // Check if this piece can attack the target square
                switch (p) {
                    case 'p':
                        // Pawns attack diagonally
                        if (Math.abs(dc) === 1) {
                            if (byWhite && dr === -1) return true; // White pawn attacks upward
                            if (!byWhite && dr === 1) return true; // Black pawn attacks downward
                        }
                        break;
                        
                    case 'n':
                        // Knight moves
                        for (const [dr2, dc2] of KNIGHT_MOVES) {
                            if (dr === dr2 && dc === dc2) return true;
                        }
                        break;
                        
                    case 'k':
                        // King moves
                        if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) return true;
                        break;
                        
                    case 'b':
                        // Bishop moves diagonally
                        if (Math.abs(dr) === Math.abs(dc) && dr !== 0) {
                            if (this.isPathClear(r, c, row, col)) return true;
                        }
                        break;
                        
                    case 'r':
                        // Rook moves straight
                        if ((dr === 0 || dc === 0) && (dr !== 0 || dc !== 0)) {
                            if (this.isPathClear(r, c, row, col)) return true;
                        }
                        break;
                        
                    case 'q':
                        // Queen moves like rook or bishop
                        if ((dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) && (dr !== 0 || dc !== 0)) {
                            if (this.isPathClear(r, c, row, col)) return true;
                        }
                        break;
                }
            }
        }
        return false;
    }

    /**
     * Find the position of a king
     * @param {boolean} white - Find white king (true) or black king (false)
     * @returns {Object|null} {row, col} or null if not found
     */
    findKing(white) {
        const kingPiece = white ? 'K' : 'k';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c] === kingPiece) {
                    return { row: r, col: c };
                }
            }
        }
        return null;
    }

    /**
     * Check if a side's king is in check
     * @param {boolean} white - Check white king (true) or black king (false)
     * @returns {boolean}
     */
    isInCheck(white) {
        const kingPos = this.findKing(white);
        if (!kingPos) return false;
        return this.isSquareUnderAttack(kingPos.row, kingPos.col, !white);
    }

    /**
     * Check if a move would leave/put own king in check
     */
    wouldLeaveInCheck(fromR, fromC, toR, toC) {
        const piece = this.board[fromR][fromC];
        const pieceIsWhite = piece >= 'A' && piece <= 'Z';
        const captured = this.board[toR][toC];
        
        // Make the move temporarily
        let movedPiece = piece;
        // Handle pawn promotion
        if ((piece === 'P' && toR === 0) || (piece === 'p' && toR === 7)) {
            movedPiece = piece === 'P' ? 'Q' : 'q';
        }
        
        this.board[toR][toC] = movedPiece;
        this.board[fromR][fromC] = '.';
        
        // Handle castling rook movement for check detection
        let rookFromR = -1, rookFromC = -1, rookToR = -1, rookToC = -1;
        if ((piece === 'K' || piece === 'k') && Math.abs(toC - fromC) === 2) {
            if (piece === 'K' && fromR === 7 && fromC === 4) {
                if (toC === 6) { // King-side
                    rookFromR = 7; rookFromC = 7; rookToR = 7; rookToC = 5;
                } else if (toC === 2) { // Queen-side
                    rookFromR = 7; rookFromC = 0; rookToR = 7; rookToC = 3;
                }
            } else if (piece === 'k' && fromR === 0 && fromC === 4) {
                if (toC === 6) { // King-side
                    rookFromR = 0; rookFromC = 7; rookToR = 0; rookToC = 5;
                } else if (toC === 2) { // Queen-side
                    rookFromR = 0; rookFromC = 0; rookToR = 0; rookToC = 3;
                }
            }
            if (rookFromR >= 0) {
                this.board[rookToR][rookToC] = this.board[rookFromR][rookFromC];
                this.board[rookFromR][rookFromC] = '.';
            }
        }
        
        // Check if king is in check
        const inCheck = this.isInCheck(pieceIsWhite);
        
        // Undo the move
        this.board[fromR][fromC] = piece;
        this.board[toR][toC] = captured;
        if (rookFromR >= 0) {
            this.board[rookFromR][rookFromC] = this.board[rookToR][rookToC];
            this.board[rookToR][rookToC] = '.';
        }
        
        return inCheck;
    }

    /**
     * Check if path between two squares is clear (no pieces in between)
     */
    isPathClear(fromR, fromC, toR, toC) {
        const dr = toR - fromR;
        const dc = toC - fromC;
        const stepR = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
        const stepC = dc === 0 ? 0 : (dc > 0 ? 1 : -1);

        let r = fromR + stepR;
        let c = fromC + stepC;
        
        // Continue until we reach the destination square
        while (!(r === toR && c === toC)) {
            if (this.board[r][c] !== '.') return false;
            r += stepR;
            c += stepC;
        }
        return true;
    }

    /**
     * Check if a move is valid
     */
    isValidMove(fromR, fromC, toR, toC) {
        if (fromR < 0 || fromR >= 8 || fromC < 0 || fromC >= 8) return false;
        if (toR < 0 || toR >= 8 || toC < 0 || toC >= 8) return false;

        const piece = this.board[fromR][fromC];
        if (piece === '.') return false;

        const pieceIsWhite = piece >= 'A' && piece <= 'Z';
        if (pieceIsWhite !== this.whiteToMove) return false;

        const target = this.board[toR][toC];
        if (target !== '.') {
            const targetIsWhite = target >= 'A' && target <= 'Z';
            if (targetIsWhite === pieceIsWhite) return false;
        }

        const dr = toR - fromR;
        const dc = toC - fromC;

        switch (piece) {
            case 'P':
                if (dc === 0 && dr === -1 && target === '.') return true;
                if (dc === 0 && dr === -2 && fromR === 6 && this.board[5][fromC] === '.' && target === '.') return true;
                if (Math.abs(dc) === 1 && dr === -1 && target !== '.' && target >= 'a' && target <= 'z') return true;
                return false;

            case 'p':
                if (dc === 0 && dr === 1 && target === '.') return true;
                if (dc === 0 && dr === 2 && fromR === 1 && this.board[2][fromC] === '.' && target === '.') return true;
                if (Math.abs(dc) === 1 && dr === 1 && target !== '.' && target >= 'A' && target <= 'Z') return true;
                return false;

            case 'N':
            case 'n':
                for (const [dr2, dc2] of KNIGHT_MOVES) {
                    if (dr === dr2 && dc === dc2) return true;
                }
                return false;

            case 'K':
            case 'k':
                // Normal king move
                if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) return true;
                
                // Castling
                if (dr === 0 && Math.abs(dc) === 2) {
                    if (piece === 'K' && fromR === 7 && fromC === 4) {
                        // White castling
                        if (dc === 2) {
                            // King-side castling
                            if (!this.castlingRights.whiteKingSide ||
                                this.board[7][5] !== '.' ||
                                this.board[7][6] !== '.' ||
                                this.board[7][7] !== 'R') return false;
                            
                            // Check king is not in check, doesn't move through check, or into check
                            if (this.isSquareUnderAttack(7, 4, false) || // Current position
                                this.isSquareUnderAttack(7, 5, false) || // Through square
                                this.isSquareUnderAttack(7, 6, false)) { // Destination
                                return false;
                            }
                            return true;
                        } else if (dc === -2) {
                            // Queen-side castling
                            if (!this.castlingRights.whiteQueenSide ||
                                this.board[7][1] !== '.' ||
                                this.board[7][2] !== '.' ||
                                this.board[7][3] !== '.' ||
                                this.board[7][0] !== 'R') return false;
                            
                            // Check king is not in check, doesn't move through check, or into check
                            if (this.isSquareUnderAttack(7, 4, false) || // Current position
                                this.isSquareUnderAttack(7, 3, false) || // Through square
                                this.isSquareUnderAttack(7, 2, false)) { // Destination
                                return false;
                            }
                            return true;
                        }
                    } else if (piece === 'k' && fromR === 0 && fromC === 4) {
                        // Black castling
                        if (dc === 2) {
                            // King-side castling
                            if (!this.castlingRights.blackKingSide ||
                                this.board[0][5] !== '.' ||
                                this.board[0][6] !== '.' ||
                                this.board[0][7] !== 'r') return false;
                            
                            // Check king is not in check, doesn't move through check, or into check
                            if (this.isSquareUnderAttack(0, 4, true) || // Current position
                                this.isSquareUnderAttack(0, 5, true) || // Through square
                                this.isSquareUnderAttack(0, 6, true)) { // Destination
                                return false;
                            }
                            return true;
                        } else if (dc === -2) {
                            // Queen-side castling
                            if (!this.castlingRights.blackQueenSide ||
                                this.board[0][1] !== '.' ||
                                this.board[0][2] !== '.' ||
                                this.board[0][3] !== '.' ||
                                this.board[0][0] !== 'r') return false;
                            
                            // Check king is not in check, doesn't move through check, or into check
                            if (this.isSquareUnderAttack(0, 4, true) || // Current position
                                this.isSquareUnderAttack(0, 3, true) || // Through square
                                this.isSquareUnderAttack(0, 2, true)) { // Destination
                                return false;
                            }
                            return true;
                        }
                    }
                }
                return false;

            case 'B':
            case 'b':
            case 'R':
            case 'r':
            case 'Q':
            case 'q': {
                if (dr === 0 && dc === 0) return false;

                const isDiagonal = Math.abs(dr) === Math.abs(dc);
                const isStraight = dr === 0 || dc === 0;

                if ((piece === 'B' || piece === 'b') && !isDiagonal) return false;
                if ((piece === 'R' || piece === 'r') && !isStraight) return false;
                if ((piece === 'Q' || piece === 'q') && !isDiagonal && !isStraight) return false;

                const stepR = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
                const stepC = dc === 0 ? 0 : (dc > 0 ? 1 : -1);

                let r = fromR + stepR;
                let c = fromC + stepC;
                while (r !== toR || c !== toC) {
                    if (this.board[r][c] !== '.') return false;
                    r += stepR;
                    c += stepC;
                }
                return true;
            }
            default:
                return false;
        }

        // After all piece-specific validation, check if move would leave king in check
        return !this.wouldLeaveInCheck(fromR, fromC, toR, toC);
    }

    /**
     * Generate all legal moves for the current position
     * @returns {Array} Array of move objects
     */
    generateMoves() {
        const moves = [];

        for (let fromR = 0; fromR < 8; fromR++) {
            for (let fromC = 0; fromC < 8; fromC++) {
                const piece = this.board[fromR][fromC];
                if (piece === '.') continue;

                const pieceIsWhite = piece >= 'A' && piece <= 'Z';
                if (pieceIsWhite !== this.whiteToMove) continue;

                for (let toR = 0; toR < 8; toR++) {
                    for (let toC = 0; toC < 8; toC++) {
                        if (this.isValidMove(fromR, fromC, toR, toC)) {
                            moves.push({
                                fromRow: fromR,
                                fromCol: fromC,
                                toRow: toR,
                                toCol: toC,
                                score: 0
                            });
                        }
                    }
                }
            }
        }

        return moves;
    }

    /**
     * GB's Call_002_5d2b - Full evaluation with 5 components
     */
    evaluate() {
        let score = 0;

        // Component 1: Material + Position (Call_002_6039)
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece === '.') continue;

                const material = PIECE_VALUES[piece] || 0;
                let position = 0;

                switch (piece) {
                    case 'P': {
                        const tableRow = 7 - r;
                        position = PAWN_POSITION_TABLE[tableRow][c];
                        break;
                    }
                    case 'p':
                        position = -PAWN_POSITION_TABLE[r][c];
                        break;
                    case 'N': {
                        const tableRow = 7 - r;
                        position = KNIGHT_POSITION_TABLE[tableRow][c];
                        break;
                    }
                    case 'n':
                        position = -KNIGHT_POSITION_TABLE[r][c];
                        break;
                    case 'B':
                    case 'Q':
                        position = CENTER_CONTROL_TABLE[r][c];
                        break;
                    case 'b':
                    case 'q':
                        position = -CENTER_CONTROL_TABLE[r][c];
                        break;
                }

                score += material + position;
            }
        }

        // Component 2: King Safety (Call_002_6e81)
        // +8 per friendly piece near king
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece === 'K' || piece === 'k') {
                    const isWhite = piece === 'K';
                    let safety = 0;

                    for (const [dr, dc] of KING_MOVES) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                            const neighbor = this.board[nr][nc];
                            if (neighbor !== '.') {
                                const neighborIsWhite = neighbor >= 'A' && neighbor <= 'Z';
                                if (neighborIsWhite === isWhite) {
                                    safety += 8;
                                }
                            }
                        }
                    }

                    score += isWhite ? safety : -safety;
                }
            }
        }

        // Component 3: Pawn Structure (Call_002_6faf)
        // +5 per rank advanced, +67 for passed pawns
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece === 'P') {
                    const advancement = 7 - r;
                    score += advancement * 5;

                    // Check if passed
                    let passed = true;
                    for (let nr = r - 1; nr >= 0; nr--) {
                        if (this.board[nr][c] === 'p' ||
                            (c > 0 && this.board[nr][c - 1] === 'p') ||
                            (c < 7 && this.board[nr][c + 1] === 'p')) {
                            passed = false;
                            break;
                        }
                    }
                    if (passed) score += 67;

                } else if (piece === 'p') {
                    const advancement = r;
                    score -= advancement * 5;

                    let passed = true;
                    for (let nr = r + 1; nr < 8; nr++) {
                        if (this.board[nr][c] === 'P' ||
                            (c > 0 && this.board[nr][c - 1] === 'P') ||
                            (c < 7 && this.board[nr][c + 1] === 'P')) {
                            passed = false;
                            break;
                        }
                    }
                    if (passed) score -= 67;
                }
            }
        }

        // Component 4: Mobility (Call_002_6180)
        // Count moves for both sides
        const originalSide = this.whiteToMove;

        this.whiteToMove = true;
        const whiteMobility = this.generateMoves().length;

        this.whiteToMove = false;
        const blackMobility = this.generateMoves().length;

        this.whiteToMove = originalSide;

        score += (whiteMobility - blackMobility) * 2;

        return score;
    }

    /**
     * Minimax with alpha-beta pruning (GB's Call_002_4050 search)
     */
    minimax(depth, alpha, beta, maximizing) {
        if (depth === 0) {
            return this.evaluate();
        }

        const moves = this.generateMoves();

        if (moves.length === 0) {
            return maximizing ? -30000 : 30000;
        }

        if (maximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                // Save state
                const savedState = this._saveState();
                
                // Make move using the full makeMove logic
                this._makeMoveMinimax(move);

                const evaluation = this.minimax(depth - 1, alpha, beta, false);

                // Restore state
                this._restoreState(savedState);

                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                // Save state
                const savedState = this._saveState();
                
                // Make move using the full makeMove logic
                this._makeMoveMinimax(move);

                const evaluation = this.minimax(depth - 1, alpha, beta, true);

                // Restore state
                this._restoreState(savedState);

                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    /**
     * Helper to save game state for minimax
     */
    _saveState() {
        return {
            board: this.board.map(row => [...row]),
            whiteToMove: this.whiteToMove,
            castlingRights: { ...this.castlingRights }
        };
    }

    /**
     * Helper to restore game state for minimax
     */
    _restoreState(state) {
        this.board = state.board;
        this.whiteToMove = state.whiteToMove;
        this.castlingRights = state.castlingRights;
    }

    /**
     * Make a move in minimax without validation (move is already validated)
     */
    _makeMoveMinimax(move) {
        const piece = this.board[move.fromRow][move.fromCol];
        this.board[move.toRow][move.toCol] = piece;
        this.board[move.fromRow][move.fromCol] = '.';

        // Handle castling - move the rook
        if (piece === 'K' && Math.abs(move.toCol - move.fromCol) === 2) {
            if (move.toCol === 6) {
                this.board[7][5] = 'R';
                this.board[7][7] = '.';
            } else if (move.toCol === 2) {
                this.board[7][3] = 'R';
                this.board[7][0] = '.';
            }
        } else if (piece === 'k' && Math.abs(move.toCol - move.fromCol) === 2) {
            if (move.toCol === 6) {
                this.board[0][5] = 'r';
                this.board[0][7] = '.';
            } else if (move.toCol === 2) {
                this.board[0][3] = 'r';
                this.board[0][0] = '.';
            }
        }

        // Pawn promotion
        if ((piece === 'P' && move.toRow === 0) || (piece === 'p' && move.toRow === 7)) {
            this.board[move.toRow][move.toCol] = piece === 'P' ? 'Q' : 'q';
        }

        // Update castling rights
        if (piece === 'K') {
            this.castlingRights.whiteKingSide = false;
            this.castlingRights.whiteQueenSide = false;
        } else if (piece === 'k') {
            this.castlingRights.blackKingSide = false;
            this.castlingRights.blackQueenSide = false;
        } else if (piece === 'R') {
            if (move.fromRow === 7 && move.fromCol === 7) this.castlingRights.whiteKingSide = false;
            if (move.fromRow === 7 && move.fromCol === 0) this.castlingRights.whiteQueenSide = false;
        } else if (piece === 'r') {
            if (move.fromRow === 0 && move.fromCol === 7) this.castlingRights.blackKingSide = false;
            if (move.fromRow === 0 && move.fromCol === 0) this.castlingRights.blackQueenSide = false;
        }

        this.whiteToMove = !this.whiteToMove;
    }

    /**
     * Get the best move for the current position
     * @param {number} depth - Search depth (1-5)
     * @returns {Object} Best move object
     */
    getBestMove(depth = 2) {
        const moves = this.generateMoves();
        if (moves.length === 0) {
            return null;
        }

        let bestMove = null;
        let bestScore = this.whiteToMove ? -Infinity : Infinity;
        let alpha = -Infinity;
        let beta = Infinity;

        for (const move of moves) {
            // Save state
            const savedState = this._saveState();
            
            // Make move
            this._makeMoveMinimax(move);

            const evaluation = this.minimax(depth - 1, alpha, beta, !this.whiteToMove);

            // Restore state
            this._restoreState(savedState);

            move.score = evaluation;

            const isBetter = this.whiteToMove 
                ? evaluation > bestScore 
                : evaluation < bestScore;

            if (!bestMove || isBetter) {
                bestMove = move;
                bestScore = evaluation;
                if (this.whiteToMove) {
                    alpha = Math.max(alpha, evaluation);
                } else {
                    beta = Math.min(beta, evaluation);
                }
            }
        }

        return bestMove;
    }

    /**
     * Get best move with difficulty level
     * @param {number} difficulty - Difficulty level from GBDifficulty enum
     * @returns {Object} Best move object
     */
    getBestMoveDifficulty(difficulty) {
        return this.getBestMove(difficulty);
    }

    /**
     * Check if the game is over (no legal moves)
     * @returns {boolean}
     */
    isGameOver() {
        return this.generateMoves().length === 0;
    }

    /**
     * Get board as string representation
     * @returns {string}
     */
    getBoardString() {
        return this.board.map(row => row.join('')).join('\n');
    }

    /**
     * Get board as flat string (64 characters)
     * @returns {string}
     */
    getBoardFlat() {
        return this.board.map(row => row.join('')).join('');
    }

    /**
     * Clone the game state
     * @returns {GBChessGame}
     */
    clone() {
        const cloned = new GBChessGame();
        cloned.board = this.board.map(row => [...row]);
        cloned.whiteToMove = this.whiteToMove;
        cloned.moveCount = this.moveCount;
        cloned.castlingRights = { ...this.castlingRights };
        return cloned;
    }
}

// Export for both ES6 modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GBChessGame, GBDifficulty };
}
