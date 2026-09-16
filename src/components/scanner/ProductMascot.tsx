/** Vector illustration adapted from the Stitch home-screen export. */
export const ProductMascot = () => <svg aria-hidden="true" viewBox="0 0 120 140" fill="none" className="w-full h-full">
  <path d="M22 28L40 18L98 22L80 32H22V124C22 131 27 136 34 136H86C93 136 98 131 98 124V22" fill="#4ae176" />
  <path d="M22 32H98V124C98 131 93 136 86 136H34C27 136 22 131 22 124V32Z" fill="#22c55e" />
  <path d="M22 28L40 18H80L98 22L80 32H22V28Z" fill="#16a34a" />
  <circle cx="60" cy="74" r="24" fill="white" />
  <path d="M48 68C48 65.5 50.5 63.5 53 64.5M67 68C67 65.5 69.5 63.5 72 64.5M53 78C55 83 65 83 67 78" stroke="#1e1b16" strokeWidth="3" strokeLinecap="round" />
  <circle cx="46" cy="76" r="3.5" fill="#ffa5a5" /><circle cx="74" cy="76" r="3.5" fill="#ffa5a5" />
  {[36, 43, 50, 57, 64, 72, 80].map((x, i) => <rect key={x} x={x} y="106" width={i % 2 ? 5 : 3} height="16" rx="1.5" fill="white" />)}
  <path d="M72 16C72 16 84 10 86 20C88 30 76 26 72 16Z" fill="#fef08a" />
</svg>;
