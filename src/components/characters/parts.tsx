import type { ReactNode } from "react";

export type Pose = "stand" | "wave" | "cheer" | "point";

export interface CharacterProps {
  /** Alto en píxeles (el ancho se calcula con la proporción del dibujo). */
  size?: number;
  pose?: Pose;
  /** Tono de piel; si no se indica se usa el de cada personaje. */
  skin?: string;
  className?: string;
  title?: string;
}

export const VIEW_W = 200;
export const VIEW_H = 340;
export const INK = "#2A1810";

/** Oscurece (f < 0) o aclara (f > 0) un color hexadecimal. */
export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.max(0, Math.min(255, Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f)))
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

type Pt = [number, number];
interface Arm {
  shoulder: Pt;
  elbow: Pt;
  hand: Pt;
}

const L_STAND: Arm = { shoulder: [68, 140], elbow: [50, 184], hand: [53, 224] };
const R_STAND: Arm = { shoulder: [132, 140], elbow: [150, 184], hand: [147, 224] };

const POSES: Record<Pose, { left: Arm; right: Arm }> = {
  stand: { left: L_STAND, right: R_STAND },
  wave: { left: L_STAND, right: { shoulder: [132, 140], elbow: [168, 130], hand: [162, 86] } },
  cheer: {
    left: { shoulder: [68, 140], elbow: [36, 128], hand: [42, 82] },
    right: { shoulder: [132, 140], elbow: [164, 128], hand: [158, 82] },
  },
  point: { left: L_STAND, right: { shoulder: [132, 140], elbow: [166, 152], hand: [190, 142] } },
};

function lerp(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function Arms({
  pose,
  skin,
  sleeve,
  spread = 1,
  spreadRaised,
  width = 15,
  handR = 9,
  longSleeve = false,
}: {
  pose: Pose;
  skin: string;
  sleeve: string;
  /** < 1 acerca los brazos al cuerpo (personaje más delgado). */
  spread?: number;
  /** Separación de los brazos levantados (por defecto igual a `spread`). */
  spreadRaised?: number;
  width?: number;
  handR?: number;
  longSleeve?: boolean;
}) {
  const { left, right } = POSES[pose];
  const raisedSpread = spreadRaised ?? spread;
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      {[left, right].map((raw, i) => {
        const k = raw.hand[1] < 130 ? raisedSpread : spread;
        const tx = (p: Pt): Pt => [100 + (p[0] - 100) * k, p[1]];
        const a = { shoulder: tx(raw.shoulder), elbow: tx(raw.elbow), hand: tx(raw.hand) };
        const wristEnd = lerp(a.elbow, a.hand, 0.78);
        const sleeveEnd = lerp(a.shoulder, a.elbow, 0.45);
        return (
          <g key={i}>
            <polyline
              points={`${a.shoulder.join(",")} ${a.elbow.join(",")} ${a.hand.join(",")}`}
              stroke={skin}
              strokeWidth={width}
            />
            {longSleeve ? (
              <polyline
                points={`${a.shoulder.join(",")} ${a.elbow.join(",")} ${wristEnd.join(",")}`}
                stroke={sleeve}
                strokeWidth={width + 4}
              />
            ) : (
              <line
                x1={a.shoulder[0]}
                y1={a.shoulder[1]}
                x2={sleeveEnd[0]}
                y2={sleeveEnd[1]}
                stroke={sleeve}
                strokeWidth={width + 3}
              />
            )}
            <circle cx={a.hand[0]} cy={a.hand[1]} r={handR} fill={skin} stroke="none" />
          </g>
        );
      })}
    </g>
  );
}

/**
 * Rostro. Cada personaje tiene sus propios rasgos, tomados de las fotos de
 * referencia: la niña con rostro redondo, ojos grandes y brillantes y sonrisa
 * abierta; el niño con cabeza ovalada, ojos más serenos y sonrisa de lado.
 */
