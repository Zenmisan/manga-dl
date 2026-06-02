import { useState, useCallback } from 'react'
import Peer from 'simple-peer'

export function useP2P() {
  const [peers] = useState<Peer.Instance[]>([])
  
  const broadcastResource = useCallback((resource: string, data: string) => {
    peers.forEach(peer => {
      peer.send(JSON.stringify({
        type: 'response',
        resource,
        data
      }))
    })
  }, [peers])

  return { peers, broadcastResource }
}
