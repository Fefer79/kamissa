import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app'
import './styles/theme.css'

// PWA : mise à jour silencieuse dès qu'une nouvelle version est disponible (C2).
registerSW({ immediate: true })

// Stockage persistant : demande à l'OS de ne pas purger IndexedDB/caches
// quand le téléphone est plein (risque n°1 du cadrage §8).
if (navigator.storage?.persist) navigator.storage.persist()

render(<App />, document.getElementById('app')!)
