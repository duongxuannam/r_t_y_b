import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export const useUsers = (enabled: boolean) => {
  const listQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => api.listUsers(),
    enabled,
  })

  return { listQuery }
}
