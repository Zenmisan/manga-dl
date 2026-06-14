import { registerPlugin } from '@capacitor/core'

export interface VolumeKeysPlugin {
  enable(): Promise<void>
  disable(): Promise<void>
  addListener(event: 'volumeUp' | 'volumeDown', handler: () => void): Promise<{ remove(): void }>
}

const VolumeKeys = registerPlugin<VolumeKeysPlugin>('VolumeKeys', {
  web: {
    enable: async () => {},
    disable: async () => {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    addListener: async (_event: string, _handler: () => void) => ({ remove: () => {} }),
  },
})

export { VolumeKeys }
