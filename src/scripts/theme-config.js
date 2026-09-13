export const palette = Object.freeze({
  blue: '#00A1FF', paper: '#FDFCFA', graphite: '#282828',
  purple: '#6F02BA', pink: '#FB0278', yellow: '#FFB701',
});

export const themes = Object.fromEntries(Object.keys(palette).map(name => {
  const lightInk = name === 'graphite' || name === 'purple';
  return [name, {
    '--page-bg': palette[name],
    '--page-fg': lightInk ? palette.paper : palette.graphite,
    '--nav-bg': (lightInk || name === 'pink') ? palette.graphite : palette.paper,
    '--nav-fg': (lightInk || name === 'pink') ? palette.paper : palette.graphite,
    '--button-bg': lightInk ? palette.paper : palette.graphite,
    '--button-fg': lightInk ? palette.graphite : palette.paper,
  }];
}));

export function stateAtPosition(markers, y) {
  let active = { theme: 'blue', section: 'inicio' };
  for (const marker of markers) {
    if (marker.y <= y + 1) active = marker;
    else break;
  }
  return active;
}
