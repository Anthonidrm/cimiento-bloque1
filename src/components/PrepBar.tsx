import "./PrepBar.css";

export default function PrepBar({
  percent,
  label,
}: {
  percent: number;
  label?: string;
}) {
  return (
    <div className="prep-bar">
      {label && <span className="prep-bar__label">{label}</span>}
      <div className="prep-bar__track">
        <div className="prep-bar__fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="prep-bar__percent">{percent}%</span>
    </div>
  );
}
