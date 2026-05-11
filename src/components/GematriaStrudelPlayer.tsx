import { evalScope, repl } from '@strudel/core';
import { transpiler } from '@strudel/transpiler';
import { getAudioContext, initAudioOnFirstClick, registerSynthSounds, webaudioOutput } from '@strudel/webaudio';
import { calculateGematria } from 'kaabalah/gematria';
import React, { useEffect, useRef, useState } from 'react';

const baseCode = `\nsamples('https://raw.githubusercontent.com/felixroos/dough-samples/main/piano.json')\nsetcps(1)\n`;

/**
 * Gematria → Note map
 */
const g2n: Record<number, string> = {
  1: 'e4', 2: 'a4', 3: 'f4', 4: 'c4', 5: 'd4', 6: 'f4', 7: 'g4', 8: 'a4', 9: 'a4',
  10: 'g4', 20: 'd4', 30: 'f4', 40: 'd4', 50: 'a4', 60: 'e4', 70: 'c4', 80: 'b4', 90: 'g4',
  100: 'b4', 200: 'c4', 300: 'b4', 400: 'e4',
};

/**
 * Note -> note name map
 */
const n2n: Record<string, string> = {
  'c4': 'dó', 'd4': 'ré', 'e4': 'mi', 'f4': 'fá', 'g4': 'sol', 'a4': 'lá', 'b4': 'si',
};

const GematriaStrudelPlayer: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const ctxRef = useRef<AudioContext | null>(null);
  const evaluateRef = useRef<any>(null);
  const [hasEvaluatedBaseCode, setHasEvaluatedBaseCode] = useState(false);
  const [noteNames, setNoteNames] = useState<string[]>([]);

  useEffect(() => {
    const ctx = getAudioContext();
    ctxRef.current = ctx;
    initAudioOnFirstClick();
    registerSynthSounds();

    evalScope(
      import('@strudel/core'),
      import('@strudel/mini'),
      import('@strudel/webaudio'),
      import('@strudel/tonal')
    );

    const { evaluate } = repl({
      defaultOutput: webaudioOutput,
      getTime: () => ctx.currentTime,
      transpiler,
    });

    evaluateRef.current = evaluate;
  }, []);

  const gemNote = (ch: string): string => {
    const v = calculateGematria(ch).synthesis.originalSum;
    return g2n[v] || 'c4';
  };

  const handlePlay = () => {
    if (!evaluateRef.current || !ctxRef.current || !inputValue) return;
    ctxRef.current.resume();
    if (!hasEvaluatedBaseCode && baseCode) {
      evaluateRef.current(baseCode);
      setHasEvaluatedBaseCode(true);
    }
    const sequences = inputValue.trim().split(' ').map((word: string) => [...word].map(gemNote).join(' '));
    const formattedSequences = sequences.map((seq: string) => `<${seq}>`).join(' ');
    setNoteNames(sequences.map((seq: string) => seq.split(' ').map(s => n2n[s]).join(' ')));

    evaluateRef.current(`note("${formattedSequences}").sound("piano").dur(0.3)`);
  };

  const handleStop = () => {
    if (evaluateRef.current && ctxRef.current) {
      ctxRef.current.resume();
      evaluateRef.current('hush()');
    }
  };

  return (
    <div className="my-4">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Type some text"
        className="w-full px-3 py-2 border rounded-md text-gray-900 dark:text-gray-800"
      />
      <div className="mt-2 flex flex-col gap-2">
        <button onClick={handlePlay} className="px-4 py-2 bg-blue-600 text-white rounded-md">
          Play
        </button>
        <button onClick={handleStop} className="px-4 py-2 bg-gray-600 text-white rounded-md">
          Stop
        </button>
      </div>
      <div className="mt-2 text-center flex flex-col gap-2">
        <div className="text-gray-500 dark:text-gray-400 flex flex-col gap-1">
          {noteNames.map((name) => (
            <span key={name}>
              {name}
            </span>
          ))}
        </div>
        <span className="text-gray-500 dark:text-gray-400 text-sm">
          Made using <a href="https://strudel.cc/workshop/getting-started/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-500 hover:text-indigo-800 dark:hover:text-indigo-700">Strudel</a>
        </span>
      </div>
    </div>
  );
};

export default GematriaStrudelPlayer; 