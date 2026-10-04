import { Arms, Face, SvgShell, INK, shade, type CharacterProps } from "./parts";

// Basada en la foto de referencia: tez morena oscura, cabello recogido,
// diadema dorada con moño de flor magenta, camiseta amarilla y jean con parche.
const SKIN = "#7B4B33";
const HAIR = "#241711";
const TEE = "#F6C945"; // amarillo/dorado de CIMIENTO
const JEANS = "#4F78B5";
const FLOWER = "#D81B72";

/** Niña oficial de CIMIENTO. */
export default function ChildGirl({
  size = 220,
  pose = "stand",
  skin = SKIN,
  className,
  title = "Niña de CIMIENTO",
}: CharacterProps) {
  return (
    <SvgShell size={size} className={className} title={title}>
      {/* piernas: jean con parche a cuadros */}
      <g stroke={JEANS} strokeWidth={23} strokeLinecap="round">
        <line x1={85} y1={210} x2={83} y2={298} />
        <line x1={115} y1={210} x2={117} y2={298} />
      </g>
      <g>
        <rect x={108} y={252} width={15} height={19} rx={2} fill="#B3342B" />
        <g stroke="#2F5A3A" strokeWidth={2}>
          <line x1={113} y1={252} x2={113} y2={271} />
          <line x1={118} y1={252} x2={118} y2={271} />
        </g>
        <g stroke="#F4E3B8" strokeWidth={1.4}>
          <line x1={108} y1={258} x2={123} y2={258} />
          <line x1={108} y1={265} x2={123} y2={265} />
        </g>
      </g>
      <g fill="#6B4528">
        <ellipse cx={81} cy={314} rx={19} ry={9} />
        <ellipse cx={119} cy={314} rx={19} ry={9} />
      </g>
      {/* camiseta amarilla */}
      <rect x={64} y={128} width={72} height={90} rx={22} fill={TEE} />
      <rect x={66} y={206} width={68} height={22} rx={9} fill={JEANS} />
      <path d="M 86 128 Q 100 142 114 128" stroke={shade(TEE, -0.2)} strokeWidth={4} fill="none" strokeLinecap="round" />
      <rect x={90} y={112} width={20} height={20} rx={6} fill={skin} />
      <Arms pose={pose} skin={skin} sleeve={TEE} spreadRaised={1.22} />
      <Face skin={skin} variant="girl" />

      {/* cabello recogido hacia atrás */}
      <ellipse cx={100} cy={24} rx={30} ry={15} fill={HAIR} />
      <path d="M 53 66 Q 54 34 100 32 Q 146 34 147 66 Q 132 46 100 47 Q 68 46 53 66 Z" fill={HAIR} />
      <ellipse cx={55} cy={63} rx={5} ry={7} fill={HAIR} />
      <ellipse cx={145} cy={63} rx={5} ry={7} fill={HAIR} />
      {/* diadema dorada */}
      <path d="M 54 66 Q 100 8 146 66" stroke="#C9971B" strokeWidth={12} fill="none" strokeLinecap="round" />
      <path d="M 54 66 Q 100 8 146 66" stroke="#F8D34A" strokeWidth={8.5} fill="none" strokeLinecap="round" />
      {/* moño de flor (magenta con centro amarillo) */}
      <g>
        <ellipse cx={58} cy={46} rx={12} ry={6} fill="#C9D43A" transform="rotate(35 58 46)" />
        <ellipse cx={80} cy={44} rx={12} ry={6} fill="#C9D43A" transform="rotate(-30 80 44)" />
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx={69} cy={26} rx={8} ry={12.5} fill={FLOWER} stroke={shade(FLOWER, -0.25)} strokeWidth={1.2} transform={`rotate(${a} 69 34)`} />
        ))}
        <circle cx={69} cy={34} r={7.5} fill="#F4C21E" stroke="#C9971B" strokeWidth={1.5} />
      </g>
      {/* arete */}
      <circle cx={46} cy={86} r={3} fill="#F4C21E" stroke={INK} strokeWidth={0.8} />
    </SvgShell>
  );
}
