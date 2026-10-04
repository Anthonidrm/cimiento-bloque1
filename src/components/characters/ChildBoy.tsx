import { Arms, Face, SvgShell, shade, type CharacterProps } from "./parts";

// Basado en la foto de referencia: delgado y alto, cabeza ovalada, cabello
// corto y rizado, sonrisa tranquila. Sudadera en el azul de CIMIENTO.
const SKIN = "#A06A49";
const HAIR = "#2A1B14";
const HOODIE = "#2E6FD0";
const PANTS = "#1F2D4A";
const GREEN = "#3FA66B";

/** Niño oficial de CIMIENTO. */
export default function ChildBoy({
  size = 220,
  pose = "stand",
  skin = SKIN,
  className,
  title = "Niño de CIMIENTO",
}: CharacterProps) {
  return (
    <SvgShell size={size} className={className} title={title}>
      {/* pantalón delgado */}
      <g stroke={PANTS} strokeWidth={15} strokeLinecap="round">
        <line x1={89} y1={216} x2={88} y2={304} />
        <line x1={111} y1={216} x2={112} y2={304} />
      </g>
      <rect x={75} y={204} width={50} height={30} rx={10} fill={PANTS} />
      <g fill="#6B4528">
        <ellipse cx={85} cy={314} rx={15} ry={8} />
        <ellipse cx={115} cy={314} rx={15} ry={8} />
      </g>
      {/* sudadera */}
      <rect x={73} y={128} width={54} height={92} rx={17} fill={HOODIE} />
      <path d="M 84 190 Q 100 184 116 190 L 114 210 Q 100 214 86 210 Z" fill={shade(HOODIE, -0.16)} />
      <g stroke="#fff" strokeWidth={2.4} strokeLinecap="round">
        <line x1={94} y1={138} x2={93} y2={162} />
        <line x1={106} y1={138} x2={107} y2={160} />
      </g>
      <g stroke={GREEN} strokeWidth={5} strokeLinecap="round">
        <line x1={89} y1={170} x2={111} y2={170} />
        <line x1={92} y1={178} x2={108} y2={178} />
      </g>
      {/* capucha alrededor del cuello */}
      <path d="M 74 130 Q 100 152 126 130 Q 100 122 74 130 Z" fill={shade(HOODIE, -0.22)} />
      <rect x={92} y={116} width={16} height={18} rx={5} fill={skin} />
      <Arms pose={pose} skin={skin} sleeve={HOODIE} spread={0.82} spreadRaised={1.28} width={12} handR={7.5} longSleeve />
      <Face skin={skin} variant="boy" />

      {/* cabello corto y rizado */}
      <path d="M 60 66 Q 58 32 100 29 Q 142 32 140 66 Q 130 48 100 48 Q 70 48 60 66 Z" fill={HAIR} />
      {[72, 86, 100, 114, 128].map((x, i) => (
        <circle key={x} cx={x} cy={i % 2 ? 31 : 33} r={9} fill={HAIR} />
      ))}
      <circle cx={62} cy={50} r={7} fill={HAIR} />
      <circle cx={138} cy={50} r={7} fill={HAIR} />
    </SvgShell>
  );
}
