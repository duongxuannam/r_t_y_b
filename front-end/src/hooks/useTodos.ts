import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export const useTodos = (enabled: boolean) => {
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['todos'],
    queryFn: () => api.listTodos(),
    enabled,
  })

  const createMutation = useMutation({
    mutationFn: api.createTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { title?: string; completed?: boolean } }) =>
      api.updateTodo(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })

  return {
    listQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
