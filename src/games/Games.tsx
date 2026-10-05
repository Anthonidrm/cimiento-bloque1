import { useMemo, useState, type ReactElement } from "react";
import type { Game } from "../backend/types";
import { saveGameResult } from "../backend/students";
import { words, shuffled, scoreOrder, scoreBlanks, norm } from "./logic";
import { Msg } from "../components/panels/ui";
import { useAction } from "../components/panels/hooks";

type Cfg = { text: string; ref: string; blanks?: number[] };

function OrderGame({ game, onDone }: { game: Game; onDone: (score: number) => void }) {
  const cfg = game.config as unknown as Cfg;
  const pool = useMemo(() => shuffled(words(cfg.text), game.week * 7919 + cfg.text.length), [cfg.text, game.week]);
  const [chosen, setChosen] = useState<number[]>([]); // índices del pool, en el orden elegido
  const answer = chosen.map((i) => pool[i]);
  return (
    <div>
      <p>Toca las palabras en el orden correcto para formar el versículo ({cfg.ref}).</p>
      <p className="pn-card" aria-live="polite" style={{ minHeight: 56 }}>{answer.join(" ") || "…"}</p>
      <div className="pn-inline">{pool.map((w, i) => <button key={i} type="button" className="pn-btn secondary" disabled={chosen.includes(i)} onClick={() => setChosen([...chosen, i])}>{w}</button>)}</div>
      <div className="pn-inline" style={{ marginTop: 10 }}>
        <button type="button" className="pn-btn secondary" onClick={() => setChosen(chosen.slice(0, -1))} disabled={!chosen.length}>Borrar última</button>
        <button type="button" className="pn-btn" disabled={chosen.length !== pool.length} onClick={() => onDone(scoreOrder(answer, cfg.text))}>Terminar</button>
      </div>
    </div>
  );
}

function BlanksGame({ game, onDone }: { game: Game; onDone: (score: number) => void }) {
  const cfg = game.config as unknown as Cfg;
  const ws = words(cfg.text);
  const blanks = cfg.blanks ?? [];
  const [ans, setAns] = useState<string[]>(blanks.map(() => ""));
  return (
    <div>
      <p>Escribe las palabras que faltan en el versículo ({cfg.ref}).</p>
      <p style={{ lineHeight: 2.4 }}>{ws.map((w, i) => { const k = blanks.indexOf(i); return k < 0 ? <span key={i}>{w} </span> : <input key={i} aria-label={`Palabra ${k + 1}`} value={ans[k]} onChange={(e) => setAns(ans.map((a, j) => (j === k ? e.target.value : a)))} style={{ width: Math.max(70, norm(w).length * 14), margin: "0 4px", minHeight: 36 }} />; })}</p>
      <button type="button" className="pn-btn" disabled={ans.some((a) => !a.trim())} onClick={() => onDone(scoreBlanks(ans, cfg.text, blanks))}>Terminar</button>
    </div>
  );
}

/** Registro de juegos por tipo. Agregar un juego nuevo = agregar su componente aquí y su fila en la tabla `games` (independiente por lección). */
const GAME_ENGINES: Record<string, (p: { game: Game; onDone: (score: number) => void }) => ReactElement> = {
  ORDENAR_PALABRAS: OrderGame,
  COMPLETAR_VERSICULO: BlanksGame,
};

export function GameRunner({ game }: { game: Game }) {
  const act = useAction();
  const [score, setScore] = useState<number | null>(null);
  const Engine = GAME_ENGINES[game.kind];
  if (!Engine) return <p>Este tipo de juego ({game.kind}) todavía no está disponible.</p>;
  if (score !== null) {
    return (
      <div role="status">
        <p className="big">⭐ {score} de 100</p>
        <Msg msg={act.msg} />
        {!act.msg && <button type="button" className="pn-btn" disabled={act.busy} onClick={() => act.run(() => saveGameResult(game.id, score, 100, {}), game.counts_as_exam ? "Resultado guardado: cuenta para tu examen." : "Resultado guardado.")}>Guardar mi resultado</button>}
      </div>
    );
  }
  return <Engine game={game} onDone={setScore} />;
}
