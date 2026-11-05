import { ListMusic } from '../../common/icons/index.js';

export function PlaylistArtwork({ index = 0, tracks = [], large = false }) {
  const covers = tracks.filter((track) => track.cover_image_url).slice(0, 4);
  return (
    <span className={`playlist-artwork palette-${Math.max(index, 0) % 4} ${large ? 'playlist-art-large' : ''}`}>
      {covers.length
        ? covers.map((track) => <img key={track.id} src={track.cover_image_url} alt="" />)
        : <><span className="artwork-shape shape-one" /><span className="artwork-shape shape-two" /><ListMusic size={large ? 26 : 20} /></>}
    </span>
  );
}