export function Face({ skin, variant }: { skin: string; variant: "girl" | "boy" }) {
  const g = variant === "girl";
  const shadow = shade(skin, -0.2);
  const cy = g ? 72 : 74;
  const rx = g ? 47 : 40;
  const ry = g ? 45 : 50;
  const eyeY = g ? 73 : 77;
  const dx = g ? 19 : 16;
  const erx = g ? 7.6 : 5.6;
  const ery = g ? 10 : 7.6;
  const mouthY = g ? cy + 23 : cy + 25;

  const Eye = ({ x, sign }: { x: number; sign: 1 | -1 }) => (
    <g>
      <ellipse cx={x} cy={eyeY} rx={erx + 2.6} ry={ery + 1.6} fill="#FFFFFF" />
      <ellipse cx={x} cy={eyeY + 0.5} rx={erx} ry={ery} fill={INK} />
      <ellipse cx={x} cy={eyeY + 1} rx={erx * 0.5} ry={ery * 0.55} fill="#000" />
      <circle cx={x + sign * 2.4} cy={eyeY - ery * 0.4} r={g ? 2.6 : 2} fill="#fff" />
      <circle cx={x - sign * 2} cy={eyeY + ery * 0.4} r={1.2} fill="#fff" opacity={0.8} />
      {/* párpado superior marcado */}
      <path
        d={`M ${x - erx - 3} ${eyeY - 1} Q ${x} ${eyeY - ery - 5} ${x + erx + 3} ${eyeY - 1}`}
        stroke={INK}
        strokeWidth={g ? 3 : 2.4}
        fill="none"
        strokeLinecap="round"
      />
      {g && (
        <g stroke={INK} strokeWidth={1.8} strokeLinecap="round">
          <line x1={x + sign * (erx + 2.5)} y1={eyeY - 3} x2={x + sign * (erx + 7)} y2={eyeY - 6} />
          <line x1={x + sign * (erx + 3)} y1={eyeY + 1} x2={x + sign * (erx + 8)} y2={eyeY + 0} />
        </g>
      )}
    </g>
  );

  return (
    <g>
      <ellipse cx={100 - rx - 3} cy={cy + 4} rx={7} ry={10} fill={skin} stroke={shadow} strokeWidth={2} />
      <ellipse cx={100 + rx + 3} cy={cy + 4} rx={7} ry={10} fill={skin} stroke={shadow} strokeWidth={2} />
      <ellipse cx={100} cy={cy} rx={rx} ry={ry} fill={skin} stroke={shadow} strokeWidth={2} />
      <circle cx={100 - rx * 0.56} cy={cy + 17} r={7.5} fill={g ? shade(skin, -0.28) : "#D98B6A"} opacity={g ? 0.45 : 0.4} />
      <circle cx={100 + rx * 0.56} cy={cy + 17} r={7.5} fill={g ? shade(skin, -0.28) : "#D98B6A"} opacity={g ? 0.45 : 0.4} />
      <Eye x={100 - dx} sign={-1} />
      <Eye x={100 + dx} sign={1} />
      {/* cejas */}
      {g ? (
        <g stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round">
          <path d={`M ${100 - dx - 10} ${eyeY - 19} Q ${100 - dx} ${eyeY - 25} ${100 - dx + 10} ${eyeY - 19}`} />
          <path d={`M ${100 + dx - 10} ${eyeY - 19} Q ${100 + dx} ${eyeY - 25} ${100 + dx + 10} ${eyeY - 19}`} />
        </g>
      ) : (
        <g stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round">
          <path d={`M ${100 - dx - 8} ${eyeY - 15} Q ${100 - dx} ${eyeY - 19} ${100 - dx + 9} ${eyeY - 16}`} />
          <path d={`M ${100 + dx - 9} ${eyeY - 16} Q ${100 + dx} ${eyeY - 19} ${100 + dx + 8} ${eyeY - 15}`} />
        </g>
      )}
      {/* nariz */}
      <path
        d={g ? `M 94 ${cy + 8} Q 100 ${cy + 15} 106 ${cy + 8}` : `M 98 ${cy + 8} Q 101 ${cy + 15} 97 ${cy + 16}`}
        stroke={shadow}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
      />
      {/* boca */}
      {g ? (
        <g>
          <path
            d={`M ${100 - 18} ${mouthY} Q 100 ${mouthY + 17} ${100 + 18} ${mouthY} Q 100 ${mouthY + 5} ${100 - 18} ${mouthY} Z`}
            fill="#8E3B2D"
            stroke="#6F2A1F"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <path d={`M ${100 - 12} ${mouthY + 2.5} Q 100 ${mouthY + 9} ${100 + 12} ${mouthY + 2.5}`} stroke="#fff" strokeWidth={3.2} fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <g stroke="#7A3326" strokeWidth={3} fill="none" strokeLinecap="round">
          <path d={`M ${100 - 14} ${mouthY} Q ${100 + 2} ${mouthY + 9} ${100 + 16} ${mouthY - 3}`} />
          <path d={`M ${100 + 16} ${mouthY - 3} q 3 -1 4 -4`} strokeWidth={2} />
        </g>
      )}
    </g>
  );
}

export function SvgShell({
  size,
  className,
  title,
  children,
}: {
  size: number;
  className?: string;
  title: string;
  children: ReactNode;
}) {
  const width = Math.round((size * VIEW_W) / VIEW_H);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={width}
      height={size}
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}
