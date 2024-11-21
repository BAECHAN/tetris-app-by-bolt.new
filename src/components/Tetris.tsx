import React, { useState, useEffect, useCallback } from 'react';
import { useInterval } from '../hooks/useInterval';
import { Trophy, RotateCcw, Pause, Play } from 'lucide-react';

type Block = {
  shape: number[][];
  color: string;
};

const SHAPES: Block[] = [
  { // I
    shape: [[1, 1, 1, 1]],
    color: 'bg-cyan-500'
  },
  { // L
    shape: [[1, 0], [1, 0], [1, 1]],
    color: 'bg-orange-500'
  },
  { // J
    shape: [[0, 1], [0, 1], [1, 1]],
    color: 'bg-blue-500'
  },
  { // O
    shape: [[1, 1], [1, 1]],
    color: 'bg-yellow-500'
  },
  { // S
    shape: [[0, 1, 1], [1, 1, 0]],
    color: 'bg-green-500'
  },
  { // T
    shape: [[0, 1, 0], [1, 1, 1]],
    color: 'bg-purple-500'
  },
  { // Z
    shape: [[1, 1, 0], [0, 1, 1]],
    color: 'bg-red-500'
  }
];

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const INITIAL_DROP_TIME = 1000;
const SPEED_INCREASE = 50;

const createEmptyBoard = () => 
  Array(BOARD_HEIGHT).fill(null).map(() => 
    Array(BOARD_WIDTH).fill(null)
  );

const Tetris: React.FC = () => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentBlock, setCurrentBlock] = useState<Block | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dropTime, setDropTime] = useState<number | null>(INITIAL_DROP_TIME);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const getRandomBlock = useCallback(() => {
    const block = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    setCurrentBlock(block);
    setPosition({ x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 });
  }, []);

  const checkCollision = useCallback((newX: number, newY: number, rotatedShape?: number[][]) => {
    const shape = rotatedShape || currentBlock?.shape || [];
    return shape.some((row, dy) =>
      row.some((cell, dx) => {
        if (cell) {
          const boardX = newX + dx;
          const boardY = newY + dy;
          return (
            boardX < 0 ||
            boardX >= BOARD_WIDTH ||
            boardY >= BOARD_HEIGHT ||
            (boardY >= 0 && board[boardY][boardX] !== null)
          );
        }
        return false;
      })
    );
  }, [board, currentBlock]);

  const rotateBlock = useCallback(() => {
    if (!currentBlock) return;
    
    const rotated = currentBlock.shape[0].map((_, i) =>
      currentBlock.shape.map(row => row[i]).reverse()
    );
    
    if (!checkCollision(position.x, position.y, rotated)) {
      setCurrentBlock({ ...currentBlock, shape: rotated });
    }
  }, [currentBlock, position, checkCollision]);

  const moveBlock = useCallback((dx: number) => {
    if (!currentBlock || gameOver || isPaused) return;
    const newX = position.x + dx;
    if (!checkCollision(newX, position.y)) {
      setPosition(prev => ({ ...prev, x: newX }));
    }
  }, [currentBlock, position, checkCollision, gameOver, isPaused]);

  const dropBlock = useCallback(() => {
    if (!currentBlock || gameOver || isPaused) return;
    const newY = position.y + 1;
    if (!checkCollision(position.x, newY)) {
      setPosition(prev => ({ ...prev, y: newY }));
    } else {
      // Merge block with board
      const newBoard = board.map(row => [...row]);
      currentBlock.shape.forEach((row, dy) => {
        row.forEach((cell, dx) => {
          if (cell && position.y + dy >= 0) {
            newBoard[position.y + dy][position.x + dx] = currentBlock.color;
          }
        });
      });

      // Check for completed rows
      let completedRows = 0;
      for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (newBoard[y].every(cell => cell !== null)) {
          newBoard.splice(y, 1);
          newBoard.unshift(Array(BOARD_WIDTH).fill(null));
          completedRows++;
        }
      }

      // Update score and level
      if (completedRows > 0) {
        const points = [0, 100, 300, 500, 800][completedRows] * level;
        setScore(prev => prev + points);
        setLevel(prev => Math.floor(prev + completedRows * 0.1));
      }

      setBoard(newBoard);
      
      // Check game over
      if (position.y <= 0) {
        setGameOver(true);
        setDropTime(null);
        return;
      }

      getRandomBlock();
    }
  }, [currentBlock, position, board, checkCollision, gameOver, isPaused, level, getRandomBlock]);

  useEffect(() => {
    if (!currentBlock) {
      getRandomBlock();
    }
  }, [currentBlock, getRandomBlock]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          moveBlock(-1);
          break;
        case 'ArrowRight':
          moveBlock(1);
          break;
        case 'ArrowDown':
          dropBlock();
          break;
        case 'ArrowUp':
          rotateBlock();
          break;
        case ' ':
          setIsPaused(prev => !prev);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [moveBlock, dropBlock, rotateBlock, gameOver]);

  useInterval(() => {
    if (!gameOver && !isPaused) {
      dropBlock();
    }
  }, dropTime);

  useEffect(() => {
    setDropTime(INITIAL_DROP_TIME - (level - 1) * SPEED_INCREASE);
  }, [level]);

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setCurrentBlock(null);
    setGameOver(false);
    setScore(0);
    setLevel(1);
    setDropTime(INITIAL_DROP_TIME);
    setIsPaused(false);
  };

  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);
    
    if (currentBlock && !gameOver) {
      currentBlock.shape.forEach((row, dy) => {
        row.forEach((cell, dx) => {
          if (cell && position.y + dy >= 0) {
            displayBoard[position.y + dy][position.x + dx] = currentBlock.color;
          }
        });
      });
    }

    return displayBoard.map((row, y) => (
      <div key={y} className="flex">
        {row.map((cell, x) => (
          <div
            key={`${x}-${y}`}
            className={`w-6 h-6 border border-gray-800 ${
              cell || 'bg-gray-900'
            } transition-colors duration-100`}
          />
        ))}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl">
        <div className="flex gap-8">
          <div className="flex flex-col items-center">
            <div className="mb-4 flex items-center gap-4">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <span className="text-2xl font-bold">{score}</span>
            </div>
            <div className="mb-4 flex items-center gap-4">
              <span className="text-xl">Level: {level}</span>
            </div>
            <div className="border-4 border-gray-700 bg-gray-900 p-1">
              {renderBoard()}
            </div>
            <div className="mt-4 flex gap-4">
              <button
                onClick={resetGame}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={() => setIsPaused(prev => !prev)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex flex-col justify-center gap-4">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-2">Controls</h2>
              <ul className="space-y-2">
                <li>← → : Move</li>
                <li>↑ : Rotate</li>
                <li>↓ : Soft Drop</li>
                <li>Space : Pause</li>
              </ul>
            </div>
            {gameOver && (
              <div className="bg-red-900/50 p-4 rounded-lg text-center">
                <h2 className="text-xl font-bold mb-2">Game Over!</h2>
                <p className="mb-4">Final Score: {score}</p>
                <button
                  onClick={resetGame}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tetris;