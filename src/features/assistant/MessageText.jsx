import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const elements = [
  'p',
  'br',
  'strong',
  'em',
  'del',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]
const components = {
  table: ({ children }) => (
    <div className="manager-table-scroll" role="region" aria-label="Response table" tabIndex={0}>
      <table>{children}</table>
    </div>
  ),
}

export default function MessageText({ text }) {
  // No raw HTML plugin. Links/images are excluded, including GFM autolinks.
  return (
    <div className="manager-prose">
      <Markdown
        remarkPlugins={[remarkGfm]}
        allowedElements={elements}
        unwrapDisallowed
        components={components}
      >
        {text}
      </Markdown>
    </div>
  )
}
