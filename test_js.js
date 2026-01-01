/**
 * Test suite for GB Chess Engine JavaScript port
 */

import { GBChessGame, GBDifficulty } from './gbchess.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error('Test failed: ' + message);
    }
}

function testNewGame() {
    console.log('Testing: New game initialization...');
    const game = new GBChessGame();
    
    assert(game.whiteToMove === true, 'White should move first');
    assert(game.moveCount === 0, 'Move count should be 0');
    assert(game.board[0][0] === 'r', 'Top-left should be black rook');
    assert(game.board[7][4] === 'K', 'Bottom-middle should be white king');
    
    console.log('✓ New game initialization passed');
}

function testBasicMoves() {
    console.log('Testing: Basic moves...');
    const game = new GBChessGame();
    
    // Valid pawn move
    assert(game.makeMove(6, 4, 4, 4) === true, 'e2-e4 should be valid');
    assert(game.board[4][4] === 'P', 'Pawn should be at e4');
    assert(game.board[6][4] === '.', 'e2 should be empty');
    assert(game.whiteToMove === false, 'Should be black\'s turn');
    
    // Invalid move (wrong turn)
    assert(game.makeMove(6, 3, 4, 3) === false, 'White shouldn\'t move on black\'s turn');
    
    // Black responds
    assert(game.makeMove(1, 4, 3, 4) === true, 'e7-e5 should be valid');
    
    console.log('✓ Basic moves passed');
}

function testKnightMoves() {
    console.log('Testing: Knight moves...');
    const game = new GBChessGame();
    
    // Knight move over pieces
    assert(game.makeMove(7, 1, 5, 2) === true, 'Nb1-c3 should be valid');
    assert(game.board[5][2] === 'N', 'Knight should be at c3');
    
    console.log('✓ Knight moves passed');
}

function testPawnPromotion() {
    console.log('Testing: Pawn promotion...');
    const game = new GBChessGame();
    
    // Setup a position for pawn promotion
    game.board = [
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', 'P', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', 'K', '.', '.', 'k']
    ];
    game.whiteToMove = true;
    
    assert(game.makeMove(1, 1, 0, 1) === true, 'Pawn should promote');
    assert(game.board[0][1] === 'Q', 'Pawn should become queen');
    
    console.log('✓ Pawn promotion passed');
}

function testMoveGeneration() {
    console.log('Testing: Move generation...');
    const game = new GBChessGame();
    
    const moves = game.generateMoves();
    assert(moves.length === 20, 'Should have 20 legal moves at start (16 pawn + 4 knight)');
    
    // Make a move and check move generation for black
    game.makeMove(6, 4, 4, 4); // e4
    const blackMoves = game.generateMoves();
    assert(blackMoves.length === 20, 'Black should also have 20 legal moves');
    
    console.log('✓ Move generation passed');
}

function testEvaluation() {
    console.log('Testing: Position evaluation...');
    const game = new GBChessGame();
    
    const startEval = game.evaluate();
    assert(Math.abs(startEval) < 100, 'Starting position should be roughly equal');
    
    // Give white an extra queen
    game.board[4][4] = 'Q';
    const whiteAdvantage = game.evaluate();
    assert(whiteAdvantage > 800, 'Extra queen should give big advantage');
    
    console.log('✓ Position evaluation passed');
}

function testAIMove() {
    console.log('Testing: AI move generation...');
    const game = new GBChessGame();
    
    const startTime = performance.now();
    const move = game.getBestMove(GBDifficulty.EASY);
    const endTime = performance.now();
    
    assert(move !== null, 'AI should find a move');
    assert(move.fromRow >= 0 && move.fromRow < 8, 'Valid from row');
    assert(move.toRow >= 0 && move.toRow < 8, 'Valid to row');
    assert(typeof move.score === 'number', 'Move should have a score');
    
    console.log(`  AI found move in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`  Move: [${move.fromRow},${move.fromCol}] -> [${move.toRow},${move.toCol}], score: ${move.score}`);
    
    console.log('✓ AI move generation passed');
}

function testGameOver() {
    console.log('Testing: Game over detection...');
    const game = new GBChessGame();
    
    // Simple test: normal game should not be over
    assert(game.isGameOver() === false, 'Starting position should not be game over');
    
    console.log('✓ Game over detection passed');
}

function testClone() {
    console.log('Testing: Game cloning...');
    const game = new GBChessGame();
    
    game.makeMove(6, 4, 4, 4); // e4
    
    const cloned = game.clone();
    assert(cloned.board[4][4] === 'P', 'Clone should have same position');
    assert(cloned.whiteToMove === game.whiteToMove, 'Clone should have same turn');
    
    // Modify clone
    cloned.makeMove(1, 4, 3, 4); // e5
    
    // Original shouldn't be affected
    assert(game.board[1][4] === 'p', 'Original should be unchanged');
    assert(cloned.board[3][4] === 'p', 'Clone should be modified');
    
    console.log('✓ Game cloning passed');
}

function testDifficulties() {
    console.log('Testing: Different difficulty levels...');
    const game = new GBChessGame();
    
    const difficulties = [
        { name: 'Beginner', level: GBDifficulty.BEGINNER },
        { name: 'Easy', level: GBDifficulty.EASY },
        { name: 'Medium', level: GBDifficulty.MEDIUM }
    ];
    
    for (const diff of difficulties) {
        const startTime = performance.now();
        const move = game.getBestMoveDifficulty(diff.level);
        const endTime = performance.now();
        
        assert(move !== null, `${diff.name} should find a move`);
        console.log(`  ${diff.name}: ${(endTime - startTime).toFixed(2)}ms`);
    }
    
    console.log('✓ Different difficulty levels passed');
}

function testBoardString() {
    console.log('Testing: Board string representation...');
    const game = new GBChessGame();
    
    const boardStr = game.getBoardString();
    assert(boardStr.includes('rnbqkbnr'), 'Should contain starting position');
    assert(boardStr.includes('RNBQKBNR'), 'Should contain white pieces');
    
    const flatStr = game.getBoardFlat();
    assert(flatStr.length === 64, 'Flat board should be 64 characters');
    
    console.log('✓ Board string representation passed');
}

// Performance benchmark
function benchmarkSearch() {
    console.log('\n📊 Performance Benchmark:');
    console.log('=' .repeat(50));
    
    const game = new GBChessGame();
    
    const depths = [1, 2, 3, 4];
    const results = [];
    
    for (const depth of depths) {
        const startTime = performance.now();
        const move = game.getBestMove(depth);
        const endTime = performance.now();
        
        const time = endTime - startTime;
        results.push({ depth, time, move });
        
        console.log(`Depth ${depth}: ${time.toFixed(2)}ms (score: ${move.score})`);
    }
    
    console.log('=' .repeat(50));
}

// Run all tests
async function runAllTests() {
    console.log('\n🧪 GB Chess Engine - JavaScript Test Suite');
    console.log('=' .repeat(50));
    
    try {
        testNewGame();
        testBasicMoves();
        testKnightMoves();
        testPawnPromotion();
        testMoveGeneration();
        testEvaluation();
        testAIMove();
        testGameOver();
        testClone();
        testDifficulties();
        testBoardString();
        
        console.log('\n✅ All tests passed!\n');
        
        benchmarkSearch();
        
        console.log('\n🎉 Test suite completed successfully!');
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run tests
runAllTests();
