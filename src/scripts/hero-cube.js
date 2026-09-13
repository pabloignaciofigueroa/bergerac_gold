import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { palette } from './theme-config.js';
import {initialMoves,randomMoves,inverseOf} from './cube-sequences.js';

export function initHeroCube() {
  const stage=document.getElementById('cube-stage');
  stage.dataset.renderState='loading';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});} catch {stage.dataset.renderState='fallback';return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.5:2));
  renderer.setClearColor(palette.blue,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden','true');
  stage.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);
  camera.position.set(5.4,4.4,6.8);camera.lookAt(0,0,0);
  scene.add(new THREE.AmbientLight(palette.paper,1.5));
  const light=new THREE.DirectionalLight(palette.paper,2.5);
  light.position.set(3,9,7);light.castShadow=true;light.shadow.mapSize.set(1024,1024);
  light.shadow.camera.left=-6;light.shadow.camera.right=6;light.shadow.camera.top=6;light.shadow.camera.bottom=-6;
  light.shadow.normalBias=.035;
  scene.add(light);
  const fill=new THREE.DirectionalLight(palette.paper,.45);fill.position.set(-5,2,-4);scene.add(fill);
  // Compact ambient contact shadow, directly beneath the cube. Its outer
  // rim is fully transparent so filtering cannot leave a rectangular veil.
  const shadowCanvas=document.createElement('canvas');
  shadowCanvas.width=shadowCanvas.height=256;
  const shadowContext=shadowCanvas.getContext('2d');
  const shadowGradient=shadowContext.createRadialGradient(128,128,0,128,128,128);
  shadowGradient.addColorStop(0,palette.graphite+'80');
  shadowGradient.addColorStop(.22,palette.graphite+'58');
  shadowGradient.addColorStop(.46,palette.graphite+'26');
  shadowGradient.addColorStop(.7,palette.graphite+'09');
  shadowGradient.addColorStop(.85,palette.graphite+'00');
  shadowGradient.addColorStop(1,palette.graphite+'00');
  shadowContext.fillStyle=shadowGradient;shadowContext.fillRect(0,0,256,256);
  const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
  shadowTexture.colorSpace=THREE.SRGBColorSpace;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(5.4,3.8),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));
  // Keep the soft spread lateral; extending toward the camera would push the
  // penumbra beyond the canvas even though the cube itself fits comfortably.
  floor.rotation.set(-Math.PI/2,0,Math.atan2(camera.position.x,camera.position.z));
  floor.position.set(.18,-1.53,-.12);scene.add(floor);

  const world=new THREE.Group();
  const tilt=new THREE.Group();
  const cube=new THREE.Group();
  scene.add(world);world.add(tilt);tilt.add(cube);
  // Rotate the puzzle, preserving its original sticker assignments:
  // +X pink -> front/left, -Y yellow -> right, -Z purple -> top.
  cube.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0,0,1),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,-1,0),
  ));
  const coreGeo=new RoundedBoxGeometry(.972,.972,.972,2,.045);
  const coreMat=new THREE.MeshStandardMaterial({color:palette.graphite,roughness:1,metalness:0});
  function roundedRect(size,radius){
    const s=size/2,r=radius,shape=new THREE.Shape();
    shape.moveTo(-s+r,-s);shape.lineTo(s-r,-s);shape.quadraticCurveTo(s,-s,s,-s+r);
    shape.lineTo(s,s-r);shape.quadraticCurveTo(s,s,s-r,s);shape.lineTo(-s+r,s);
    shape.quadraticCurveTo(-s,s,-s,s-r);shape.lineTo(-s,-s+r);shape.quadraticCurveTo(-s,-s,-s+r,-s);
    return shape;
  }
  const stickerGeo=new THREE.ShapeGeometry(roundedRect(.85,.115));
  const colors=[palette.pink,palette.graphite,palette.paper,palette.yellow,palette.blue,palette.purple];
  const mats=colors.map(color=>new THREE.MeshStandardMaterial({color,roughness:1,metalness:0}));
  const faces=[['x',1,0],['x',-1,1],['y',1,2],['y',-1,3],['z',1,4],['z',-1,5]];
  const cubies=[];
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
    const cubie=new THREE.Group();
    const core=new THREE.Mesh(coreGeo,coreMat);core.castShadow=true;cubie.add(core);
    faces.forEach(([axis,val,index])=>{
      if({x,y,z}[axis]!==val)return;
      const sticker=new THREE.Mesh(stickerGeo,mats[index]);
      sticker.position[axis]=val*.489;
      if(axis==='x')sticker.rotation.y=val*Math.PI/2;
      if(axis==='y')sticker.rotation.x=-val*Math.PI/2;
      if(axis==='z'&&val<0)sticker.rotation.y=Math.PI;
      cubie.add(sticker);
    });
    cubie.position.set(x,y,z);cube.add(cubie);cubies.push(cubie);
  }

  const pivot=new THREE.Group();cube.add(pivot);
  let moving=null;
  let history=initialMoves;
  const queue=[];
  function attachMove(move){
    pivot.rotation.set(0,0,0);scene.updateMatrixWorld(true);
    const selected=cubies.filter(item=>Math.round(item.position[move.axis])===move.layer);
    selected.forEach(item=>pivot.attach(item));
    return selected;
  }
  function finishMove(selected){
    scene.updateMatrixWorld(true);
    selected.forEach(item=>{cube.attach(item);item.position.set(Math.round(item.position.x),Math.round(item.position.y),Math.round(item.position.z));});
    pivot.rotation.set(0,0,0);
  }
  history.forEach(move=>{const selected=attachMove(move);pivot.rotation[move.axis]=move.dir*Math.PI/2;finishMove(selected);});
  let solved=false,targetSolved=false;
  const statement=document.querySelector('.hero-statement');
  stage.dataset.cubeState='scrambled';
  function completeInteraction(){
    const justSolved=!solved&&targetSolved;
    solved=targetSolved;
    if(solved)history=[];
    stage.dataset.cubeState=solved?'solved':'scrambled';
    stage.setAttribute('aria-pressed',String(solved));
    stage.setAttribute('aria-label',solved?'Desordenar el cubo de Bergerac':'Ordenar el cubo de Bergerac');
    stage.removeAttribute('aria-busy');
    if(justSolved&&!reduced.matches)statement.classList.add('is-cube-resolved');
  }
  function toggleCube(){
    if(moving||queue.length)return;
    statement.classList.remove('is-cube-resolved');
    targetSolved=!solved;
    if(!targetSolved)history=randomMoves(20);
    const moves=targetSolved?inverseOf(history):history;
    if(reduced.matches){
      moves.forEach(move=>{const selected=attachMove(move);pivot.rotation[move.axis]=move.dir*Math.PI/2;finishMove(selected);});
      completeInteraction();
    }else{
      queue.push(...moves);nextMove=performance.now();
      stage.dataset.cubeState=targetSolved?'solving':'scrambling';stage.setAttribute('aria-busy','true');
    }
    requestFrame();
  }

  let frame=0,visible=true,last=0,nextMove=0,sized=false;
  let hoverX=0,hoverY=0;
  function requestFrame(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(render);}
  function render(now){
    frame=0;
    if(!visible||document.hidden||!sized)return;
    const dt=Math.min((now-(last||now))/1000,.045);last=now;
    if(!moving&&queue.length&&now>=nextMove){const move=queue.shift();moving={...move,selected:attachMove(move),start:now};}
    if(moving){
      const t=Math.min((now-moving.start)/260,1);
      const eased=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
      pivot.rotation[moving.axis]=moving.dir*Math.PI/2*eased;
      if(t===1){finishMove(moving.selected);moving=null;nextMove=now;if(!queue.length)completeInteraction();}
    }
    const damping=1-Math.exp(-dt*9);
    tilt.rotation.x+=(hoverY-tilt.rotation.x)*damping;
    tilt.rotation.y+=(hoverX-tilt.rotation.y)*damping;
    renderer.render(scene,camera);
    stage.classList.add('has-webgl');stage.dataset.renderState='ready';
    const unsettled=Math.abs(hoverX-tilt.rotation.y)+Math.abs(hoverY-tilt.rotation.x)>.0001;
    if(moving||queue.length||unsettled)requestFrame();
  }
  function fitCamera(width,height){
    camera.aspect=width/height;
    camera.zoom=1;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    if(innerWidth<=600)return;
    // Fit every possible layer turn without changing the live puzzle.
    let extent=0;
    const point=new THREE.Vector3(),axisVector=new THREE.Vector3();
    scene.updateMatrixWorld(true);
    for(const axis of ['x','y','z'])for(const layer of [-1,0,1]){
      axisVector.set(0,0,0);axisVector[axis]=1;
      for(let turn=-6;turn<=6;turn++){
        const angle=turn*Math.PI/12;
        for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
          const rotating={x,y,z}[axis]===layer;
          for(const dx of [-.49,.49])for(const dy of [-.49,.49])for(const dz of [-.49,.49]){
            point.set(x+dx,y+dy,z+dz);
            if(rotating)point.applyAxisAngle(axisVector,angle);
            point.applyMatrix4(cube.matrixWorld).project(camera);
            extent=Math.max(extent,Math.abs(point.x),Math.abs(point.y));
          }
        }
      }
    }
    camera.zoom=Math.min(2/1.55,.88/Math.max(extent,.01));
    camera.updateProjectionMatrix();
  }
  function resize(){
    const width=stage.clientWidth,height=stage.clientHeight;if(!width||!height)return;
    renderer.setPixelRatio(innerWidth>600?Math.min(devicePixelRatio*2,2):Math.min(devicePixelRatio,1.5));
    fitCamera(width,height);renderer.setSize(width,height,false);sized=true;requestFrame();
  }
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
  const visibilityObserver=new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(visible){last=0;requestFrame();}else{cancelAnimationFrame(frame);frame=0;}
  });visibilityObserver.observe(stage);
  const canvas=renderer.domElement;
  canvas.style.cursor='pointer';
  canvas.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')toggleCube();});
  stage.addEventListener('click',toggleCube);
  stage.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleCube();}});
  canvas.addEventListener('pointermove',event=>{
    if(reduced.matches||event.pointerType!=='mouse')return;
    const rect=canvas.getBoundingClientRect();
    hoverX=((event.clientX-rect.left)/rect.width-.5)*.09;
    hoverY=((event.clientY-rect.top)/rect.height-.5)*.07;requestFrame();
  });
  canvas.addEventListener('pointerleave',()=>{hoverX=hoverY=0;requestFrame();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=0;requestFrame();}});
  reduced.addEventListener('change',()=>{
    if(reduced.matches){if(moving){pivot.rotation[moving.axis]=moving.dir*Math.PI/2;finishMove(moving.selected);moving=null;}while(queue.length){const move=queue.shift(),selected=attachMove(move);pivot.rotation[move.axis]=move.dir*Math.PI/2;finishMove(selected);}completeInteraction();hoverX=hoverY=0;}requestFrame();
  });
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);frame=0;visible=false;stage.classList.remove('has-webgl');stage.dataset.renderState='fallback';});
  resize();requestFrame();
  return {destroy(){cancelAnimationFrame(frame);resizeObserver.disconnect();visibilityObserver.disconnect();coreGeo.dispose();stickerGeo.dispose();coreMat.dispose();mats.forEach(mat=>mat.dispose());floor.geometry.dispose();floor.material.dispose();shadowTexture.dispose();renderer.dispose();canvas.remove();}};
}
