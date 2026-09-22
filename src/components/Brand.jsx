import { Link } from 'react-router-dom'
import { wordmarkPath, wordmarkViewBox } from './brandArtwork'

export default function Brand({ to = '/', inverse = false }) {
  return (
    <Link to={to} className={inverse ? 'brand brand-inverse' : 'brand'} aria-label="Comqora home">
      <img
        className="cq-mark"
        src="/brand/comqora-symbol-192.png"
        width="40"
        height="40"
        alt=""
        decoding="async"
      />
      <svg
        className="cq-wordmark"
        viewBox={wordmarkViewBox}
        width="142"
        height="26"
        aria-hidden="true"
      >
        <path d={wordmarkPath} fill="currentColor" fillRule="evenodd" />
      </svg>
    </Link>
  )
}
