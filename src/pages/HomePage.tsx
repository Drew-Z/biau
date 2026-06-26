import { useNavigate } from 'react-router-dom'
import { HeroSplit } from '../components/HeroSplit'

export function HomePage() {
  const navigate = useNavigate()

  const handleProjectClick = (link: string) => {
    if (link.startsWith('/projects')) {
      navigate('/projects')
    } else if (link.startsWith('/blog')) {
      navigate('/blog')
    } else if (link.startsWith('/')) {
      navigate(link)
    }
  }

  return <HeroSplit onProjectClick={handleProjectClick} />
}
