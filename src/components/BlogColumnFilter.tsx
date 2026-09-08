import { ChevronDown, ListFilter } from 'lucide-react'
import { blogColumnMeta, type BlogColumn } from '../data/blog'
import { catalogCopy, formatArticleCount } from '../data/catalogCopy'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { SITE_LANGUAGE_TAGS, type SiteLanguage } from '../utils/siteLanguage'

interface BlogColumnFilterProps {
  columns: BlogColumn[]
  counts: Record<BlogColumn, number>
  totalCount: number
  selectedColumn: BlogColumn | 'all'
  onSelect: (column: BlogColumn | 'all') => void
}

function countLabel(count: number, language: SiteLanguage) {
  return count > 0 ? formatArticleCount(count, language) : catalogCopy[language].pendingColumn
}

export function BlogColumnFilter({ columns, counts, totalCount, selectedColumn, onSelect }: BlogColumnFilterProps) {
  const language = useSiteLanguage()
  const copy = catalogCopy[language]
  const english = language === 'en'
  const alternateLanguage = english ? 'zh-CN' : 'en'
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
      <label className="blog-column-select" lang={SITE_LANGUAGE_TAGS[language]}>
        <span className="blog-column-select__label">{copy.columns}</span>
        <span className="blog-column-select__control">
          <ListFilter size={18} aria-hidden />
          <select
            aria-label={copy.selectColumn}
            value={selectedColumn}
            onChange={(event) => handleSelectChange(event.target.value)}
          >
            <option value="all">{english ? 'All Notes / 全部' : '全部 / All Notes'} · {formatArticleCount(totalCount, language)}</option>
            {columns.map((column) => {
              const meta = blogColumnMeta[column]
              return (
                <option key={column} value={column}>
                  {english ? `${meta.titleEn} / ${meta.titleZh}` : `${meta.titleZh} / ${meta.titleEn}`} · {countLabel(counts[column], language)}
                </option>
              )
            })}
          </select>
          <ChevronDown size={18} aria-hidden />
        </span>
      </label>

      <div className="blog-column-filter" role="group" aria-label={copy.selectColumn} lang={SITE_LANGUAGE_TAGS[language]}>
        <button
          type="button"
          className={`filter-btn ${selectedColumn === 'all' ? 'active' : ''}`}
          aria-pressed={selectedColumn === 'all'}
          onClick={() => onSelect('all')}
        >
          <span className="filter-btn-title">{english ? 'All Notes' : '全部'}</span>
          <span className="filter-btn-subtitle"><span lang={alternateLanguage}>{english ? '全部' : 'All Notes'}</span> · {formatArticleCount(totalCount, language)}</span>
        </button>
        {columns.map((column) => {
          const meta = blogColumnMeta[column]
          const count = counts[column]
          return (
            <button
              key={column}
              type="button"
              className={`filter-btn ${selectedColumn === column ? 'active' : ''} ${count === 0 ? 'is-empty' : ''}`}
              aria-pressed={selectedColumn === column}
              onClick={() => onSelect(column)}
            >
              <span className="filter-btn-title">{english ? meta.titleEn : meta.titleZh}</span>
              <span className="filter-btn-subtitle">
                <span lang={alternateLanguage}>{english ? meta.titleZh : meta.titleEn}</span> · {countLabel(count, language)}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
