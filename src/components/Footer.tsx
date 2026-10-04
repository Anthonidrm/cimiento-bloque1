import { brand } from "../data/brand";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <strong>{brand.name}</strong>
          <p>{brand.slogan}</p>
        </div>
        <p className="site-footer__meta">
          Currículo: {brand.curriculum.name} · {brand.audience}
        </p>
      </div>
    </footer>
  );
}
