import { blogColumnMeta, type BlogColumn } from '../data/blog'

interface BlogColumnFilterProps {
  columns: BlogColumn[]
  counts: Record<BlogColumn, number>
  totalCount: number
  selectedColumn: BlogColumn | 'all'
  onSelect: (column: BlogColumn | 'all') => void
}

function countLabel(count: number) {
  return count > 0 ? `${count} 篇` : '待首发'
}

export function BlogColumnFilter({ columns, counts, totalCount, selectedColumn, onSelect }: BlogColumnFilterProps) {
  return (
    <div className="blog-column-filter">
      <button
        className={`filter-btn ${selectedColumn === 'all' ? 'active' : ''}`}
        onClick={() => onSelect('all')}
      >
        <span className="filter-btn-title">全部</span>
        <span className="filter-btn-subtitle">All Notes · {totalCount} 篇</span>
      </button>
      {columns.map((column) => {
        const meta = blogColumnMeta[column]
        const count = counts[column]
        return (
          <button
            key={column}
            className={`filter-btn ${selectedColumn === column ? 'active' : ''} ${count === 0 ? 'is-empty' : ''}`}
            onClick={() => onSelect(column)}
          >
            <span className="filter-btn-title">{meta.titleZh}</span>
            <span className="filter-btn-subtitle">
              {meta.titleEn} · {countLabel(count)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
