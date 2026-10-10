import { Hero } from "./sections/Hero.tsx";
import { Primitives } from "./sections/Primitives.tsx";
import { Studio } from "./sections/Studio.tsx";
import { Review } from "./sections/Review.tsx";
import { Pipeline } from "./sections/Pipeline.tsx";
import { CourseMap } from "./sections/CourseMap.tsx";

export function App() {
  return (
    <>
      <nav className="nav">
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
            <path d="M4 22a4 4 0 0 1 8 0M12 22a4 4 0 0 1 8 0M20 22a4 4 0 0 1 8 0" fill="none" stroke="#e0a868" strokeWidth="1.6" />
            <path d="M3 22h26" stroke="#e0a868" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M3 9h26" stroke="#35e0c4" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          Aqueduct
        </div>
        <div className="links">
          <a className="link" href="#engineering">Engineering</a>
          <a className="link" href="#studio">Studio</a>
          <a className="link" href="#review">Review</a>
          <a className="link" href="#learn">Learn</a>
          <a className="launch" href="#studio">Launch</a>
        </div>
      </nav>

      <Hero />
      <Primitives />
      <Studio />
      <Review />
      <Pipeline />
      <CourseMap />

      <footer className="footer band">
        <div className="content">
          Aqueduct · a distributed-systems studio · by Nishant Singh
        </div>
      </footer>
    </>
  );
}
