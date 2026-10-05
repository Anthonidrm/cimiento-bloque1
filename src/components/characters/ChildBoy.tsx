import { Arms, Face, SvgShell, shade, BODY_T, HEAD_T, type CharacterProps } from "./parts";

// Basado en la foto de referencia: delgado y alto, cabeza ovalada, cabello
// corto y rizado, sonrisa tranquila. Sudadera en el azul de CIMIENTO.
const SKIN = "#A9795B"; // un poco más clara que antes y más clara que la niña
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
      <g transform={BODY_T}>
      {/* pantalón */}
      <g stroke={PANTS} strokeWidth={17} strokeLinecap="round">
        <line x1={89} y1={216} x2={88} y2={304} />
        <line x1={111} y1={216} x2={112} y2={304} />
      </g>
      <rect x={75} y={204} width={50} height={30} rx={10} fill={PANTS} />
      <g fill="#6B4528">
        <ellipse cx={85} cy={314} rx={15} ry={8} />
        <ellipse cx={115} cy={314} rx={15} ry={8} />
      </g>
      {/* sudadera */}
      <rect x={70} y={128} width={60} height={92} rx={18} fill={HOODIE} />
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
      <Arms pose={pose} skin={skin} sleeve={HOODIE} spread={0.9} spreadRaised={1.28} width={13} handR={8} longSleeve />
      </g>
      <g transform={HEAD_T}>
      <Face skin={skin} variant="boy" />

      {/* cabello corto y rizado */}
      <path d="M 57 68 Q 55 30 100 27 Q 145 30 143 68 Q 133 48 100 48 Q 67 48 57 68 Z" fill={HAIR} />
      {[70, 85, 100, 115, 130].map((x, i) => (
        <circle key={x} cx={x} cy={i % 2 ? 30 : 32} r={9.5} fill={HAIR} />
      ))}
      <circle cx={59} cy={52} r={7} fill={HAIR} />
      <circle cx={141} cy={52} r={7} fill={HAIR} />
      </g>
    </SvgShell>
  );
}
