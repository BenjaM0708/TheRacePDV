import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Game, Station, Group, Participant, Completion } from '../types'

export function useGame() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createGame = useCallback(async (game: Omit<Game, 'id' | 'room_code' | 'created_at' | 'admin_id' | 'status' | 'started_at' | 'ended_at'>) => {
    setLoading(true)
    setError(null)
    try {
      const roomCode = generateRoomCode()
      const { data, error } = await supabase
        .from('games')
        .insert({ ...game, room_code: roomCode, status: 'lobby' })
        .select()
        .single()
      if (error) throw error
      return data as Game
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating game')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getGameByCode = useCallback(async (code: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*, stations(*)')
        .eq('room_code', code.toUpperCase())
        .maybeSingle()
      if (error) throw error
      return data as (Game & { stations: Station[] }) | null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching game')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getGameById = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*, stations(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Game & { stations: Station[] }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching game')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateGameStatus = useCallback(async (id: string, status: Game['status']) => {
    const updates: Partial<Game> = { status }
    if (status === 'active') updates.started_at = new Date().toISOString()
    if (status === 'ended') updates.ended_at = new Date().toISOString()

    const { error } = await supabase.from('games').update(updates).eq('id', id)
    if (error) throw error
  }, [])

  const addStation = useCallback(async (station: Omit<Station, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('stations').insert(station).select().single()
    if (error) throw error
    return data as Station
  }, [])

  const deleteStation = useCallback(async (id: string) => {
    const { error } = await supabase.from('stations').delete().eq('id', id)
    if (error) throw error
  }, [])

  const getParticipants = useCallback(async (gameId: string) => {
    const { data, error } = await supabase
      .from('participants')
      .select('*, group:groups(*)')
      .eq('game_id', gameId)
    if (error) throw error
    return data as (Participant & { group?: Group })[]
  }, [])

  const getGroups = useCallback(async (gameId: string) => {
    const { data, error } = await supabase.from('groups').select('*').eq('game_id', gameId)
    if (error) throw error
    return data as Group[]
  }, [])

  const getCompletions = useCallback(async (gameId: string) => {
    const { data, error } = await supabase
      .from('completions')
      .select('*, station:stations(*), participant:participants(*), group:groups(*)')
      .eq('station.game_id', gameId)
    if (error) throw error
    return data as (Completion & { station: Station; participant?: Participant; group?: Group })[]
  }, [])

  const joinGame = useCallback(async (gameId: string, name: string, groupId?: string) => {
    const { data, error } = await supabase
      .from('participants')
      .insert({ game_id: gameId, name, group_id: groupId ?? null })
      .select()
      .single()
    if (error) throw error
    return data as Participant
  }, [])

  const createGroup = useCallback(async (gameId: string, name: string) => {
    const { data, error } = await supabase.from('groups').insert({ game_id: gameId, name }).select().single()
    if (error) throw error
    return data as Group
  }, [])

  const submitCompletion = useCallback(async (completion: Omit<Completion, 'id' | 'completed_at'>) => {
    const { data, error } = await supabase.from('completions').insert(completion).select().single()
    if (error) throw error
    return data as Completion
  }, [])

  return {
    loading,
    error,
    createGame,
    getGameByCode,
    getGameById,
    updateGameStatus,
    addStation,
    deleteStation,
    getParticipants,
    getGroups,
    getCompletions,
    joinGame,
    createGroup,
    submitCompletion,
  }
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
