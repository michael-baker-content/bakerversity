'use client'
import { useEffect, useRef } from 'react'
import { useAuthoringSession } from './useAuthoringSession'
import { useUnsavedChanges } from './useUnsavedChanges'

export function useDraft(snapshot: string, key: string, version: number, ready: boolean) {
  const session=useAuthoringSession(snapshot,key)
  const initialized=useRef<string | null>(null)
  useEffect(()=>{
    if(!ready) { initialized.current=null;return }
    if(initialized.current!==key) {session.initialize(snapshot,version);initialized.current=key}
  },[ready,key,snapshot,version,session.initialize])
  useUnsavedChanges(ready && session.needsProtection)
  return session
}
