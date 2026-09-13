export function initProjects() {
  const slider = document.querySelector('.project-slider');
  const projects = [...slider.querySelectorAll('.project')];
  const videos = projects.map(project=>project.querySelector('video'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 600px)');
  const visible = new Set();
  let loaded = false;

  function loadVideo(video) {
    if (video.getAttribute('src')) return;
    const source=small.matches ? video.dataset.mobile : video.dataset.desktop;
    video.src = video.canPlayType('video/webm') ? source : source.replace(/\.webm$/,'.mp4');
    video.preload='metadata'; video.load();
  }
  async function play(video) {
    try {await video.play();} catch { /* Keep the preview static when autoplay is unavailable. */ }
  }
  function syncPlayback() {
    videos.forEach((video,index)=>{
      if (visible.has(index) && !document.hidden && !reduced.matches) {
        loadVideo(video);play(video);
      } else video.pause();
    });
  }

  // Use the same local film in H.264 if a browser cannot decode its WebM source.
  videos.forEach(video=>video.addEventListener('error',()=>{
    if(/\.webm(?:\?.*)?$/.test(video.src)){
      video.src=video.src.replace(/\.webm(?=\?|$)/,'.mp4');video.load();
      syncPlayback();
    }
  }));

  const preloadObserver = new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting)&&!loaded){loaded=true;videos.forEach(loadVideo);preloadObserver.disconnect();}
  },{rootMargin:'600px 0px'});
  preloadObserver.observe(slider);
  const visibilityObserver = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{const index=videos.indexOf(entry.target);if(entry.isIntersecting)visible.add(index);else visible.delete(index);});syncPlayback();
  },{threshold:.2});
  videos.forEach(video=>visibilityObserver.observe(video));

  document.addEventListener('visibilitychange',syncPlayback);
  reduced.addEventListener('change',syncPlayback);
  window.addEventListener('pagehide',()=>videos.forEach(video=>video.pause()));
  return {destroy(){preloadObserver.disconnect();visibilityObserver.disconnect();videos.forEach(video=>video.pause());}};
}
