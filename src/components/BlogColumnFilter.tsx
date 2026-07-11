import { ChevronDown, ListFilter } from 'lucide-react'
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
  const handleSelectChange = (value: string) => {
    if (value === 'all') {
      onSelect('all')
      return
    }

    const nextColumn = columns.find((column) => column === value)
    if (nextColumn) onSelect(nextColumn)
  }

  return (
    <>
      <label className="blog-column-select">
        <span className="blog-column-select__label">知识栏目</span>
        <span className="blog-column-select__control">
          <ListFilter size={18} aria-hidden />
          <select
            aria-label="选择知识库栏目"
            value={selectedColumn}
            onChange={(event) => handleSelectChange(event.target.value)}
          >
            <option value="all">全部 / All Notes · {totalCount} 篇</option>
            {columns.map((column) => {
              const meta = blogColumnMeta[column]
              return (
                <option key={column} value={column}>
                  {meta.titleZh} / {meta.titleEn} · {countLabel(counts[column])}
                </option>
              )
            })}
          </select>
          <ChevronDown size={18} aria-hidden />
        </span>
      </label>

      <div className="blog-column-filter">
        <button
          type="button"
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
              type="button"
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
    </>
  )
}
