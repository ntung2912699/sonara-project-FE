import { AudioLines, Download, ExternalLink, Heart, Home, ListMusic, ShieldCheck } from '../icons/index.js';

export const navigation = [
  { id: 'discover', label: 'Discover', icon: Home, group: 'LIBRARY' },
  { id: 'favorites', label: 'Liked tracks', icon: Heart, group: 'LIBRARY' },
  { id: 'playlists', label: 'Playlists', icon: ListMusic, group: 'LIBRARY' },
  { id: 'downloads', label: 'Downloads', icon: Download, group: 'LIBRARY' },
  { id: 'player', label: 'Music player', icon: AudioLines, group: 'LIBRARY' },
  { id: 'studio', label: 'Audio studio', icon: AudioLines, group: 'YOUR TOOLS' },
  { id: 'imports', label: 'TikTok requests', icon: ExternalLink, group: 'YOUR TOOLS' },
  { id: 'admin', label: 'Admin management', icon: ShieldCheck, group: 'ADMINISTRATION', adminOnly: true },
];
