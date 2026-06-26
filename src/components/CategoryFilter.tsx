import { categoryLabels, type BlogCategory } from '../data/blog'

interface CategoryFilterProps {
  categories: BlogCategory[]
  selectedCategory: BlogCategory | 'all'
  onSelect: (category: BlogCategory | 'all') => void
}

export function CategoryFilter({ categories, selectedCategory, onSelect }: CategoryFilterProps) {
  return (
    <div className="category-filter">
      <button
        className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
        onClick={() => onSelect('all')}
      >
        全部
      </button>
      {categories.map((category) => (
        <button
          key={category}
          className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
          onClick={() => onSelect(category)}
        >
          {categoryLabels[category]}
        </button>
      ))}
    </div>
  )
}
