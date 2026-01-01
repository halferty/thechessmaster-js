/**
 * Simple example of using the GB Chess Engine
 * This demonstrates a basic game loop with AI vs AI
 */

import { GBChessGame, GBDifficulty } from './gbchess.js';

// Helper function to convert coordinates to chess notation
function toChessNotation(row, col) {
    const files = 'abcdefgh';
    const rank = 8 - row;
    return files[col] + rank;
}

// Helper function to display move in readable format
function formatMove(move) {
    const from = toChessNotation(move.fromRow, move.fromCol);
    const to = toChessNotation(move.toRow, move.toCol);
    return `${from}${to}`;
}

// Play a simple game
function playGame() {
    console.log('🎮 GB Chess Engine Demo');
    console.log('=' .repeat(50));
    console.log('Playing: White (Beginner) vs Black (Easy)\n');

    const game = new GBChessGame();
    let moveNumber = 1;

    while (!game.isGameOver() && moveNumber <= 20) {
        console.log(`\nMove ${moveNumber}:`);
        console.log(game.getBoardString());
        console.log('─'.repeat(50));

        // White's turn
        const whiteDiff = GBDifficulty.BEGINNER;
        const whiteMove = game.getBestMove(whiteDiff);
        
        if (!whiteMove) {
            console.log('Game Over! Black wins!');
            break;
        }

        console.log(`White plays: ${formatMove(whiteMove)} (score: ${whiteMove.score})`);
        game.makeMove(whiteMove.fromRow, whiteMove.fromCol, whiteMove.toRow, whiteMove.toCol);
        
        if (game.isGameOver()) {
            console.log('\nFinal Position:');
            console.log(game.getBoardString());
            console.log('\nGame Over! White wins!');
            break;
        }

        // Black's turn
        const blackDiff = GBDifficulty.EASY;
        const blackMove = game.getBestMove(blackDiff);
        
        if (!blackMove) {
            console.log('Game Over! White wins!');
            break;
        }

        console.log(`Black plays: ${formatMove(blackMove)} (score: ${blackMove.score})`);
        game.makeMove(blackMove.fromRow, blackMove.fromCol, blackMove.toRow, blackMove.toCol);

        const evaluation = game.evaluate();
        console.log(`Position eval: ${evaluation > 0 ? '+' : ''}${evaluation}`);

        moveNumber++;
    }

    console.log('\n' + '='.repeat(50));
    console.log('Demo complete!');
}

// Interactive example
function interactiveExample() {
    console.log('\n\n🎯 Interactive Example');
    console.log('=' .repeat(50));

    const game = new GBChessGame();

    // Make some moves manually
    console.log('\n1. Making moves manually:');
    console.log('e2-e4...');
    game.makeMove(6, 4, 4, 4);
    console.log(game.getBoardString());

    console.log('\n2. Getting AI suggestion for black:');
    const aiMove = game.getBestMove(GBDifficulty.MEDIUM);
    console.log(`AI suggests: ${formatMove(aiMove)} with score ${aiMove.score}`);
    game.makeMove(aiMove.fromRow, aiMove.fromCol, aiMove.toRow, aiMove.toCol);
    console.log(game.getBoardString());

    console.log('\n3. Evaluating position:');
    const evaluation = game.evaluate();
    console.log(`Position score: ${evaluation > 0 ? '+' : ''}${evaluation}`);
    console.log(`${evaluation > 0 ? 'White' : 'Black'} has advantage`);

    console.log('\n4. Checking legal moves:');
    const moves = game.generateMoves();
    console.log(`White has ${moves.length} legal moves`);
    console.log(`First 5 moves: ${moves.slice(0, 5).map(formatMove).join(', ')}`);
}

// Performance comparison
function performanceComparison() {
    console.log('\n\n⚡ Performance Comparison');
    console.log('=' .repeat(50));

    const game = new GBChessGame();
    
    const difficulties = [
        { name: 'Beginner', level: 1 },
        { name: 'Easy', level: 2 },
        { name: 'Medium', level: 3 },
        { name: 'Hard', level: 4 }
    ];

    console.log('\nTesting search speed at different depths:\n');

    for (const diff of difficulties) {
        const startTime = performance.now();
        const move = game.getBestMove(diff.level);
        const endTime = performance.now();
        
        const time = (endTime - startTime).toFixed(2);
        console.log(`${diff.name} (depth ${diff.level}): ${time}ms - ${formatMove(move)}`);
    }
}

// Run all examples
console.log('🚀 GB Chess Engine - Example Usage\n');
playGame();
interactiveExample();
performanceComparison();

console.log('\n\n✨ All examples completed!');
console.log('💡 Try opening index.html in your browser for an interactive UI!');
