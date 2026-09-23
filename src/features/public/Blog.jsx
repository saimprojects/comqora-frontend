import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowUpRight, ArrowLeft, Search, ArrowRight, Layers, Truck, BarChart3 } from 'lucide-react'
import { api } from '../../lib/api'
import { ErrorState, Loading } from '../../components/ui'
import { PageMeta } from './PublicLayout'

export function ArticleArt({ index = 0 }) {
  const Icon = [Layers, Truck, BarChart3][index % 3]
  return (
    <div className={`article-art art-${index % 3}`} aria-hidden="true">
      <span>THE COMQORA JOURNAL</span>
      <div className="article-art-ring">
        <Icon size={52} strokeWidth={1.1} />
      </div>
      <strong>
        Commerce,
        <br />
        with perspective.
      </strong>
      <ArrowUpRight size={25} />
    </div>
  )
}

export default function Blog() {
  const [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState(''),
    [page, setPage] = useState(1)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])
  const query = useQuery({
    queryKey: ['public-blog', page, debounced],
    queryFn: () =>
      api(`public/blog/?page=${page}&page_size=12&search=${encodeURIComponent(debounced)}`),
  })
  const posts = query.data?.results || []
  return (
    <section className="public-section public-container journal-page">
      <PageMeta
        title="The journal"
        description="Practical perspectives on inventory, delivery operations and running a clearer commerce business."
      />
      <span className="section-kicker">THE COMQORA JOURNAL</span>
      <div className="section-heading">
        <h1>
          Ideas for the
          <br />
          <em>work behind the work.</em>
        </h1>
        <p>
          Practical perspectives. Thoughtful operations.
          <br />A little more clarity for your next decision.
        </p>
      </div>
      <label className="journal-search">
        <Search size={19} />
        <input
          aria-label="Search all articles"
          placeholder="Find a story by topic or title"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </label>
      {query.isPending && <Loading />}
      {query.error && <ErrorState error={query.error} retry={query.refetch} />}
      <div className="journal-grid">
        {posts.map((post, i) => (
          <Link key={post.slug} to={`/blog/${post.slug}`} className="journal-card">
            <ArticleArt index={i} />
            <div>
              <span className="section-kicker">{post.category}</span>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <span className="article-read">
                Read the story <ArrowUpRight size={17} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!query.isPending && !query.error && !posts.length && (
        <div className="public-empty">
          <h2>A little quiet here.</h2>
          <p>Try a different search, or check back for the next story.</p>
        </div>
      )}
      <div className="journal-pagination">
        <button
          className="btn btn-secondary"
          disabled={page === 1 || query.isFetching}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          className="btn btn-secondary"
          disabled={!query.data?.next || query.isFetching}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </section>
  )
}

export function BlogArticle() {
  const { slug } = useParams()
  const query = useQuery({
    queryKey: ['public-post', slug],
    queryFn: () => api(`public/blog/${slug}/`),
  })
  if (query.isPending) return <Loading />
  if (query.error)
    return (
      <section className="public-section public-container">
        <PageMeta title="Article unavailable" noindex />
        <ErrorState error={query.error} retry={query.refetch} />
        <Link to="/blog" className="text-link">
          Back to the journal
        </Link>
      </section>
    )
  const post = query.data
  return (
    <article className="article-page public-container">
      <PageMeta title={post.title} description={post.excerpt} article={post} />
      <Link to="/blog" className="text-link">
        <ArrowLeft size={15} /> Back to the journal
      </Link>
      <header>
        <span className="section-kicker">{post.category}</span>
        <h1>{post.title}</h1>
        <p>{post.excerpt}</p>
        <div>
          {post.author} <span>·</span>{' '}
          {new Date(post.published_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}{' '}
          <span>·</span> {Math.max(1, Math.ceil(post.body.split(/\s+/).length / 200))} min read
        </div>
      </header>
      <ArticleArt />
      <div className="article-prose">
        {post.body
          .split(/\r?\n\s*\r?\n/)
          .map((block, i) =>
            block.startsWith('## ') ? <h2 key={i}>{block.slice(3)}</h2> : <p key={i}>{block}</p>,
          )}
      </div>
      <aside className="article-next">
        <h2>Put clarity into practice.</h2>
        <Link className="btn btn-primary" to="/register">
          Explore your workspace <ArrowRight size={16} />
        </Link>
      </aside>
    </article>
  )
}
